// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Schema atualizado para incluir telefone e atributos adicionais
const ChatwootWebhookSchema = z.object({
  id: z.number().optional(),
  event: z.enum(["conversation_created", "message_created", "message_updated", "conversation_updated"]),
  account_id: z.number().optional(),
  conversation_id: z.number().optional(),
  conversation: z.object({
    id: z.number(),
    inbox_id: z.number().optional(),
    status: z.string().max(50).optional(),
    assignee: z.object({
      name: z.string().max(200).optional(),
    }).optional().nullable(),
    inbox: z.object({
      name: z.string().max(200).optional(),
    }).optional(),
    meta: z.object({
      sender: z.object({
        name: z.string().max(200).optional(),
        email: z.string().email().max(255).optional().nullable(),
        phone_number: z.string().optional().nullable(),
        additional_attributes: z.record(z.any()).optional().nullable(),
      }).optional(),
    }).optional(),
    messages: z.array(z.object({
      id: z.number().optional(),
      account_id: z.number().optional(),
      conversation_id: z.number().optional(),
      content: z.string().max(50000).nullable().optional(),
      attachments: z.array(z.any()).optional().nullable(),
    })).optional(),
  }).optional(),
  message_type: z.enum(["incoming", "outgoing", "template"]).optional(),
  content: z.string().max(50000).nullable().optional(),
  attachments: z.array(z.any()).optional().nullable(),
  sender: z.object({
    type: z.string().max(50).optional(),
    name: z.string().max(200).optional(),
    email: z.string().email().max(255).optional().nullable(),
  }).optional().nullable(),
  account: z.object({
    id: z.number(),
  }).optional(),
  private: z.boolean().optional(),
  message: z.object({
    id: z.number(),
    message_type: z.enum(["incoming", "outgoing", "template"]).optional(),
    content: z.string().max(50000).nullable().optional(),
    private: z.boolean().optional(),
    sender: z.object({
      type: z.string().max(50).optional(),
      name: z.string().max(200).optional(),
      email: z.string().email().max(255).optional().nullable(),
    }).optional().nullable(),
    attachments: z.array(z.any()).optional().nullable(),
  }).optional(),
  messages: z.array(z.object({
    id: z.number().optional(),
    account_id: z.number().optional(),
    conversation_id: z.number().optional(),
    content: z.string().max(50000).nullable().optional(),
    attachments: z.array(z.any()).optional().nullable(),
  })).optional(),
});

function sanitizeHTML(input: string): string {
  if (!input) return "";
  let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, "");
  sanitized = sanitized.replace(/javascript:/gi, "");
  const allowedTags = ["b", "i", "em", "strong", "a", "p", "br"];
  const tagPattern = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
  sanitized = sanitized.replace(tagPattern, (match, tag) => {
    return allowedTags.includes(tag.toLowerCase()) ? match : "";
  });
  return sanitized.trim();
}

function computeSignature(messageId, conversationId, senderName, messageType, content) {
  if (messageId) return `msg:${messageId}`;
  const norm = (s) => (s || "").toString().trim().toLowerCase().replace(/\s+/g, " ").slice(0, 300);
  return `${norm(conversationId)}|${norm(senderName)}|${norm(messageType)}|${norm(content)}`.slice(0, 200);
}

function getFormattedTimestamp() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' });
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
  return `${dateStr} ${timeStr}`;
}

function determinePriority(content) {
  const lower = content.toLowerCase();
  if (lower.includes("urgente") || lower.includes("emergência")) return "high";
  if (lower.includes("dúvida") || lower.includes("informação")) return "low";
  return "medium";
}

function isDuplicateContent(existingDescription, newContent) {
  if (!existingDescription || !newContent) return false;
  const lines = existingDescription.split('\n');
  const recentLines = lines.slice(-5).join('\n');
  return recentLines.includes(newContent.trim());
}

// Helper para extrair nome do cliente de forma robusta
function getCustomerName(contactMeta: any, sender: any, isAgent: boolean): string {
  // 1. Tenta nome no metadados da conversa (fonte mais confiável do contato)
  let name = contactMeta?.name;

  // Se nome for inválido ou genérico, tenta outras fontes
  if (!name || name.toLowerCase() === 'no name' || name.trim() === '' || name === 'null') {
    // 2. Se for mensagem recebida (cliente), tenta nome do sender primeiro
    if (!isAgent && sender?.name && sender.name !== 'null' && sender.name.trim() !== '') {
      return sender.name;
    }

    // 3. Tenta telefone
    if (contactMeta?.phone_number) return contactMeta.phone_number;

    // 4. Tenta email
    if (contactMeta?.email) return contactMeta.email;

    // 5. Tenta identifier
    if (contactMeta?.identifier) return contactMeta.identifier;

    // 6. Fallback final: Telefone ou Identifier ou "Cliente sem nome"
    return contactMeta?.phone_number || contactMeta?.identifier || "Cliente sem nome";
  }

  return name;
}

