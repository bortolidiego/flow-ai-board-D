/* eslint-disable */
// @ts-nocheck

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Constants
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Schemas
const AttachmentSchema = z.object({
  id: z.number().optional(),
  content_type: z.string().optional().nullable(),
  data_url: z.string().optional().nullable(),
  download_url: z.string().optional().nullable(),
  file_type: z.string().optional().nullable(),
  url: z.string().optional().nullable(),
});

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
    created_at: z.any().optional().nullable(),
  }).optional(),
  message_type: z.enum(["incoming", "outgoing"]).optional(),
  content: z.string().max(50000).optional().nullable(),
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
    content: z.string().max(50000).optional().nullable(),
    private: z.boolean().optional(),
    sender: z.object({
      type: z.string().max(50).optional(),
      name: z.string().max(200).optional(),
      email: z.string().email().max(255).optional().nullable(),
    }).optional().nullable(),
    created_at: z.any().optional().nullable(),
    attachments: z.array(AttachmentSchema).optional().nullable(),
  }).optional(),
});

// Types
interface Attachment {
  id?: number;
  url?: string;
  content_type?: string | null;
  file_type?: string | null;
  filename?: string | null;
}

interface ProcessedAttachment {
  type: "audio" | "image" | "file";
  name: string;
  url: string;
  content_type?: string | null;
  transcript?: string;
}

interface ChatMessage {
  id?: string;
  timestamp: string;
  sender_label: string;
  sender_role: "agent" | "contact";
  sender_name: string;
  content: string;
  attachments: ProcessedAttachment[];
}

interface IntegrationCheck {
  active: boolean;
  account_id: string;
  chatwoot_api_key: string;
  chatwoot_url: string;
  inbox_id?: string;
  pipeline_id: string;
  pipelines: {
    columns: Array<{
      id: string;
      name: string;
      position: number;
    }>;
  };
}

// Utility Functions
class TextUtils {
  static htmlToText(input: string | undefined): string {
    if (!input) return "";
    let s = input;
    s = s.replace(/<\s*br\s*\/?>/gi, "\n").replace(/<\/\s*p\s*>/gi, "\n");
    s = s.replace(/<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, "$2 ($1)");
    s = s.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
    s = s.replace(/on\w+\s*=\s*["'][^"']*["']/gi, "");
    s = s.replace(/on\w+\s*=\s*[^\s>]*/gi, "");
    s = s.replace(/javascript:/gi, "");
    s = s.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, "");
    s = s.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
    return s;
  }

  static normalizeTimestamp(ts?: string | number | null): string {
    try {
      if (typeof ts === "number") {
        const ms = ts < 1e12 ? ts * 1000 : ts;
        return new Date(ms).toISOString();
      }
      if (typeof ts === "string" && ts) {
        const d = new Date(ts);
        return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
      }
      return new Date().toISOString();
    } catch {
      return new Date().toISOString();
    }
  }

  static formatTimestamp(ts?: string | number | null): string {
    try {
      let d: Date;
      if (typeof ts === "number") {
        const ms = ts < 1e12 ? ts * 1000 : ts;
        d = new Date(ms);
      } else {
        d = ts ? new Date(ts) : new Date();
      }
      return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
    } catch {
      const d = new Date();
      return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
    }
  }

  static normalizeUrl(u: string, base?: string | null): string {
    if (!u) return u;
    try {
      if (u.startsWith("http://") || u.startsWith("https://")) return u;
      if (base && u.startsWith("/")) {
        return `${base}${u}`;
      }
      return u;
    } catch {
      return u;
    }
  }

  static computePriority(allText: string): "low" | "medium" | "high" {
    const s = (allText || "").toLowerCase();
    if (s.includes("urgente") || s.includes("emergência")) return "high";
    if (s.includes("dúvida") || s.includes("informação")) return "low";
    return "medium";
  }
}

