// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Schema atualizado para incluir telefone e atributos adicionais
const ChatwootWebhookSchema = z.object({
  id: z.number().optional(),
  event: z.enum(["conversation_created", "message_created", "message_updated", "conversation_updated"]),
  account_id: z.number().optional(),
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
  }).optional(),
  message_type: z.enum(["incoming", "outgoing"]).optional(),
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
    message_type: z.enum(["incoming","outgoing"]).optional(),
    content: z.string().max(50000).nullable().optional(),
    private: z.boolean().optional(),
    sender: z.object({
      type: z.string().max(50).optional(),
      name: z.string().max(200).optional(),
      email: z.string().email().max(255).optional().nullable(),
    }).optional().nullable(),
    attachments: z.array(z.any()).optional().nullable(), 
  }).optional(),
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
  if (!name || name.toLowerCase() === 'no name' || name.trim() === '') {
    // 2. Tenta telefone
    if (contactMeta?.phone_number) return contactMeta.phone_number;
    
    // 3. Tenta email
    if (contactMeta?.email) return contactMeta.email;
    
    // 4. Se for mensagem recebida (cliente), tenta nome do sender
    if (!isAgent && sender?.name) return sender.name;
    
    return "Cliente sem nome"; // Fallback final
  }

  return name;
}

class WebhookService {
  constructor(private supabase: SupabaseClient, private supabaseKey: string) {}

  async triggerAIAnalysis(cardId: string) {
    this.supabase.functions.invoke("analyze-conversation", {
      body: { cardId },
      headers: { Authorization: `Bearer ${this.supabaseKey}` },
    }).catch(err => console.error("AI trigger error", err));
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
    const { data } = await this.supabase.from("cards").select("*").eq("chatwoot_conversation_id", conversationId).is("completion_type", null).maybeSingle();
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
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const service = new WebhookService(supabase, supabaseKey);

    const rawWebhook = await req.json();
    let webhook;
    try {
      webhook = ChatwootWebhookSchema.parse(rawWebhook);
    } catch (e) {
      console.error("Zod Parse Error:", e);
      return new Response(JSON.stringify({ error: "Invalid payload schema" }), { status: 400, headers: {...corsHeaders, "Content-Type": "application/json"} });
    }

    const { event, conversation, message_type, sender, account, message, account_id } = webhook;
    
    if (!["conversation_created", "message_created", "message_updated", "conversation_updated"].includes(event)) {
      return new Response(JSON.stringify({ message: "Event ignored" }), { headers: {...corsHeaders, "Content-Type": "application/json"} });
    }

    const extractedAccountId = account?.id || account_id || conversation?.id;
    if (!extractedAccountId) {
       console.error("Payload missing account ID:", JSON.stringify(rawWebhook));
       throw new Error("No account ID found in payload");
    }
    
    const integration: any = await service.checkIntegration(extractedAccountId.toString());
    
    if (!integration) {
      console.warn(`Integration not found for account ${extractedAccountId}`);
      return new Response(JSON.stringify({ message: "Integration not found" }), { headers: {...corsHeaders, "Content-Type": "application/json"} });
    }

    if (!integration.active) {
      return new Response(JSON.stringify({ message: "Integration inactive" }), { headers: {...corsHeaders, "Content-Type": "application/json"} });
    }

    let content = webhook.content || message?.content;
    const messageId = webhook.id?.toString() || message?.id?.toString();
    const derivedMessageType = message?.message_type || message_type;
    const conversationIdStr = conversation?.id.toString();

    content = sanitizeHTML(content || "");

    const senderNameCheck = sender?.name || "";
    if (content && (content === `*${senderNameCheck}*` || content === `*${senderNameCheck}:*`)) {
       return new Response(JSON.stringify({ message: "Empty/System message ignored" }), { headers: {...corsHeaders, "Content-Type": "application/json"} });
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
    const customerName = getCustomerName(conversation?.meta?.sender, sender, isAgent);

    const roleEmoji = isAgent ? "🧑‍💼" : "👤";
    const roleLabel = isAgent ? "Atendente" : "Cliente";
    const timestamp = getFormattedTimestamp();
    
    const formattedMessage = `[${timestamp}] ${roleEmoji} ${roleLabel} ${messageSenderName}: ${content || "Mensagem"}`;

    if (conversationIdStr && ["message_created", "message_updated", "conversation_updated"].includes(event)) {
      const existingCard = await service.findExistingCard(conversationIdStr);

      if (existingCard) {
        
        if (event === "conversation_updated") {
           const updateData: any = { updated_at: new Date().toISOString() };
           if (conversation?.assignee?.name) updateData.chatwoot_agent_name = conversation.assignee.name;
           
           // Atualiza título se estava genérico
           if (existingCard.title.includes("Cliente sem nome") && customerName !== "Cliente sem nome") {
              updateData.title = `${customerName} - ${conversation?.inbox?.name || "Nova"}`;
              updateData.chatwoot_contact_name = customerName;
           }

           await service.updateCardMetadata(existingCard.id, updateData);
           return new Response(JSON.stringify({ success: true }), { headers: {...corsHeaders, "Content-Type": "application/json"} });
        }

        const signature = computeSignature(messageId, conversationIdStr, messageSenderName, derivedMessageType, content);
        if (signature && await service.checkDuplicateEvent(signature)) {
           return new Response(JSON.stringify({ message: "Duplicate" }), { headers: {...corsHeaders, "Content-Type": "application/json"} });
        }

        if (isDuplicateContent(existingCard.description, content)) {
           return new Response(JSON.stringify({ message: "Duplicate content" }), { headers: {...corsHeaders, "Content-Type": "application/json"} });
        }

        const updatedDescription = existingCard.description ? `${existingCard.description}\n${formattedMessage}` : formattedMessage;
        
        await service.updateCardMetadata(existingCard.id, {
           description: updatedDescription,
           updated_at: new Date().toISOString(),
           priority: determinePriority(updatedDescription)
        });
        
        service.triggerAIAnalysis(existingCard.id);
        
        return new Response(JSON.stringify({ success: true }), { headers: {...corsHeaders, "Content-Type": "application/json"} });
      }
    }

    // LÓGICA DE CRIAÇÃO DE NOVO CARD
    if (!conversationIdStr) throw new Error("No conversation ID");

    const pipeline = integration.pipelines;
    if (!pipeline) throw new Error("Pipeline not found for integration");

    const columns = pipeline.columns?.sort((a: any, b: any) => a.position - b.position);
    const firstColumn = columns?.[0];
    if (!firstColumn) throw new Error("No columns found in pipeline");

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
    
    service.triggerAIAnalysis(newCard.id);

    return new Response(JSON.stringify({ success: true, card_id: newCard.id }), { headers: {...corsHeaders, "Content-Type": "application/json"} });

  } catch (error: any) {
    console.error("Webhook Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: {...corsHeaders, "Content-Type": "application/json"} });
  }
});