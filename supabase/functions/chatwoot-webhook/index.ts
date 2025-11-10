// @ts-nocheck

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ChatwootWebhookSchema = z.object({
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
  content: z.string().max(50000).optional(),
  sender: z.object({
    type: z.string().max(50).optional(),
    name: z.string().max(200).optional(),
    email: z.string().email().max(255).optional().nullable(),
  }).optional().nullable(),
  account: z.object({
    id: z.number(),
  }).optional(),
  private: z.boolean().optional(),
});

// Sanitização simples de HTML para evitar XSS
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Dispara análise de IA em background
    const triggerAIAnalysis = async (cardId: string) => {
      try {
        console.log("Triggering AI analysis for card:", cardId);
        const { error: analysisError } = await supabase.functions.invoke("analyze-conversation", {
          body: { cardId },
          headers: { Authorization: `Bearer ${supabaseKey}` },
        });
        if (analysisError) console.error("Error triggering AI analysis:", analysisError);
        else console.log("AI analysis triggered successfully for card:", cardId);
      } catch (err) {
        console.error("Failed to trigger AI analysis:", err);
      }
    };

    const rawWebhook = await req.json();
    console.log("Received Chatwoot webhook event:", rawWebhook?.event);

    // Validação com Zod
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

    const { event, conversation, message_type, content: rawContent, sender, account } = webhook;
    const content = rawContent ? sanitizeHTML(rawContent) : undefined;

    if (!["conversation_created", "message_created", "message_updated", "conversation_updated"].includes(event)) {
      return new Response(JSON.stringify({ message: "Event ignored" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (["message_created", "message_updated"].includes(event) && webhook.private === true) {
      console.log("Ignoring private message");
      return new Response(JSON.stringify({ message: "Private message ignored" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (["message_created", "message_updated"].includes(event) && sender?.type === "captain_assistant") {
      console.log("Ignoring bot message");
      return new Response(JSON.stringify({ message: "Bot message ignored" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accountId = account?.id || conversation?.id;
    if (!accountId) {
      console.log("No account_id or conversation_id found in webhook payload");
      return new Response(JSON.stringify({ message: "No account_id provided" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Confere integração por account_id e se está ativa
    const { data: integrationCheck, error: integrationError } = await supabase
      .from("chatwoot_integrations")
      .select("active, account_id")
      .eq("account_id", account?.id?.toString() || "")
      .maybeSingle();

    if (integrationError) {
      console.error("Error checking integration:", integrationError);
      return new Response(JSON.stringify({ error: "Failed to check integration status" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (!integrationCheck) {
      console.log("No integration configured for account:", account?.id);
      return new Response(JSON.stringify({ message: "Integration not configured for this account" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (!integrationCheck.active) {
      console.log("⏸️ Integration is PAUSED for account:", account?.id, "- Skipping all synchronization");
      return new Response(JSON.stringify({ message: "Integration is paused - synchronization skipped" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log("✅ Integration is ACTIVE for account:", account?.id, "- Processing webhook");

    // Tentar localizar card ativo existente
    let existingCard: any = null;
    if (["message_created", "message_updated", "conversation_updated"].includes(event) && conversation?.id) {
      const result = await supabase
        .from("cards")
        .select(
          "id, description, priority, assignee, chatwoot_contact_name, chatwoot_contact_email, chatwoot_agent_name, updated_at, completion_type, customer_profile_id"
        )
        .eq("chatwoot_conversation_id", conversation.id.toString())
        .is("completion_type", null)
        .maybeSingle();

      existingCard = result.data;

      // conversation_updated => só metadados
      if (existingCard && event === "conversation_updated") {
        console.log("Updating card metadata for conversation:", conversation.id);
        const updateData: any = {
          assignee: conversation?.assignee?.name || existingCard.assignee,
          chatwoot_contact_name: conversation?.meta?.sender?.name || existingCard.chatwoot_contact_name,
          chatwoot_contact_email: conversation?.meta?.sender?.email || existingCard.chatwoot_contact_email,
          updated_at: new Date().toISOString(),
        };
        if (conversation?.assignee?.name) updateData.chatwoot_agent_name = conversation.assignee.name;

        const { error: updateError } = await supabase.from("cards").update(updateData).eq("id", existingCard.id);
        if (updateError) {
          console.error("Error updating conversation metadata:", updateError);
          return new Response(JSON.stringify({ error: updateError.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        console.log("Conversation metadata updated successfully");
        return new Response(JSON.stringify({ message: "Conversation metadata updated", cardId: existingCard.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // message_created / message_updated => adicionar/editar histórico
      if (existingCard && ["message_created", "message_updated"].includes(event)) {
        console.log(`Processing ${event} for conversation:`, conversation.id);

        const lastUpdate = new Date(existingCard.updated_at || 0);
        const timeSinceUpdate = Date.now() - lastUpdate.getTime();
        const lastMessageContent = existingCard.description?.split("\n").pop() || "";
        const contentPreview = content?.substring(0, 100) || "";
        if (timeSinceUpdate < 5000 && lastMessageContent.includes(contentPreview)) {
          console.log("Duplicate recent update detected, skipping");
          return new Response(JSON.stringify({ message: "Duplicate event ignored" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const timestamp = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        const isAgent = sender?.type === "User" || message_type === "outgoing";
        const isContact = sender?.type === "Contact" || message_type === "incoming";
        console.log("Message details:", { sender_type: sender?.type, message_type, isAgent, isContact, sender_name: sender?.name });

        const senderLabel = isAgent ? "🧑‍💼 Atendente" : "👤 Cliente";
        const senderName = sender?.name || (isAgent ? "Atendente" : "Cliente");

        let updatedDescription: string;
        if (event === "message_updated") {
          const lines = (existingCard.description || "").split("\n");
          const updatedMessage = `[${timestamp}] ${senderLabel} ${senderName}: ${content || "Mensagem editada"}`;
          if (lines.length > 0 && lines[lines.length - 1].match(/^\[\d{2}:\d{2}\]/)) {
            lines[lines.length - 1] = updatedMessage;
            updatedDescription = lines.join("\n");
          } else {
            updatedDescription = existingCard.description ? `${existingCard.description}\n${updatedMessage}` : updatedMessage;
          }
        } else {
          const newMessage = `[${timestamp}] ${senderLabel} ${senderName}: ${content || "Nova mensagem"}`;
          updatedDescription = existingCard.description ? `${existingCard.description}\n${newMessage}` : newMessage;
        }

        const allContent = updatedDescription.toLowerCase();
        let priority = "medium";
        if (allContent.includes("urgente") || allContent.includes("emergência")) priority = "high";
        else if (allContent.includes("dúvida") || allContent.includes("informação")) priority = "low";

        const updateData: any = {
          description: updatedDescription,
          priority,
          assignee: conversation?.assignee?.name || existingCard.assignee,
          updated_at: new Date().toISOString(),
        };
        if (isAgent && sender?.name) updateData.chatwoot_agent_name = sender.name;

        const { error: updateError } = await supabase.from("cards").update(updateData).eq("id", existingCard.id);
        if (updateError) {
          console.error("Error updating card:", updateError);
          return new Response(JSON.stringify({ error: updateError.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        triggerAIAnalysis(existingCard.id).catch((err) => console.error("Background AI analysis failed:", err));

        console.log(`Card updated successfully (${event})`);
        return new Response(JSON.stringify({ message: `Card updated successfully (${event})`, cardId: existingCard.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Reaproveitar customer_profile_id de card finalizado
    let customerProfileId: string | null = null;
    if (!existingCard && conversation?.id) {
      const { data: finalizedCard } = await supabase
        .from("cards")
        .select("customer_profile_id")
        .eq("chatwoot_conversation_id", conversation.id.toString())
        .not("completion_type", "is", null)
        .maybeSingle();

      if (finalizedCard?.customer_profile_id) {
        customerProfileId = finalizedCard.customer_profile_id;
        console.log("Found finalized card, will create new card with same customer_profile_id:", customerProfileId);
        await supabase.rpc("increment_customer_stat", { profile_id: customerProfileId, stat_field: "total_interactions" });
        await supabase.from("customer_profiles").update({ last_contact_at: new Date().toISOString() }).eq("id", customerProfileId);
      }
    }

    if (!account) {
      console.warn("Event without account info - cannot create new card");
      return new Response(JSON.stringify({ error: "Account information required for new conversations" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar integração + colunas
    const { data: integrations } = await supabase
      .from("chatwoot_integrations")
      .select("*, pipelines(id, columns(id, name, position))")
      .eq("account_id", account.id.toString())
      .eq("active", true);

    if (!integrations || integrations.length === 0) {
      console.error("Unexpected: Integration validation passed but not found for card creation");
      return new Response(JSON.stringify({ error: "Integration configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let integration = integrations[0];
    const conversationInboxId = conversation?.inbox_id?.toString();

    if (conversationInboxId) {
      const inboxSpecificIntegration = integrations.find((int: any) => {
        if (!int.inbox_id) return false;
        const allowedInboxIds = int.inbox_id.split(",").map((id: string) => id.trim());
        return allowedInboxIds.includes(conversationInboxId);
      });

      if (inboxSpecificIntegration) {
        integration = inboxSpecificIntegration as any;
        console.log("Using inbox-specific integration for inbox:", conversationInboxId);
      } else {
        const firstIntegrationInboxIds = integration.inbox_id ? integration.inbox_id.split(",").map((id: string) => id.trim()) : [];
        if (firstIntegrationInboxIds.length > 0 && !firstIntegrationInboxIds.includes(conversationInboxId)) {
          console.log("Ignoring conversation from different inbox. Allowed:", firstIntegrationInboxIds, "Got:", conversationInboxId);
          return new Response(
            JSON.stringify({
              message: "Conversation ignored - inbox filter mismatch",
              allowed_inboxes: firstIntegrationInboxIds,
              received_inbox: conversationInboxId,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    } else if (integration.inbox_id) {
      console.warn("Integration requires inbox but conversation has no inbox_id");
      return new Response(JSON.stringify({ message: "Conversation ignored - missing inbox information" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const firstColumn =
      (integration as any).pipelines.columns.find((col: any) => col.name === "Novo Contato") ||
      (integration as any).pipelines.columns.sort((a: any, b: any) => a.position - b.position)[0];

    if (!firstColumn) {
      console.error("No columns found for pipeline");
      return new Response(JSON.stringify({ error: "No columns configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contentLower = (content || "").toLowerCase();
    let priority = "medium";
    if (contentLower.includes("urgente") || contentLower.includes("emergência")) priority = "high";
    else if (contentLower.includes("dúvida") || contentLower.includes("informação")) priority = "low";

    const timestamp = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const isAgent = sender?.type === "User" || message_type === "outgoing";
    const senderLabel = isAgent ? "🧑‍💼 Atendente" : "👤 Cliente";
    const senderName = sender?.name || (isAgent ? "Atendente" : "Cliente");
    const initialMessage = `[${timestamp}] ${senderLabel} ${senderName}: ${content || "Nova conversa iniciada"}`;

    const cardData: any = {
      column_id: firstColumn.id,
      title: `${sender?.name || "Cliente"} - ${conversation?.inbox?.name || "Nova conversa"}`,
      description: initialMessage,
      priority,
      assignee: conversation?.assignee?.name,
      ai_suggested: true,
      chatwoot_conversation_id: conversation?.id?.toString(),
      chatwoot_contact_name: sender?.name,
      chatwoot_contact_email: sender?.email,
      inbox_name: conversation?.inbox?.name,
      position: 0,
      customer_profile_id: customerProfileId,
    };
    if (conversation?.assignee?.name) cardData.chatwoot_agent_name = conversation.assignee.name;

    const { data: card, error } = await supabase.from("cards").insert(cardData).select().single();
    if (error) {
      console.error("Error creating card:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Card created successfully:", card);
    if (card?.id) triggerAIAnalysis(card.id).catch((err) => console.error("Background AI analysis failed:", err));

    return new Response(JSON.stringify({ message: "Card created successfully", card }), {
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