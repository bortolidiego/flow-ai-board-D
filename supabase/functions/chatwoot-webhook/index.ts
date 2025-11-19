// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// ... (manter definições de schema e utils anteriores, apenas focando no processamento)

const ChatwootWebhookSchema = z.object({
  id: z.number().optional(),
  event: z.enum(["conversation_created", "message_created", "message_updated", "conversation_updated"]),
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

// ... (funções auxiliares iguais)

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
  return sanitized.trim(); // Trim importante
}

// ... (Manter computeSignature e WebhookService como estavam)

// --- UTILS (Recolocando as funções auxiliares necessárias para o contexto) ---
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

// --- SERVICE CLASS (Simplificado para o contexto da edição) ---
class WebhookService {
  constructor(private supabase: SupabaseClient, private supabaseKey: string) {}

  async triggerAIAnalysis(cardId: string) {
    this.supabase.functions.invoke("analyze-conversation", {
      body: { cardId },
      headers: { Authorization: `Bearer ${this.supabaseKey}` },
    }).catch(err => console.error("AI trigger error", err));
  }

  async checkIntegration(accountId: string) {
    const { data } = await this.supabase.from("chatwoot_integrations").select("*").eq("account_id", accountId).maybeSingle();
    return data;
  }

  async findExistingCard(conversationId: string) {
    const { data } = await this.supabase.from("cards").select("*").eq("chatwoot_conversation_id", conversationId).is("completion_type", null).maybeSingle();
    return data;
  }
  
  async findFinalizedCard(conversationId: string) {
    const { data } = await this.supabase.from("cards").select("customer_profile_id").eq("chatwoot_conversation_id", conversationId).not("completion_type", "is", null).maybeSingle();
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

  async updateCustomerStats(profileId: string) {
    await this.supabase.rpc("increment_customer_stat", { profile_id: profileId, stat_field: "total_interactions" });
    await this.supabase.from("customer_profiles").update({ last_contact_at: new Date().toISOString() }).eq("id", profileId);
  }

  async transcribeAudioIfNeeded(attachments: any[] | null | undefined, chatwootApiKey: string): Promise<string | null> {
    // ... (Manter lógica de áudio existente)
    return null; 
  }
}

// --- MAIN HANDLER ---

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
      return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400, headers: {...corsHeaders, "Content-Type": "application/json"} });
    }

    const { event, conversation, message_type, sender, account, message } = webhook;
    
    if (!["conversation_created", "message_created", "message_updated", "conversation_updated"].includes(event)) {
      return new Response(JSON.stringify({ message: "Event ignored" }), { headers: {...corsHeaders, "Content-Type": "application/json"} });
    }

    // ... (verificações de account e integration mantidas)
    const accountId = account?.id || conversation?.id;
    if (!accountId) throw new Error("No account ID");
    
    const integration: any = await service.checkIntegration(accountId.toString());
    if (!integration || !integration.active) return new Response(JSON.stringify({ message: "Integration invalid" }), { headers: {...corsHeaders, "Content-Type": "application/json"} });

    let content = webhook.content || message?.content;
    const attachments = message?.attachments || webhook.attachments || [];
    const messageId = webhook.id?.toString() || message?.id?.toString();
    const derivedMessageType = message?.message_type || message_type;
    const conversationIdStr = conversation?.id.toString();

    // Limpeza de HTML
    content = sanitizeHTML(content || "");

    // IGNORAR MENSAGENS VAZIAS OU "LIXO"
    // Se o conteúdo for apenas "*Nome do Usuário*", ignore.
    const senderNameCheck = sender?.name || "";
    if (content && (content === `*${senderNameCheck}*` || content === `*${senderNameCheck}:*`)) {
       return new Response(JSON.stringify({ message: "Empty/System message ignored" }), { headers: {...corsHeaders, "Content-Type": "application/json"} });
    }

    // Determinação de Papel
    const isAgent = derivedMessageType === "outgoing";
    let displayName;
    if (isAgent) {
      displayName = sender?.name || conversation?.assignee?.name || "Atendente";
    } else {
      displayName = sender?.name || conversation?.meta?.sender?.name || "Cliente";
    }

    const roleEmoji = isAgent ? "🧑‍💼" : "👤";
    const roleLabel = isAgent ? "Atendente" : "Cliente";
    const timestamp = getFormattedTimestamp();
    
    // Formato padronizado
    const formattedMessage = `[${timestamp}] ${roleEmoji} ${roleLabel} ${displayName}: ${content || "Mensagem"}`;

    if (conversationIdStr && ["message_created", "message_updated", "conversation_updated"].includes(event)) {
      const existingCard = await service.findExistingCard(conversationIdStr);

      if (existingCard) {
        // ... (Lógica de atualização existente)
        
        if (event === "conversation_updated") {
           // Atualiza apenas metadados, sem adicionar mensagem
           const updateData: any = { updated_at: new Date().toISOString() };
           if (conversation?.assignee?.name) updateData.chatwoot_agent_name = conversation.assignee.name;
           await service.updateCardMetadata(existingCard.id, updateData);
           return new Response(JSON.stringify({ success: true }), { headers: {...corsHeaders, "Content-Type": "application/json"} });
        }

        const signature = computeSignature(messageId, conversationIdStr, displayName, derivedMessageType, content);
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

    // ... (Lógica de criação de card existente)
    if (!conversationIdStr) throw new Error("No conversation ID");

    // Se não existir card, cria um novo
    const pipeline = integration.pipelines;
    const firstColumn = pipeline?.columns?.[0]; // Simplificação para o exemplo
    
    if (!firstColumn) throw new Error("No columns");

    const cardData: any = {
       column_id: firstColumn.id,
       title: `${displayName} - ${conversation?.inbox?.name || "Nova"}`,
       description: formattedMessage,
       priority: determinePriority(formattedMessage),
       chatwoot_conversation_id: conversationIdStr,
       // ... outros campos
    };
    
    const { data: newCard } = await service.createCard(cardData);
    service.triggerAIAnalysis(newCard.id);

    return new Response(JSON.stringify({ success: true }), { headers: {...corsHeaders, "Content-Type": "application/json"} });

  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: {...corsHeaders, "Content-Type": "application/json"} });
  }
});