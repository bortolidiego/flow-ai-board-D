// @ts-nocheck
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { ChatwootWebhookPayload } from "./types.ts";

export class WebhookService {
  constructor(
    private supabase: SupabaseClient,
    private supabaseKey: string
  ) {}

  async triggerAIAnalysis(cardId: string) {
    try {
      console.log("Triggering AI analysis for card:", cardId);
      // Does not await execution, just triggers it
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

  async transcribeAudioIfNeeded(attachments: any[] | null | undefined): Promise<string | null> {
    if (!attachments || attachments.length === 0) return null;

    // Log for debugging
    console.log(`Checking attachments for audio:`, JSON.stringify(attachments));

    const audioAttachment = attachments.find((att: any) => 
      att.file_type === 'audio' || 
      (att.data_url && /\.(ogg|oga|mp3|wav|m4a|webm)$/i.test(att.data_url))
    );

    if (audioAttachment && audioAttachment.data_url) {
      console.log("Audio attachment found, triggering transcription...");
      try {
        const { data, error } = await this.supabase.functions.invoke('audio-transcribe', {
          body: { fileUrl: audioAttachment.data_url },
          headers: { Authorization: `Bearer ${this.supabaseKey}` }
        });

        if (error) {
          console.error("Error transcribing audio:", error);
          return "[Áudio não transcrito]";
        }
        
        if (data?.text) {
          console.log("Audio transcribed successfully");
          return `[Áudio transcrito]: ${data.text}`;
        }
        
        return "[Áudio]";
      } catch (err) {
        console.error("Failed to invoke audio-transcribe:", err);
        return "[Erro na transcrição de áudio]";
      }
    }

    return null;
  }

  async checkIntegration(accountId: string) {
    const { data, error } = await this.supabase
      .from("chatwoot_integrations")
      .select("active, account_id, inbox_id, pipelines(id, columns(id, name, position))")
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