// Chatwoot API Client
class ChatwootAPIClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private async fetchJson(endpoint: string): Promise<{ ok: boolean; status: number; json: any }> {
    const baseHeaders: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'Supabase-Edge-Function/1.0'
    };

    const strategies = [
      { endpoint, headers: { ...baseHeaders, 'api_access_token': this.apiKey }, label: 'api_access_token header' },
      { endpoint, headers: { ...baseHeaders, 'Authorization': `Bearer ${this.apiKey}` }, label: 'Authorization: Bearer' },
      { endpoint, headers: { ...baseHeaders, 'Api-Access-Token': this.apiKey }, label: 'Api-Access-Token header' },
      { endpoint: endpoint + (endpoint.includes('?') ? '&' : '?') + 'api_access_token=' + encodeURIComponent(this.apiKey), headers: baseHeaders, label: 'api_access_token query' },
    ];

    for (const strategy of strategies) {
      try {
        const res = await fetch(strategy.endpoint, { headers: strategy.headers });
        if (res.ok) {
          const json = await res.json().catch(() => null);
          if (json === null) {
            console.error("Chatwoot retornou resposta não JSON para", strategy.label);
          } else {
            console.log("✅ Chatwoot OK via", strategy.label);
          }
          return { ok: true, status: res.status, json };
        } else {
          const text = await res.text().catch(() => "");
          console.error("❌ Chatwoot falhou", { url: strategy.endpoint, label: strategy.label, status: res.status, body: text?.slice(0, 500) });
        }
      } catch (e) {
        console.error("❌ Erro na tentativa de autenticação Chatwoot", { label: strategy.label, error: String(e) });
      }
    }

    return { ok: false, status: 401, json: null };
  }

  async getMessageAttachments(accountId: string, conversationId: number, messageId: number): Promise<Attachment[]> {
    const endpoint = `${this.baseUrl}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages/${messageId}`;
    console.log("🔍 Consultando Chatwoot para anexos da mensagem", { endpoint, messageId });
    
    const result = await this.fetchJson(endpoint);
    if (!result.ok) {
      console.error("❌ Falha ao buscar mensagem:", result.status);
      return [];
    }

    const msg = result.json;
    console.log("📝 Mensagem recebida:", JSON.stringify(msg, null, 2));
    
    const rawAttachments = Array.isArray(msg?.attachments) ? msg.attachments : [];
    
    if (rawAttachments.length === 0) {
      console.log("⚠️ Nenhum anexo encontrado na mensagem");
      return [];
    }
    
    console.log("📎 Anexos brutos recebidos da API:", JSON.stringify(rawAttachments, null, 2));
    
    const normalized = rawAttachments.map((att: any): Attachment => {
      const rawUrl = att?.data_url || att?.download_url || att?.url || att?.file_url || undefined;
      console.log("🔗 Processando anexo da API:", {
        id: att?.id,
        rawUrl,
        content_type: att?.content_type,
        file_type: att?.file_type,
        filename: att?.filename
      });
      return {
        id: att?.id,
        url: rawUrl ? TextUtils.normalizeUrl(rawUrl, this.baseUrl) : undefined,
        content_type: att?.content_type || null,
        file_type: att?.file_type || null,
        filename: att?.filename || null,
      };
    }).filter((a: Attachment) => !!a.url);

    console.log("✅ Anexos normalizados obtidos via Chatwoot API", { count: normalized.length, attachments: normalized });
    return normalized;
  }

  async getConversationMessageAttachments(accountId: string, conversationId: number): Promise<Attachment[]> {
    const endpoint = `${this.baseUrl}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`;
    console.log("🔍 Consultando Chatwoot mensagens da conversa para anexos", { endpoint });
    
    const result = await this.fetchJson(endpoint);
    if (!result.ok) {
      console.error("❌ Falha ao obter mensagens via Chatwoot API", { status: result.status });
      return [];
    }

    const msgs = result.json;
    if (!Array.isArray(msgs)) return [];

    for (let i = msgs.length - 1; i >= 0; i--) {
      const m = msgs[i];
      const rawAttachments = Array.isArray(m?.attachments) ? m.attachments : [];
      
      const normalized = rawAttachments.map((att: any): Attachment => {
        const rawUrl = att?.data_url || att?.download_url || att?.url || att?.file_url || undefined;
        return {
          id: att?.id,
          url: rawUrl ? TextUtils.normalizeUrl(rawUrl, this.baseUrl) : undefined,
          content_type: att?.content_type || null,
          file_type: att?.file_type || null,
          filename: att?.filename || null,
        };
      }).filter((a: Attachment) => !!a.url);

      if (normalized.length > 0) {
        console.log("✅ Anexos obtidos via histórico da conversa", { count: normalized.length });
        return normalized;
      }
    }
    return [];
  }
}

