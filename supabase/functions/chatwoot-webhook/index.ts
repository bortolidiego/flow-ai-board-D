// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// --- TYPES & SCHEMAS ---

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

// --- UTILS ---

function sanitizeHTML(input: string): string {
  if (!input) return "";
  let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, "");
  sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]*/gi, "");
  sanitized = sanitized.replace(/javascript:/gi, "");
  sanitized = sanitized.replace(/data:text\/html/gi, "");
  const allowedTags = ["b", "i", "em", "strong", "a", "p", "br", "ul", "ol", "li"];
  const tagPattern = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
  sanitized = sanitized.replace(tagPattern, (match, tag) => {
    return allowedTags.includes(tag.toLowerCase()) ? match : "";
  });
  return sanitized;
}

function computeSignature(
  messageId: string | undefined, 
  conversationId: string | undefined, 
  senderName: string | undefined | null, 
  messageType: string | undefined, 
  content: string | undefined
) {
  if (messageId) return `msg:${messageId}`;
  const norm = (s: any) => (s || "").toString().trim().toLowerCase().replace(/\s+/g, " ").slice(0, 300);
  const key = `${norm(conversationId)}|${norm(senderName)}|${norm(messageType)}|${norm(content)}`;
  return key.slice(0, 200);
}

function getFormattedTimestamp() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' });
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
  return `${dateStr} ${timeStr}`;
}

function determinePriority(content: string): "high" | "medium" | "low" {
  const lower = content.toLowerCase();
  if (lower.includes("urgente") || lower.includes("emergência")) return "high";
  if (lower.includes("dúvida") || lower.includes("informação")) return "low";
  return "medium";
}

function isDuplicateContent(existingDescription: string, newContent: string): boolean {
  if (!existingDescription || !newContent) return false;
  const lines = existingDescription.split('\n');
  const recentLines = lines.slice(-5).join('\n');
  return recentLines.includes(newContent.trim());
}

// --- SERVICE CLASS ---

class WebhookService {
  constructor(
    private supabase: SupabaseClient,
    private supabaseKey: string
  ) {}

  async triggerAIAnalysis(cardId: string) {
    try {
      console.log("Triggering AI analysis for card:", cardId);
      this.supabase.functions.invoke("analyze-conversation", {
        body: { cardId },
        headers: { Authorization: `Bearer ${this.supabaseKey}` },
      }).then(({ error }) => {
        if (error) console.error("Error triggering AI analysis:", error);
        else console.log("AI analysis triggered successfully for card:", cardId);
      });
    } catch (err) {
      console.error("Failed to trigger AI analysis:", err);
    }
  }

  async transcribeAudioIfNeeded(attachments: any[] | null | undefined, chatwootApiKey: string): Promise<string | null> {
    if (!attachments || attachments.length === 0) {
      return null;
    }

    console.log("Processing attachments for transcription...");

    const audioAttachment = attachments.find((att: any) => 
      att.file_type === 'audio' || 
      (att.data_url && /\.(ogg|oga|mp3|wav|m4a|webm|aac)/i.test(att.data_url))
    );

    if (audioAttachment && audioAttachment.data_url) {
      console.log("Audio attachment found:", audioAttachment.data_url);
      
      try {
        const { data, error } = await this.supabase.functions.invoke('audio-transcribe', {
          body: { 
            url: audioAttachment.data_url,
            chatwoot_api_key: chatwootApiKey 
          },
          headers: { Authorization: `Bearer ${this.supabaseKey}` }
        });

        if (error) {
          console.error("Error transcribing audio:", error);
          return "[Áudio não transcrito - erro]";
        }
        
        if (data?.transcript) {
          console.log("Audio transcribed successfully:", data.transcript.substring(0, 50) + "...");
          return `[Áudio transcrito]: ${data.transcript}`;
        }
        
        console.log("Audio transcribed but no text returned.");
        return "[Áudio]";
      } catch (err) {
        console.error("Failed to invoke audio-transcribe:", err);
        return "[Erro na chamada de transcrição]";
      }
    }

    return null;
  }

