// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { ChatwootWebhookSchema } from "./types.ts";
import { sanitizeHTML, computeSignature, getFormattedTimestamp, determinePriority, isDuplicateContent } from "./utils.ts";
import { WebhookService } from "./services.ts";

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

    // Validate Payload
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
    
    // Filter supported events
    if (!["conversation_created", "message_created", "message_updated", "conversation_updated"].includes(event)) {
      return new Response(JSON.stringify({ message: "Event ignored" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter private/bot messages
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

    // Validate Account Integration
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

    console.log("Integration ACTIVE for account:", accountId);

    // Determine content (Text or Transcribed Audio)
    let content = webhook.content || message?.content;
    const attachments = message?.attachments || [];

    // Try audio transcription
    const transcribedText = await service.transcribeAudioIfNeeded(attachments);
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

    // --- Scenario A: Existing Card Updates (Message Created/Updated, Conversation Updated) ---
    if (conversationIdStr && ["message_created", "message_updated", "conversation_updated"].includes(event)) {
      const existingCard = await service.findExistingCard(conversationIdStr);

      if (existingCard) {
        // 1. Handle Conversation Metadata Updates
        if (event === "conversation_updated") {
          console.log("Updating card metadata for conversation:", conversationIdStr);
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

        // 2. Handle Messages (Created/Updated)
        console.log(`Processing ${event} for conversation:`, conversationIdStr);

        // Deduplication check via signature
        const signature = computeSignature(messageId, conversationIdStr, effectiveSender?.name, derivedMessageType, content);
        if (signature) {
          const isDuplicate = await service.checkDuplicateEvent(signature);
          if (isDuplicate) {
            console.log('Duplicate event signature, skipping.');
            return new Response(JSON.stringify({ message: 'Duplicate event ignored' }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }

        // Logical deduplication against existing content
        if (isDuplicateContent(existingCard.description, content)) {
          console.log('Duplicate message content ignored.');
          return new Response(JSON.stringify({ message: 'Duplicate content ignored', cardId: existingCard.id }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Format Message
        const timestamp = getFormattedTimestamp();
        const isAgent = effectiveSender?.type === "User" || derivedMessageType === "outgoing";
        const displayName = isAgent ? "Agente" : (effectiveSender?.name || "Cliente");
        const formattedMessage = `[${timestamp}] ${displayName}: ${content || "Mensagem"}`;

        let updatedDescription: string;
        if (event === "message_updated" && existingCard.description) {
           const lines = existingCard.description.split("\n");
           // Try to replace last line if it looks like a recent message
           if (lines.length > 0 && lines[lines.length - 1].match(/^\[.*?\]/)) {
             lines[lines.length - 1] = formattedMessage;
             updatedDescription = lines.join("\n");
           } else {
             updatedDescription = `${existingCard.description}\n${formattedMessage}`;
           }
        } else {
          updatedDescription = existingCard.description ? `${existingCard.description}\n${formattedMessage}` : formattedMessage;
        }

        // Update Card
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

    // --- Scenario B: New Conversation / New Card Creation ---
    if (event === 'conversation_created' && conversationIdStr) {
      const signature = `conv_created:${conversationIdStr}`;
      const isDuplicate = await service.checkDuplicateEvent(signature);
      if (isDuplicate) {
        console.log('Duplicate conversation_created event, skipping.');
        return new Response(JSON.stringify({ message: 'Duplicate event ignored' }), {
           headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Logic to create new card (if not exists or if we want to create on specific events)
    // Usually we create on 'message_created' if no card exists, OR on 'conversation_created'
    // The logic below tries to find a finalized card to reuse customer profile
    
    const finalizedCard = await service.findFinalizedCard(conversationIdStr!);
    let customerProfileId = finalizedCard?.customer_profile_id || null;

    if (customerProfileId) {
       await service.updateCustomerStats(customerProfileId);
    }

    // Verify Inboxes filter
    const conversationInboxId = conversation?.inbox_id?.toString();
    
    // Filter columns
    const integrationData: any = integration; 
    const pipeline = integrationData.pipelines; 
    if (!pipeline) {
      return new Response(JSON.stringify({ error: "No pipeline configured for integration" }), {
         status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check Inbox Filter if present in integration
    if (conversationInboxId && integration.inbox_id) {
      const allowedInboxIds = integration.inbox_id.split(",").map((id: string) => id.trim());
      if (!allowedInboxIds.includes(conversationInboxId)) {
         console.log("Ignoring conversation from different inbox. Allowed:", allowedInboxIds, "Got:", conversationInboxId);
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

    // Initial Message
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