// Helper para processar anexos de áudio
async function processAudioAttachments(attachments: any[], supabaseUrl: string, supabaseKey: string, aiConfig: any): Promise<string> {
  if (!attachments || attachments.length === 0) return "";

  const audioAttachments = attachments.filter((att: any) =>
    att.file_type === "audio" ||
    att.data_url?.match(/\.(mp3|wav|ogg|m4a|opus)$/i)
  );

  if (audioAttachments.length === 0) return "";

  let transcriptions = "";

  for (const audio of audioAttachments) {
    try {
      console.log(`Processing audio attachment: ${audio.data_url}`);

      const body: any = { url: audio.data_url };
      if (aiConfig?.openrouter_api_key) body.openrouter_api_key = aiConfig.openrouter_api_key;
      if (aiConfig?.transcription_model) body.transcription_model = aiConfig.transcription_model;

      // Chamar a Edge Function audio-transcribe
      const response = await fetch(`${supabaseUrl}/functions/v1/audio-transcribe`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Audio transcription failed: ${response.status} ${response.statusText}`, errorText);
        continue;
      }

      const result = await response.json();
      if (result.transcript) {  // audio-transcribe retorna 'transcript', não 'transcription'
        transcriptions += `\n[Áudio transcrito]: ${result.transcript}`;
        console.log(`Audio transcribed successfully`);
      }
    } catch (error) {
      console.error(`Error transcribing audio:`, error);
    }
  }

  return transcriptions;
}

class WebhookService {
  constructor(private supabase: SupabaseClient, private supabaseKey: string) { }

  async triggerAIAnalysis(cardId: string) {
    console.log(`Triggering AI analysis for card ${cardId}...`);
    console.log(`Using Supabase Key length: ${this.supabaseKey?.length}`);
    const { data, error } = await this.supabase.functions.invoke("analyze-conversation", {
      body: { cardId },
      headers: { Authorization: `Bearer ${this.supabaseKey}` },
    });

    if (error) {
      console.error("AI trigger error:", error);
    } else {
      console.log("AI analysis triggered successfully");
    }
  }

  async checkIntegration(accountId: string) {
    const { data } = await this.supabase
      .from("chatwoot_integrations")
      .select(`
        *,
        pipelines (
          id,
          columns (
            id,
            name,
            position
          )
        )
      `)
      .eq("account_id", accountId)
      .maybeSingle();
    return data;
  }

  async findExistingCard(conversationId: string) {
    const { data } = await this.supabase
      .from("cards")
      .select("*")
      .eq("chatwoot_conversation_id", conversationId)
      .is("deleted_at", null)  // Ignora cards deletados
      .is("completion_type", null)  // Ignora cards finalizados
      .maybeSingle();
    return data;
  }

  async checkDuplicateEvent(signature: string) {
    const { error } = await this.supabase.from('chatwoot_processed_events').insert({ signature });
    return error?.code === '23505';
  }

  async updateCardMetadata(cardId: string, data: any) {
    return await this.supabase.from("cards").update(data).eq("id", cardId);
  }

  async createCard(data: any) {
    return await this.supabase.from("cards").insert(data).select().single();
  }

  async getAIConfig(pipelineId: string) {
    const { data } = await this.supabase
      .from("pipeline_ai_config")
      .select("openrouter_api_key, transcription_model")
      .eq("pipeline_id", pipelineId)
      .maybeSingle();
    return data;
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    // Use custom SERVICE_ROLE_KEY as SUPABASE_SERVICE_ROLE_KEY is truncated
    const supabaseServiceRoleKey = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    console.log(`Service Role Key available: ${!!supabaseServiceRoleKey}, length: ${supabaseServiceRoleKey?.length || 0}`);
    console.log(`Anon Key available: ${!!supabaseAnonKey}, length: ${supabaseAnonKey?.length || 0}`);

    const supabaseKey = supabaseServiceRoleKey || supabaseAnonKey!;
    console.log(`Using key length: ${supabaseKey.length}`);

    const supabase = createClient(supabaseUrl, supabaseKey);
    const service = new WebhookService(supabase, supabaseKey);

    const rawWebhook = await req.json();
    console.log("DEBUG - Full webhook payload:", JSON.stringify(rawWebhook).substring(0, 2000));

    let webhook;
    try {
      webhook = ChatwootWebhookSchema.parse(rawWebhook);
    } catch (e) {
      console.error("Zod Parse Error:", e);
      return new Response(JSON.stringify({ error: "Invalid payload schema" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { event, conversation, message_type, sender, account, message, account_id, messages } = webhook;

    if (!["conversation_created", "message_created", "message_updated", "conversation_updated"].includes(event)) {
      return new Response(JSON.stringify({ message: "Event ignored" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Tenta extrair account_id de várias fontes possíveis
    const extractedAccountId = account?.id || account_id || messages?.[0]?.account_id || conversation?.id;
    if (!extractedAccountId) {
      console.error("Payload missing account ID:", JSON.stringify(rawWebhook));
      throw new Error("No account ID found in payload");
    }

    const integration: any = await service.checkIntegration(extractedAccountId.toString());

    if (!integration) {
      console.warn(`Integration not found for account ${extractedAccountId}`);
      return new Response(JSON.stringify({ message: "Integration not found" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!integration.active) {
      return new Response(JSON.stringify({ message: "Integration inactive" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Buscar configuração de IA
    const aiConfig = await service.getAIConfig(integration.pipelines.id);

    let content = webhook.content || message?.content;
    const messageId = webhook.id?.toString() || message?.id?.toString();
    const derivedMessageType = message?.message_type || message_type;
    const conversationId = conversation?.id || messages?.[0]?.conversation_id || webhook.conversation_id;
    const conversationIdStr = conversationId ? String(conversationId) : null;

    content = sanitizeHTML(content || "");

    // Processar anexos de áudio se houver
    // Os anexos vêm em conversation.messages[].attachments, não em message.attachments
    const attachments = conversation?.messages?.[0]?.attachments || message?.attachments;
    console.log(`Attachments found: ${attachments?.length || 0}`);
    if (attachments && attachments.length > 0) {
      console.log(`Attachments details:`, JSON.stringify(attachments));
      const audioTranscription = await processAudioAttachments(attachments, supabaseUrl, supabaseKey, aiConfig);
      if (audioTranscription) {
        content += audioTranscription;
      }
    }

    const senderNameCheck = sender?.name || "";
    if (content && (content === `*${senderNameCheck}*` || content === `*${senderNameCheck}:*`)) {
      return new Response(JSON.stringify({ message: "Empty/System message ignored" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Determinação de Papel para a MENSAGEM
    const isAgent = derivedMessageType === "outgoing";
    let messageSenderName;
    if (isAgent) {
      messageSenderName = sender?.name || conversation?.assignee?.name || "Atendente";
    } else {
      messageSenderName = sender?.name || conversation?.meta?.sender?.name || "Cliente";
    }

    // Determinação do Nome do Cliente para o CARD (Fixo)
    console.log("DEBUG - conversation.meta.sender:", JSON.stringify(conversation?.meta?.sender));
    console.log("DEBUG - sender:", JSON.stringify(sender));
    console.log("DEBUG - isAgent:", isAgent);
    const customerName = getCustomerName(conversation?.meta?.sender, sender, isAgent);
    console.log("DEBUG - customerName extracted:", customerName);

    const roleEmoji = isAgent ? "🧑‍💼" : "👤";
    const roleLabel = isAgent ? "Atendente" : "Cliente";
    const timestamp = getFormattedTimestamp();

    const formattedMessage = `[${timestamp}] ${roleEmoji} ${roleLabel} ${messageSenderName}: ${content || "Mensagem"}`;

    if (conversationIdStr && ["message_created", "message_updated", "conversation_updated"].includes(event)) {
      console.log(`Searching for existing card with conversationId: ${conversationIdStr}`);
      const existingCard = await service.findExistingCard(conversationIdStr);
      console.log(`Existing card found: ${existingCard ? existingCard.id : "null"}`);

      if (existingCard) {
        if (event === "conversation_updated") {
          const updateData: any = { updated_at: new Date().toISOString() };
          if (conversation?.assignee?.name) updateData.chatwoot_agent_name = conversation.assignee.name;

          // Atualiza título se estava genérico
          if (existingCard.title.includes("Cliente sem nome") && customerName !== "Cliente sem nome") {
            updateData.title = customerName;
            updateData.chatwoot_contact_name = customerName;
          }

          // IMPORTANTE: Verifica se a conversa foi resolvida no Chatwoot
          if (conversation?.status === 'resolved') {
            const columns = integration.pipelines?.columns;
            if (columns && columns.length > 0) {
              // Ordenar colunas por posição
              const sortedColumns = columns.sort((a: any, b: any) => a.position - b.position);
              const lastColumn = sortedColumns[sortedColumns.length - 1];

              updateData.column_id = lastColumn.id;
              updateData.completion_type = 'completed';
              updateData.completion_reason = 'Resolvido no Chatwoot';
              updateData.completed_at = new Date().toISOString();
              console.log(`✅ Marking card as resolved and moving to column ${lastColumn.name}`);
            }
          }

          await service.updateCardMetadata(existingCard.id, updateData);
          return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const signature = computeSignature(messageId, conversationIdStr, messageSenderName, derivedMessageType, content);
        if (signature && await service.checkDuplicateEvent(signature)) {
          return new Response(JSON.stringify({ message: "Duplicate" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        if (isDuplicateContent(existingCard.description, content)) {
          return new Response(JSON.stringify({ message: "Duplicate content" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const updatedDescription = existingCard.description ? `${existingCard.description}\n${formattedMessage}` : formattedMessage;
        console.log("DEBUG - Updating description to:", updatedDescription.substring(0, 100) + "...");

        const updateData: any = {
          description: updatedDescription,
          updated_at: new Date().toISOString(),
          priority: determinePriority(updatedDescription)
        };

        // Atualiza agente se a mensagem for de um agente ou se vier no payload
        if (conversation?.assignee?.name) {
          updateData.chatwoot_agent_name = conversation.assignee.name;
        } else if (isAgent && messageSenderName && messageSenderName !== "Atendente") {
          updateData.chatwoot_agent_name = messageSenderName;
        }

        // Atualiza título se estava genérico e agora temos um nome melhor
        // Verifica se o título atual contém "Cliente sem nome" ou se o novo nome é diferente e não genérico
        if (existingCard.title.includes("Cliente sem nome") && customerName !== "Cliente sem nome") {
          updateData.title = customerName;
          updateData.chatwoot_contact_name = customerName;
        }

        // Verifica se a conversa foi resolvida no Chatwoot
        if (conversation?.status === 'resolved') {
          const columns = integration.pipelines?.columns;
          if (columns && columns.length > 0) {
            // Ordenar colunas por posição
            const sortedColumns = columns.sort((a: any, b: any) => a.position - b.position);
            const lastColumn = sortedColumns[sortedColumns.length - 1];

            updateData.column_id = lastColumn.id;
            updateData.completion_type = 'completed';
            updateData.completion_reason = 'Resolvido no Chatwoot';
            updateData.completed_at = new Date().toISOString();
            console.log(`Marking card as resolved and moving to column ${lastColumn.name}`);
          }
        }

        await service.updateCardMetadata(existingCard.id, updateData);

        console.log("Updating existing card and triggering AI...");
        await service.triggerAIAnalysis(existingCard.id);

        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // LÓGICA DE CRIAÇÃO DE NOVO CARD
    if (!conversationIdStr) {
      console.warn("No conversation ID in payload, skipping card creation");
      console.log("DEBUG - Event:", event);
      console.log("DEBUG - conversation:", JSON.stringify(conversation));
      console.log("DEBUG - messages:", JSON.stringify(messages));
      console.log("DEBUG - webhook.conversation_id:", webhook.conversation_id);
      console.log("DEBUG - Full payload:", JSON.stringify(rawWebhook).substring(0, 500));
      return new Response(JSON.stringify({ message: "No conversation ID, event ignored" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const pipeline = integration.pipelines;
    if (!pipeline) throw new Error("Pipeline not found for integration");

    const columns = pipeline.columns?.sort((a: any, b: any) => a.position - b.position);
    const firstColumn = columns?.[0];
    if (!firstColumn) throw new Error("No columns found in pipeline");

    // Verificação de duplicidade para evitar race conditions
    // Usa apenas conversationId como chave para evitar criar múltiplos cards para a mesma conversa
    const signature = `conversation_${conversationIdStr}`;
    const isDuplicate = await service.checkDuplicateEvent(signature);
    console.log(`Checking duplicate for creation: ${signature} -> ${isDuplicate}`);

    if (isDuplicate) {
      console.log(`Duplicate conversation detected (${conversationIdStr}), skipping card creation`);
      return new Response(JSON.stringify({ message: "Duplicate conversation ignored" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const cardData: any = {
      column_id: firstColumn.id,
      // Título SEMPRE com nome do cliente
      title: `${customerName} - ${conversation?.inbox?.name || "Nova"}`,
      description: formattedMessage,
      priority: determinePriority(formattedMessage),
      chatwoot_conversation_id: conversationIdStr,
      // Salva nome do contato explicitamente
      chatwoot_contact_name: customerName,
      // Salva agente se houver
      chatwoot_agent_name: conversation?.assignee?.name || (isAgent ? messageSenderName : undefined),
      inbox_name: conversation?.inbox?.name
    };

    const { data: newCard, error: createError } = await service.createCard(cardData);

    if (createError) {
      console.error("Error creating card:", createError);
      throw createError;
    }

    console.log("New card created, triggering AI...");
    await service.triggerAIAnalysis(newCard.id);

    return new Response(JSON.stringify({ success: true, card_id: newCard.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    console.error("Webhook Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});