// Attachment Processor - APENAS ÁUDIOS
class AttachmentProcessor {
  // Extensões de áudio suportadas
  private static readonly AUDIO_EXTENSIONS = [
    ".mp3", ".ogg", ".wav", ".m4a", ".aac", ".flac", ".webm", ".amr", ".opus", ".oga", ".ts", ".mp4", ".3gp"
  ];

  private static attachmentUrl(att: Attachment): string | undefined {
    return att?.url || att?.data_url || att?.download_url || att?.file_url || undefined;
  }

  private static isAudioUrlByExtension(url?: string | null): boolean {
    if (!url) return false;
    try {
      const lower = url.toLowerCase();
      const hasAudioExtension = this.AUDIO_EXTENSIONS.some((ext) => lower.includes(ext));
      if (hasAudioExtension) {
        console.log("✅ URL detectada como áudio por extensão:", url);
      }
      return hasAudioExtension;
    } catch {
      return false;
    }
  }

  private static isAudioAttachment(att: Attachment): boolean {
    const ct = (att?.content_type || att?.file_type || "").toLowerCase();
    const url = this.attachmentUrl(att);
    
    console.log("🔍 Verificando anexo:", {
      content_type: ct,
      file_type: att?.file_type,
      url,
      filename: att?.filename
    });
    
    // Verifica content_type
    if (!!ct && (ct === "audio" || ct.startsWith("audio/"))) {
      console.log("✅ Anexo detectado como áudio por content_type:", ct);
      return true;
    }
    // Alguns áudios .ts chegam como vídeo (WhatsApp/Chatwoot)
    if (ct === "video/vnd.dlna.mpeg-tts" || ct === "video/mp2t") {
      console.log("✅ Tratando content_type de vídeo TS como áudio:", ct);
      return true;
    }
    // Application/octet-stream pode ser áudio
    if (ct === "application/octet-stream") {
      console.log("⚠️ Content-type genérico, verificando extensão:", url);
      return this.isAudioUrlByExtension(url);
    }
    
    // Verifica extensão da URL
    const isAudioByUrl = this.isAudioUrlByExtension(url);
    if (isAudioByUrl) {
      console.log("✅ Anexo detectado como áudio por extensão da URL:", url);
    }
    
    return isAudioByUrl;
  }

  private static isImageAttachment(att: Attachment): boolean {
    const ct = (att?.content_type || att?.file_type || "").toLowerCase();
    return !!ct && (ct === "image" || ct.startsWith("image/"));
  }