  async checkIntegration(accountId: string) {
    const { data, error } = await this.supabase
      .from("chatwoot_integrations")
      .select("active, account_id, inbox_id, chatwoot_api_key, pipelines(id, columns(id, name, position))")
      .eq("account_id", accountId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async findExistingCard(conversationId: string) {
    const { data } = await this.supabase
      .from("cards")
      .select("id, description, priority, assignee, chatwoot_contact_name, chatwoot_contact_email, chatwoot_agent_name, updated_at, completion_type, customer_profile_id")
      .eq("chatwoot_conversation_id", conversationId)
      .is("completion_type", null)
      .maybeSingle();
    return data;
  }

  async findFinalizedCard(conversationId: string) {
    const { data } = await this.supabase
      .from("cards")
      .select("customer_profile_id")
      .eq("chatwoot_conversation_id", conversationId)
      .not("completion_type", "is", null)
      .maybeSingle();
    return data;
  }

  async checkDuplicateEvent(signature: string) {
    const { error } = await this.supabase
      .from('chatwoot_processed_events')
      .insert({ signature });

    return error?.code === '23505'; // True if duplicate
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
    console.log("Received Chatwoot webhook event:", rawWebhook?.event);

    let webhook;
    try {
      webhook = ChatwootWebhookSchema.parse(rawWebhook);
    } catch (validationError) {
      console.error("Invalid webhook payload:", validationError);
      return new Response(
        JSON.stringify({
          error: "Invalid webhook payload",
          details: validationError instanceof z.ZodError ? validationError.errors : "Validation failed",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { event, conversation, message_type, sender, account, message } = webhook;
    
    if (!["conversation_created", "message_created", "message_updated", "conversation_updated"].includes(event)) {
      return new Response(JSON.stringify({ message: "Event ignored" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isPrivate = (message?.private ?? webhook.private) === true;
    const effectiveSender = message?.sender ?? sender;
    
    if (["message_created", "message_updated"].includes(event)) {
      if (isPrivate) {
        return new Response(JSON.stringify({ message: "Private message ignored" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (effectiveSender?.type === "captain_assistant") {
        return new Response(JSON.stringify({ message: "Bot message ignored" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const accountId = account?.id || conversation?.id;
    if (!accountId) {
      return new Response(JSON.stringify({ message: "No account_id provided" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const integration = await service.checkIntegration(accountId.toString());
    
    if (!integration) {
      console.log("No integration configured for account:", accountId);
      return new Response(JSON.stringify({ message: "Integration not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!integration.active) {
      console.log("Integration PAUSED for account:", accountId);
      return new Response(JSON.stringify({ message: "Integration paused" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let content = webhook.content || message?.content;
    const attachments = message?.attachments || webhook.attachments || [];

    // Transcribe audio using the API key from the integration settings
    const transcribedText = await service.transcribeAudioIfNeeded(attachments, integration.chatwoot_api_key);
    
    if (transcribedText) {
      content = transcribedText;
    } else if (!content && attachments.length > 0) {
      const type = attachments[0].file_type || "arquivo";
      content = `[Anexo: ${type}]`;
    }

    content = sanitizeHTML(content || "");
    const messageId = webhook.id?.toString() || message?.id?.toString();
    const derivedMessageType = message?.message_type || message_type;
    const conversationIdStr = conversation?.id.toString();

    if (conversationIdStr && ["message_created", "message_updated", "conversation_updated"].includes(event)) {
      const existingCard = await service.findExistingCard(conversationIdStr);

      if (existingCard) {
        if (event === "conversation_updated") {
          const updateData: any = {
            assignee: conversation?.assignee?.name || existingCard.assignee,
            chatwoot_contact_name: conversation?.meta?.sender?.name || existingCard.chatwoot_contact_name,
            chatwoot_contact_email: conversation?.meta?.sender?.email || existingCard.chatwoot_contact_email,
            updated_at: new Date().toISOString(),
          };
          if (conversation?.assignee?.name) updateData.chatwoot_agent_name = conversation.assignee.name;

          await service.updateCardMetadata(existingCard.id, updateData);
          return new Response(JSON.stringify({ message: "Conversation metadata updated", cardId: existingCard.id }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const signature = computeSignature(messageId, conversationIdStr, effectiveSender?.name, derivedMessageType, content);
        if (signature) {
          const isDuplicate = await service.checkDuplicateEvent(signature);
          if (isDuplicate) {
            return new Response(JSON.stringify({ message: 'Duplicate event ignored' }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }

        if (isDuplicateContent(existingCard.description, content)) {
          return new Response(JSON.stringify({ message: 'Duplicate content ignored', cardId: existingCard.id }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const timestamp = getFormattedTimestamp();
        const isAgent = effectiveSender?.type === "User" || derivedMessageType === "outgoing";
        const displayName = isAgent ? "Agente" : (effectiveSender?.name || "Cliente");
        const formattedMessage = `[${timestamp}] ${displayName}: ${content || "Mensagem"}`;

        let updatedDescription: string;
        if (event === "message_updated" && existingCard.description) {
           const lines = existingCard.description.split("\n");
           if (lines.length > 0 && lines[lines.length - 1].match(/^\[.*?\]/)) {
             lines[lines.length - 1] = formattedMessage;
             updatedDescription = lines.join("\n");
           } else {
             updatedDescription = `${existingCard.description}\n${formattedMessage}`;
           }
        } else {
          updatedDescription = existingCard.description ? `${existingCard.description}\n${formattedMessage}` : formattedMessage;
        }

        const updateData: any = {
          description: updatedDescription,
          priority: determinePriority(updatedDescription),
          assignee: conversation?.assignee?.name || existingCard.assignee,
          updated_at: new Date().toISOString(),
        };
        if (isAgent && sender?.name) updateData.chatwoot_agent_name = sender.name;

        const { error: updateError } = await service.updateCardMetadata(existingCard.id, updateData);

        if (updateError) throw updateError;

        service.triggerAIAnalysis(existingCard.id);

        return new Response(JSON.stringify({ message: `Card updated (${event})`, cardId: existingCard.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (event === 'conversation_created' && conversationIdStr) {
      const signature = `conv_created:${conversationIdStr}`;
      const isDuplicate = await service.checkDuplicateEvent(signature);
      if (isDuplicate) {
        return new Response(JSON.stringify({ message: 'Duplicate event ignored' }), {
           headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const finalizedCard = await service.findFinalizedCard(conversationIdStr!);
    let customerProfileId = finalizedCard?.customer_profile_id || null;

    if (customerProfileId) {
       await service.updateCustomerStats(customerProfileId);
    }

    const conversationInboxId = conversation?.inbox_id?.toString();
    const integrationData: any = integration; 
    const pipeline = integrationData.pipelines; 
    if (!pipeline) {
      return new Response(JSON.stringify({ error: "No pipeline configured for integration" }), {
         status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (conversationInboxId && integration.inbox_id) {
      const allowedInboxIds = integration.inbox_id.split(",").map((id: string) => id.trim());
      if (!allowedInboxIds.includes(conversationInboxId)) {
         return new Response(JSON.stringify({ message: "Conversation ignored - inbox filter mismatch" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
         });
      }
    }
    
    const firstColumn = pipeline.columns?.find((c: any) => c.name === "Novo Contato") || 
                        pipeline.columns?.sort((a: any, b: any) => a.position - b.position)[0];

    if (!firstColumn) {
      return new Response(JSON.stringify({ error: "No columns configured" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const timestamp = getFormattedTimestamp();
    const isAgent = effectiveSender?.type === "User" || derivedMessageType === "outgoing";
    const displayName = isAgent ? "Agente" : (effectiveSender?.name || "Cliente");
    const initialMessage = `[${timestamp}] ${displayName}: ${content || "Nova conversa iniciada"}`;

    const cardData: any = {
      column_id: firstColumn.id,
      title: `${effectiveSender?.name || "Cliente"} - ${conversation?.inbox?.name || "Nova conversa"}`,
      description: initialMessage,
      priority: determinePriority(initialMessage),
      assignee: conversation?.assignee?.name,
      ai_suggested: true,
      chatwoot_conversation_id: conversationIdStr,
      chatwoot_contact_name: effectiveSender?.name,
      chatwoot_contact_email: effectiveSender?.email,
      inbox_name: conversation?.inbox?.name,
      position: 0,
      customer_profile_id: customerProfileId,
      custom_fields_data: {},
    };

    if (conversation?.assignee?.name) cardData.chatwoot_agent_name = conversation.assignee.name;

    const { data: newCard, error: createError } = await service.createCard(cardData);

    if (createError) throw createError;

    console.log("Card created successfully:", newCard.id);
    service.triggerAIAnalysis(newCard.id);

    return new Response(JSON.stringify({ message: "Card created successfully", card: newCard }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error processing webhook:", error);
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});