  static async processAttachments(
    attachments: Attachment[],
    supabase: any,
    supabaseKey: string,
    chatwootApiKey?: string | null
  ): Promise<ProcessedAttachment[]> {
    const processed: ProcessedAttachment[] = [];

    console.log("🔄 Processando anexos:", { total: attachments.length });
    console.log("📋 Lista completa de anexos recebidos:", JSON.stringify(attachments, null, 2));

    for (const att of attachments) {
      let url = this.attachmentUrl(att);
      if (!url) {
        console.log("⚠️ Anexo sem URL, ignorando:", att);
        continue;
      }

      const name = url.split("/").pop() || `anexo-${att?.id || ""}`;
      const contentType = att?.content_type || att?.file_type || null;
      const isAudio = this.isAudioAttachment(att);
      const isImage = this.isImageAttachment(att);

      console.log("📎 Processando anexo:", {
        id: att?.id,
        url,
        content_type: contentType,
        file_type: att?.file_type,
        filename: att?.filename,
        isAudio,
        isImage
      });

      if (isAudio) {
        console.log("🎵 ÁUDIO DETECTADO! Iniciando transcrição...");
        let transcript: string | undefined = undefined;
        try {
          console.log("📞 Invocando transcribe-audio", {
            url,
            content_type: contentType,
            chatwoot_api_key: chatwootApiKey ? "present" : "absent"
          });
          
          const { data, error } = await supabase.functions.invoke("transcribe-audio", {
            body: {
              url,
              content_type: contentType,
              chatwoot_api_key: chatwootApiKey || null,
            },
            headers: { Authorization: `Bearer ${supabaseKey}` },
          });
          
          console.log("📝 Resposta da transcrição:", { data, error });
          
          if (error) {
            console.error("❌ Erro na transcrição:", error);
          } else if (data?.transcript) {
            transcript = data.transcript;
            console.log("✅ Transcrição concluída:", transcript.substring(0, 100) + "...");
          } else {
            console.log("⚠️ Transcrição retornou vazia - data:", data);
          }
        } catch (err) {
          console.error("❌ Transcrição falhou com exceção:", err);
        }
        
        // Apenas áudio é retornado; não processar imagens/arquivos
        processed.push({
          type: "audio",
          name,
          url,
          content_type: contentType,
          transcript
        });
      } else {
        console.log("ℹ️ Anexo não é áudio, ignorando:", { type: isImage ? "image" : "file", url });
      }
    }

    console.log("✅ Processamento de anexos concluído:", {
      total: processed.length,
      audios: processed.filter(p => p.type === "audio").length,
      images: processed.filter(p => p.type === "image").length,
      files: processed.filter(p => p.type === "file").length
    });

    return processed;
  }
}

// Message Builder
class MessageBuilder {
  static buildSender(senderType?: string, messageType?: string): { label: string; role: "agent" | "contact" } {
    const isAgent = senderType === "User" || messageType === "outgoing";
    const label = isAgent ? "🧑‍💼 Atendente" : "👤 Cliente";
    const role = isAgent ? "agent" : "contact";
    return { label, role };
  }

  static renderDescriptionFromLog(log: ChatMessage[]): string {
    const lines: string[] = [];
    for (const m of log) {
      const base = `[${TextUtils.formatTimestamp(m.timestamp)}] ${m.sender_label} ${m.sender_name}: ${m.content || ""}`.trim();
      if (base) lines.push(base);
      
      if (m.attachments && m.attachments.length > 0) {
        for (const a of m.attachments) {
          if (a.type === "audio") {
            const audioLine = `[Áudio] ${a.name}${a.transcript ? ` — Transcrição: ${a.transcript}` : ""} (${a.url})`;
            lines.push(audioLine);
          } else if (a.type === "image") {
            const imgLine = `[Imagem] ${a.name} (${a.url})`;
            lines.push(imgLine);
          } else {
            const fileLine = `[Arquivo] ${a.name} (${a.content_type || "desconhecido"}) (${a.url})`;
            lines.push(fileLine);
          }
        }
      }
    }
    return lines.join("\n");
  }

  static createChatMessage(
    messageId: string | undefined,
    timestamp: string,
    senderLabel: string,
    senderRole: "agent" | "contact",
    senderName: string,
    content: string,
    attachments: ProcessedAttachment[]
  ): ChatMessage {
    return {
      id: messageId,
      timestamp,
      sender_label: senderLabel,
      sender_role: senderRole,
      sender_name: senderName,
      content,
      attachments,
    };
  }
}

// Card Manager
class CardManager {
  static async findExistingCard(supabase: any, conversationId: number): Promise<any> {
    const { data } = await supabase
      .from("cards")
      .select("id, description, priority, assignee, chatwoot_contact_name, chatwoot_contact_email, chatwoot_agent_name, updated_at, completion_type, customer_profile_id, custom_fields_data")
      .eq("chatwoot_conversation_id", conversationId.toString())
      .is("completion_type", null)
      .maybeSingle();
    return data;
  }

  static async updateCard(supabase: any, cardId: string, updateData: any): Promise<{ error?: any }> {
    return await supabase.from("cards").update(updateData).eq("id", cardId);
  }

  static async createCard(supabase: any, cardData: any): Promise<{ data?: any; error?: any }> {
    return await supabase.from("cards").insert(cardData).select().single();
  }

  static async getCustomerProfileId(supabase: any, conversationId: number): Promise<string | null> {
    const { data } = await supabase
      .from("cards")
      .select("customer_profile_id")
      .eq("chatwoot_conversation_id", conversationId.toString())
      .not("completion_type", "is", null)
      .maybeSingle();
    return data?.customer_profile_id || null;
  }

  static async incrementCustomerStats(supabase: any, profileId: string): Promise<void> {
    await supabase.rpc("increment_customer_stat", { profile_id: profileId, stat_field: "total_interactions" });
    await supabase.from("customer_profiles").update({ last_contact_at: new Date().toISOString() }).eq("id", profileId);
  }
}

// Webhook Handler
class WebhookHandler {
  private supabase: any;
  private supabaseKey: string;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.supabaseKey = supabaseKey;
  }

  private async validateIntegration(accountId: string): Promise<IntegrationCheck | null> {
    const { data: integrationCheck, error } = await this.supabase
      .from("chatwoot_integrations")
      .select("active, account_id, chatwoot_api_key, chatwoot_url, inbox_id, pipeline_id, pipelines(id, columns(id, name, position))")
      .eq("account_id", String(accountId))
      .maybeSingle();

    if (error || !integrationCheck) {
      console.error("Erro checando integração:", error);
      return null;
    }

    return integrationCheck as IntegrationCheck;
  }

  private shouldIgnoreMessage(webhook: any): boolean {
    const { event, message, private: isPrivate } = webhook;
    
    if (["message_created", "message_updated"].includes(event) && (message?.private ?? isPrivate) === true) {
      return true;
    }

    const effectiveSender = message?.sender ?? webhook.sender;
    if (["message_created", "message_updated"].includes(event) && effectiveSender?.type === "captain_assistant") {
      return true;
    }

    return false;
  }

  private shouldIgnoreConversation(integration: IntegrationCheck, conversation: any): boolean {
    const conversationInboxId = conversation?.inbox_id?.toString();
    
    if (conversationInboxId) {
      const allowedInboxIds = (integration.inbox_id || "")
        .split(",")
        .map((id: string) => id.trim())
        .filter((id: string) => !!id);
      if (allowedInboxIds.length > 0 && !allowedInboxIds.includes(conversationInboxId)) {
        return true;
      }
    } else if (integration.inbox_id) {
      return true;
    }

    return false;
  }

  private async triggerAIAnalysis(cardId: string): Promise<void> {
    try {
      await this.supabase.functions.invoke("analyze-conversation", {
        body: { cardId },
        headers: { Authorization: `Bearer ${this.supabaseKey}` },
      });
    } catch (err) {
      console.error("Falha ao disparar análise de IA:", err);
    }
  }

  private async fetchAttachments(
    integration: IntegrationCheck,
    conversation: any,
    message: any,
    baseAttachments: any[]
  ): Promise<Attachment[]> {
    console.log("🔍 Iniciando busca de anexos...");
    console.log("📎 Anexos base recebidos:", JSON.stringify(baseAttachments, null, 2));
    console.log("📝 Message object:", JSON.stringify(message, null, 2));
    console.log("💬 Conversation object:", JSON.stringify(conversation, null, 2));
    
    const chatwootClient = new ChatwootAPIClient(integration.chatwoot_api_key, integration.chatwoot_url);
    let attachments: Attachment[] = [];

    // PRIMEIRO: Tenta usar os anexos base do webhook (mais confiável)
    if (baseAttachments && baseAttachments.length > 0) {
      console.log("🔄 Usando anexos base do webhook (primeira tentativa)");
      attachments = baseAttachments.map((att: any) => {
        const rawUrl = att?.data_url || att?.download_url || att?.url || att?.file_url || undefined;
        console.log("🔗 Processando anexo base:", {
          id: att?.id,
          rawUrl,
          content_type: att?.content_type,
          file_type: att?.file_type,
          filename: att?.filename
        });
        return {
          id: att?.id,
          url: rawUrl ? TextUtils.normalizeUrl(rawUrl, integration.chatwoot_url) : undefined,
          content_type: att?.content_type || null,
          file_type: att?.file_type || null,
          filename: att?.filename || null,
        };
      }).filter((a: Attachment) => !!a.url);
      
      console.log("✅ Anexos base processados:", attachments.length);
      if (attachments.length > 0) {
        return attachments;
      }
    }

    // SEGUNDO: Tenta buscar da API se temos conversationId e messageId
    if (conversation?.id && message?.id) {
      try {
        console.log("🔄 Buscando anexos via API do Chatwoot...");
        attachments = await chatwootClient.getMessageAttachments(
          String(integration.account_id),
          conversation.id,
          message.id
        );
        
        if (attachments.length > 0) {
          console.log("✅ Anexos encontrados via API:", attachments.length);
          return attachments;
        }
      } catch (e) {
        console.error("❌ Falha ao buscar anexos da mensagem:", e);
      }
    }

    // TERCEIRO: Fallback: busca no histórico da conversa
    if (attachments.length === 0 && conversation?.id) {
      try {
        console.log("🔄 Fallback: buscando anexos no histórico da conversa...");
        attachments = await chatwootClient.getConversationMessageAttachments(
          String(integration.account_id),
          conversation.id
        );
        
        if (attachments.length > 0) {
          console.log("✅ Anexos encontrados via histórico:", attachments.length);
          return attachments;
        }
      } catch (e) {
        console.error("❌ Falha ao buscar anexos do histórico:", e);
      }
    }

    console.log("📊 Total de anexos encontrados:", attachments.length);
    return attachments;
  }

  private async handleExistingCard(
    webhook: any,
    integration: IntegrationCheck,
    existingCard: any
  ): Promise<Response> {
    const { event, conversation, message, message_type, content: rawContent, sender } = webhook;
    
    if (event === "conversation_updated") {
      const updateData: any = {
        assignee: conversation?.assignee?.name || existingCard.assignee,
        chatwoot_contact_name: conversation?.meta?.sender?.name || existingCard.chatwoot_contact_name,
        chatwoot_contact_email: conversation?.meta?.sender?.email || existingCard.chatwoot_contact_email,
        updated_at: new Date().toISOString(),
      };
      if (conversation?.assignee?.name) updateData.chatwoot_agent_name = conversation.assignee.name;

      const { error } = await CardManager.updateCard(this.supabase, existingCard.id, updateData);
      if (error) {
        console.error("Erro atualizando metadados da conversa:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ message: "Metadados atualizados", cardId: existingCard.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (event === "message_updated" && !existingCard) {
      return new Response(JSON.stringify({ message: "Update ignorado sem card existente" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Process message
    const effectiveSender = message?.sender ?? sender;
    const derivedMessageType = message?.message_type || message_type;
    const contentText = TextUtils.htmlToText(message?.content ?? rawContent);
    const chatSender = MessageBuilder.buildSender(effectiveSender?.type, derivedMessageType);
    const timestamp = TextUtils.normalizeTimestamp(message?.created_at ?? conversation?.created_at ?? null);
    const messageId = message?.id?.toString();

    // Fetch attachments
    const baseAttachments = (message?.attachments || []) as any[];
    const fetchedAttachments = await this.fetchAttachments(integration, conversation, message, baseAttachments);

    console.log("📊 Anexos para processamento:", {
      baseCount: baseAttachments.length,
      fetchedCount: fetchedAttachments.length,
      total: fetchedAttachments.length,
    });

    // Process attachments
    const processedAttachments = await AttachmentProcessor.processAttachments(
      fetchedAttachments,
      this.supabase,
      this.supabaseKey,
      integration.chatwoot_api_key
    );

    // Update message log
    const existingLog = (existingCard?.custom_fields_data?.chatwoot_messages as ChatMessage[]) || [];
    const processedMessageIds = new Set((existingCard?.custom_fields_data?.chatwoot_msg_ids as string[]) || []);
    const alreadyHasMessage = messageId ? processedMessageIds.has(messageId) : false;

    let newLog = [...existingLog];
    const chatMessage = MessageBuilder.createChatMessage(
      messageId,
      timestamp,
      chatSender.label,
      chatSender.role,
      effectiveSender?.name || (chatSender.role === "agent" ? "Atendente" : "Cliente"),
      contentText,
      processedAttachments
    );

    if (event === "message_updated" && alreadyHasMessage) {
      newLog = newLog.map((m) => (m.id === messageId ? chatMessage : m));
    } else if (!alreadyHasMessage) {
      newLog.push(chatMessage);
      if (messageId) {
        processedMessageIds.add(messageId);
      }
    }

    newLog.sort((a, b) => {
      const ta = new Date(a.timestamp).getTime();
      const tb = new Date(b.timestamp).getTime();
      return ta - tb;
    });

    const description = MessageBuilder.renderDescriptionFromLog(newLog);
    const priority = TextUtils.computePriority(description);

    const updateData: any = {
      description,
      priority,
      assignee: conversation?.assignee?.name || existingCard.assignee,
      updated_at: new Date().toISOString(),
      custom_fields_data: {
        ...(existingCard.custom_fields_data || {}),
        chatwoot_messages: newLog,
        chatwoot_msg_ids: Array.from(processedMessageIds),
      },
    };
    if (chatSender.role === "agent" && effectiveSender?.name) updateData.chatwoot_agent_name = effectiveSender.name;

    const { error } = await CardManager.updateCard(this.supabase, existingCard.id, updateData);
    if (error) {
      console.error("Erro atualizando card:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    this.triggerAIAnalysis(existingCard.id).catch(() => {});
    return new Response(JSON.stringify({ message: `Card atualizado (${event})`, cardId: existingCard.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  private async handleNewCard(
    webhook: any,
    integration: IntegrationCheck
  ): Promise<Response> {
    const { conversation, message, message_type, content: rawContent, sender } = webhook;
    
    // Get customer profile if exists
    let customerProfileId: string | null = null;
    if (conversation?.id) {
      customerProfileId = await CardManager.getCustomerProfileId(this.supabase, conversation.id);
      if (customerProfileId) {
        await CardManager.incrementCustomerStats(this.supabase, customerProfileId);
      }
    }

    // Find first column
    const firstColumn =
      integration.pipelines.columns.find((col) => col.name === "Novo Contato") ||
      integration.pipelines.columns.sort((a, b) => a.position - b.position)[0];

    if (!firstColumn) {
      return new Response(JSON.stringify({ error: "Sem colunas configuradas" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Process message data
    const effectiveSender = message?.sender ?? sender;
    const derivedMessageType = message?.message_type || message_type;
    const contentText = TextUtils.htmlToText(message?.content ?? rawContent);
    const chatSender = MessageBuilder.buildSender(effectiveSender?.type, derivedMessageType);
    const timestamp = TextUtils.normalizeTimestamp(message?.created_at ?? conversation?.created_at ?? null);
    const messageId = message?.id?.toString();

    // Fetch and process attachments
    const baseAttachments = (message?.attachments || []) as any[];
    const fetchedAttachments = await this.fetchAttachments(integration, conversation, message, baseAttachments);

    const processedAttachments = await AttachmentProcessor.processAttachments(
      fetchedAttachments,
      this.supabase,
      this.supabaseKey,
      integration.chatwoot_api_key
    );

    // Create initial message
    const initialMessage = MessageBuilder.createChatMessage(
      messageId,
      timestamp,
      chatSender.label,
      chatSender.role,
      effectiveSender?.name || (chatSender.role === "agent" ? "Atendente" : "Cliente"),
      contentText || "Nova conversa iniciada",
      processedAttachments
    );

    const initialLog = [initialMessage];
    const description = MessageBuilder.renderDescriptionFromLog(initialLog);
    const priority = TextUtils.computePriority(description);

    // Create card
    const cardData: any = {
      column_id: firstColumn.id,
      title: `${(effectiveSender?.name || "Cliente")} - ${conversation?.inbox?.name || "Nova conversa"}`,
      description,
      priority,
      assignee: conversation?.assignee?.name,
      ai_suggested: true,
      chatwoot_conversation_id: conversation?.id?.toString(),
      chatwoot_contact_name: sender?.name,
      chatwoot_contact_email: sender?.email,
      inbox_name: conversation?.inbox?.name,
      position: 0,
      customer_profile_id: customerProfileId,
      custom_fields_data: {
        chatwoot_messages: initialLog,
        chatwoot_msg_ids: messageId ? [messageId] : [],
      },
    };
    if (conversation?.assignee?.name) cardData.chatwoot_agent_name = conversation.assignee.name;

    const { data: card, error } = await CardManager.createCard(this.supabase, cardData);
    if (error) {
      console.error("Erro criando card:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (card?.id) {
      this.triggerAIAnalysis(card.id).catch(() => {});
    }
    return new Response(JSON.stringify({ message: "Card criado com sucesso", card }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  async handleRequest(req: Request): Promise<Response> {
    try {
      const rawWebhook = await req.json();
      console.log("📨 Webhook recebido - Evento:", rawWebhook.event);
      console.log("📨 Webhook recebido - Message:", JSON.stringify(rawWebhook.message, null, 2));
      console.log("📨 Webhook recebido - Conversation:", JSON.stringify(rawWebhook.conversation, null, 2));
      
      const webhook = ChatwootWebhookSchema.parse(rawWebhook);
      const { event, conversation, account } = webhook;

      // Early validation
      if (this.shouldIgnoreMessage(webhook)) {
        return new Response(JSON.stringify({ message: "Mensagem ignorada" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const accountId = account?.id || conversation?.id;
      if (!accountId) {
        return new Response(JSON.stringify({ error: "Sem account_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate integration
      const integration = await this.validateIntegration(String(accountId));
      if (!integration) {
        return new Response(JSON.stringify({ message: "Sem integração para esta conta" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!integration.active) {
        return new Response(JSON.stringify({ message: "Integração pausada" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (this.shouldIgnoreConversation(integration, conversation)) {
        return new Response(JSON.stringify({ message: "Conversa ignorada por filtro" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check for existing card
      let existingCard = null;
      if (["message_created", "message_updated", "conversation_updated"].includes(event) && conversation?.id) {
        existingCard = await CardManager.findExistingCard(this.supabase, conversation.id);
      }

      // Route to appropriate handler
      if (existingCard) {
        return await this.handleExistingCard(webhook, integration, existingCard);
      } else {
        return await this.handleNewCard(webhook, integration);
      }

    } catch (error: any) {
      console.error("❌ Erro processando webhook:", error);
      return new Response(JSON.stringify({ error: error?.message || "Erro desconhecido" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }
}

// Main handler
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  const handler = new WebhookHandler(supabaseUrl, supabaseKey);
  return await handler.handleRequest(req);
});