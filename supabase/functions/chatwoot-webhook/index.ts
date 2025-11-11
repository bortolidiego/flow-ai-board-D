/* eslint-disable */
// @ts-nocheck

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    type: z.string().max(50).optional(), // "User" | "Contact" | ...
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

// Conversão simples de HTML em texto seguro preservando quebras de linha e links
function htmlToText(input: string | undefined): string {
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

function normalizeTimestamp(ts?: string | number | null): string {
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

function formatTimestamp(ts?: string | number | null) {
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

function buildSender(senderType?: string, messageType?: string) {
  const isAgent = senderType === "User" || messageType === "outgoing";
  const label = isAgent ? "🧑‍💼 Atendente" : "👤 Cliente";
  const role = isAgent ? "agent" : "contact";
  return { label, role };
}

function attachmentUrl(att: any): string | undefined {
  return att?.data_url || att?.download_url || att?.url || att?.file_url || undefined;
}

function isAudioUrlByExtension(url?: string | null): boolean {
  if (!url) return false;
  try {
    const lower = url.toLowerCase();
    return [
      ".mp3", ".ogg", ".wav", ".m4a", ".aac", ".flac", ".webm", ".amr",
      ".mp4", ".ts", ".3gp"
    ].some((ext) => lower.includes(ext));
  } catch {
    return false;
  }
}

function isAudioAttachment(att: any): boolean {
  const ct = (att?.content_type || att?.file_type || "").toLowerCase();
  if (!!ct) {
    if (ct === "audio" || ct.startsWith("audio/")) return true;
    if (ct.startsWith("video/")) {
      const allowedVideoForTranscription = [
        "video/vnd.dlna.mpeg-tts",
        "video/mp4",
        "video/3gpp",
        "video/webm",
        "video/ogg",
      ];
      if (allowedVideoForTranscription.includes(ct)) return true;
    }
  }
  const url = attachmentUrl(att);
  return isAudioUrlByExtension(url);
}

function isImageAttachment(att: any): boolean {
  const ct = (att?.content_type || att?.file_type || "").toLowerCase();
  return !!ct && (ct === "image" || ct.startsWith("image/"));
}

function isFileAttachment(att: any): boolean {
  const ct = (att?.content_type || att?.file_type || "").toLowerCase();
  const isAudio = !!ct && (ct === "audio" || ct.startsWith("audio/"));
  const isImage = !!ct && (ct === "image" || ct.startsWith("image/"));
  return !!ct && !(isAudio || isImage);
}

// Extrai URLs do conteúdo (HTML/texto) para capturar áudios que não vêm em attachments
function extractUrlsFromContent(raw?: string | null, text?: string | null): string[] {
  const urls = new Set<string>();
  const pushMatches = (s?: string | null) => {
    if (!s) return;
    try {
      // 1) URLs absolutas http/https
      const absoluteRegex = /https?:\/\/[^\s)"']+/g;
      const absMatches = s.match(absoluteRegex) || [];
      absMatches.forEach((u) => urls.add(u));

      // 2) href/src de tags com valores absolutos ou relativos
      const attrRegex = /(href|src)\s*=\s*["']([^"']+)["']/gi;
      let m: RegExpExecArray | null;
      while ((m = attrRegex.exec(s)) !== null) {
        const val = m[2];
        if (val.startsWith("blob:")) continue;
        urls.add(val);
      }
    } catch {}
  };
  pushMatches(raw);
  pushMatches(text);
  return Array.from(urls);
}

// Normaliza URL relativa usando base (chatwoot_url)
function normalizeUrl(u: string, base?: string | null): string {
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

function renderDescriptionFromLog(log: any[]): string {
  const lines: string[] = [];
  for (const m of log) {
    const base = `[${formatTimestamp(m.timestamp)}] ${m.sender_label} ${m.sender_name}: ${m.content || ""}`.trim();
    if (base) lines.push(base);
    if (m.attachments && m.attachments.length > 0) {
      for (const a of m.attachments) {
        if (a.type === "audio") {
          const audioLine = `[Áudio] ${a.name || "arquivo"}${a.transcript ? ` — Transcrição: ${a.transcript}` : ""}${a.url ? ` (${a.url})` : ""}`;
          lines.push(audioLine);
        } else if (a.type === "image") {
          const imgLine = `[Imagem] ${a.name || "arquivo"}${a.url ? ` (${a.url})` : ""}`;
          lines.push(imgLine);
        } else {
          const fileLine = `[Arquivo] ${a.name || "arquivo"} (${a.content_type || "desconhecido"})${a.url ? ` (${a.url})` : ""}`;
          lines.push(fileLine);
        }
      }
    }
  }
  return lines.join("\n");
}

function computePriority(allText: string): "low" | "medium" | "high" {
  const s = (allText || "").toLowerCase();
  if (s.includes("urgente") || s.includes("emergência")) return "high";
  if (s.includes("dúvida") || s.includes("informação")) return "low";
  return "medium";
}

// Helper: tenta múltiplas formas de autenticar contra o Chatwoot
async function chatwootFetchJson(endpoint: string, apiKey: string | null) {
  if (!apiKey) return { ok: false, status: 401, json: null };
  const baseHeaders: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'Supabase-Edge-Function/1.0'
  };

  const strategies = [
    { endpoint, headers: { ...baseHeaders, 'api_access_token': apiKey! }, label: 'api_access_token header' },
    { endpoint, headers: { ...baseHeaders, 'Authorization': `Bearer ${apiKey}` }, label: 'Authorization: Bearer' },
    { endpoint, headers: { ...baseHeaders, 'Api-Access-Token': apiKey! }, label: 'Api-Access-Token header' },
    { endpoint: endpoint + (endpoint.includes('?') ? '&' : '?') + 'api_access_token=' + encodeURIComponent(apiKey!), headers: baseHeaders, label: 'api_access_token query' },
  ];

  for (const s of strategies) {
    try {
      const res = await fetch(s.endpoint, { headers: s.headers });
      if (res.ok) {
        const json = await res.json().catch(() => null);
        if (json === null) {
          console.error("Chatwoot retornou resposta não JSON para", s.label);
        } else {
          console.log("Chatwoot OK via", s.label);
        }
        return { ok: true, status: res.status, json };
      } else {
        const text = await res.text().catch(() => "");
        console.error("Chatwoot falhou", { url: s.endpoint, label: s.label, status: res.status, body: text?.slice(0, 500) });
      }
    } catch (e) {
      console.error("Erro na tentativa de autenticação Chatwoot", { label: s.label, error: String(e) });
    }
  }

  return { ok: false, status: 401, json: null };
}

// Busca anexos de uma mensagem na API do Chatwoot para obter URLs válidas
async function fetchChatwootMessageAttachments(
  chatwootUrl: string,
  apiKey: string | null,
  accountId: string | number,
  conversationId: number,
  messageId?: number
): Promise<any[]> {
  if (!chatwootUrl || !apiKey || !accountId || !conversationId || !messageId) return [];
  const endpoint = `${chatwootUrl}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages/${messageId}`;
  console.log("Consultando Chatwoot para anexos da mensagem", { endpoint });
  const result = await chatwootFetchJson(endpoint, apiKey);
  if (!result.ok) return [];
  const msg = result.json;
  const rawAttachments = Array.isArray(msg?.attachments) ? msg.attachments : [];
  const normalized = rawAttachments.map((att: any) => {
    const rawUrl = att?.data_url || att?.download_url || att?.url || att?.file_url || undefined;
    return {
      id: att?.id,
      url: rawUrl ? normalizeUrl(rawUrl, chatwootUrl) : undefined,
      content_type: att?.content_type || null,
      file_type: att?.file_type || null,
      filename: att?.filename || null,
    };
  }).filter((a: any) => !!a.url);
  console.log("Anexos obtidos via Chatwoot API", { count: normalized.length });
  return normalized;
}

// Fallback: buscar mensagens da conversa e coletar anexos do último item com anexos
async function fetchChatwootConversationMessageAttachments(
  chatwootUrl: string,
  apiKey: string | null,
  accountId: string | number,
  conversationId: number
): Promise<any[]> {
  if (!chatwootUrl || !apiKey || !accountId || !conversationId) return [];
  const endpoint = `${chatwootUrl}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`;
  console.log("Consultando Chatwoot mensagens da conversa para anexos", { endpoint });
  const result = await chatwootFetchJson(endpoint, apiKey);
  if (!result.ok) {
    console.error("Falha ao obter mensagens via Chatwoot API", { status: result.status });
    return [];
  }
  const msgs = result.json;
  if (!Array.isArray(msgs)) return [];
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i];
    const rawAttachments = Array.isArray(m?.attachments) ? m.attachments : [];
    const normalized = rawAttachments.map((att: any) => {
      const rawUrl = att?.data_url || att?.download_url || att?.url || att?.file_url || undefined;
      return {
        id: att?.id,
        url: rawUrl ? normalizeUrl(rawUrl, chatwootUrl) : undefined,
        content_type: att?.content_type || null,
        file_type: att?.file_type || null,
        filename: att?.filename || null,
      };
    }).filter((a: any) => !!a.url);
    if (normalized.length > 0) {
      console.log("Anexos obtidos via histórico da conversa", { count: normalized.length });
      return normalized;
    }
  }
  return [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const rawWebhook = await req.json();
    const webhook = ChatwootWebhookSchema.parse(rawWebhook);
    const { event, conversation, message, message_type, content: rawContent, sender, account } = webhook;

    if (["message_created", "message_updated"].includes(event) && (message?.private ?? webhook.private) === true) {
      return new Response(JSON.stringify({ message: "Mensagem privada ignorada" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const effectiveSender = message?.sender ?? sender;
    if (["message_created", "message_updated"].includes(event) && effectiveSender?.type === "captain_assistant") {
      return new Response(JSON.stringify({ message: "Mensagem de bot ignorada" }), {
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

    const { data: integrationCheck, error: integrationError } = await supabase
      .from("chatwoot_integrations")
      .select("active, account_id, chatwoot_api_key, chatwoot_url, inbox_id, pipeline_id, pipelines(id, columns(id, name, position))")
      .eq("account_id", String(accountId))
      .maybeSingle();

    if (integrationError) {
      console.error("Erro checando integração:", integrationError);
      return new Response(JSON.stringify({ error: "Falha ao checar integração" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!integrationCheck) {
      return new Response(JSON.stringify({ message: "Sem integração para esta conta" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!integrationCheck.active) {
      return new Response(JSON.stringify({ message: "Integração pausada" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const conversationInboxId = conversation?.inbox_id?.toString();
    if (conversationInboxId) {
      const allowedInboxIds = (integrationCheck.inbox_id || "")
        .split(",")
        .map((id: string) => id.trim())
        .filter((id: string) => !!id);
      if (allowedInboxIds.length > 0 && !allowedInboxIds.includes(conversationInboxId)) {
        return new Response(JSON.stringify({ message: "Conversa ignorada por filtro de inbox", received_inbox: conversationInboxId }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (integrationCheck.inbox_id) {
      return new Response(JSON.stringify({ message: "Conversa ignorada por falta de inbox_id" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let existingCard: any = null;
    if (["message_created", "message_updated", "conversation_updated"].includes(event) && conversation?.id) {
      const result = await supabase
        .from("cards")
        .select("id, description, priority, assignee, chatwoot_contact_name, chatwoot_contact_email, chatwoot_agent_name, updated_at, completion_type, customer_profile_id, custom_fields_data")
        .eq("chatwoot_conversation_id", conversation.id.toString())
        .is("completion_type", null)
        .maybeSingle();
      existingCard = result.data;
    }

    if (existingCard && event === "conversation_updated") {
      const updateData: any = {
        assignee: conversation?.assignee?.name || existingCard.assignee,
        chatwoot_contact_name: conversation?.meta?.sender?.name || existingCard.chatwoot_contact_name,
        chatwoot_contact_email: conversation?.meta?.sender?.email || existingCard.chatwoot_contact_email,
        updated_at: new Date().toISOString(),
      };
      if (conversation?.assignee?.name) updateData.chatwoot_agent_name = conversation.assignee.name;

      const { error: updateError } = await supabase.from("cards").update(updateData).eq("id", existingCard.id);
      if (updateError) {
        console.error("Erro atualizando metadados da conversa:", updateError);
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ message: "Metadados atualizados", cardId: existingCard.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const triggerAIAnalysis = async (cardId: string) => {
      try {
        await supabase.functions.invoke("analyze-conversation", {
          body: { cardId },
          headers: { Authorization: `Bearer ${supabaseKey}` },
        });
      } catch (err) {
        console.error("Falha ao disparar análise de IA:", err);
      }
    };

    const derivedMessageType = message?.message_type || message_type;
    const contentText = htmlToText(message?.content ?? rawContent);
    const chatSender = buildSender(effectiveSender?.type, derivedMessageType);
    const timestamp = normalizeTimestamp(message?.created_at ?? conversation?.created_at ?? null);
    const messageId = message?.id?.toString();

    const baseAttachments = (message?.attachments || []) as any[];
    const contentUrlsRaw = extractUrlsFromContent(message?.content ?? rawContent, contentText);
    const contentUrls = contentUrlsRaw.map((u) => normalizeUrl(u, integrationCheck?.chatwoot_url));

    let fetchedAttachments: any[] = [];
    if (
      ((baseAttachments || []).length === 0 || (baseAttachments || []).some((a: any) => !attachmentUrl(a))) &&
      integrationCheck?.chatwoot_url && integrationCheck?.chatwoot_api_key && integrationCheck?.account_id &&
      conversation?.id && message?.id
    ) {
      try {
        fetchedAttachments = await fetchChatwootMessageAttachments(
          integrationCheck.chatwoot_url,
          integrationCheck.chatwoot_api_key,
          String(integrationCheck.account_id),
          conversation.id,
          message.id
        );
      } catch (e) {
        console.error("Falha no fallback de anexos pela API do Chatwoot (por messageId):", e);
      }
    }

    let fetchedConversationAttachments: any[] = [];
    if (
      (baseAttachments.length === 0) &&
      (fetchedAttachments.length === 0) &&
      (contentUrls.length === 0) &&
      integrationCheck?.chatwoot_url && integrationCheck?.chatwoot_api_key && integrationCheck?.account_id &&
      conversation?.id
    ) {
      try {
        fetchedConversationAttachments = await fetchChatwootConversationMessageAttachments(
          integrationCheck.chatwoot_url,
          integrationCheck.chatwoot_api_key,
          String(integrationCheck.account_id),
          conversation.id
        );
      } catch (e) {
        console.error("Falha no fallback de anexos pela API do Chatwoot (histórico da conversa):", e);
      }
    }

    const attachments = [
      ...(fetchedAttachments.length > 0 ? fetchedAttachments : baseAttachments),
      ...(fetchedConversationAttachments.length > 0 ? fetchedConversationAttachments : []),
      ...contentUrls.map((u) => ({ url: u, content_type: null, file_type: null })),
    ] as any[];

    console.log("Anexos detectados para processamento", {
      baseCount: baseAttachments.length,
      fetchedCount: fetchedAttachments.length,
      fetchedConversationCount: fetchedConversationAttachments.length,
      contentUrlCount: contentUrls.length,
      total: (attachments || []).length,
    });

    const existingLog = (existingCard?.custom_fields_data?.chatwoot_messages as any[]) || [];
    const processedMessageIds = new Set((existingCard?.custom_fields_data?.chatwoot_msg_ids as string[]) || []);
    const alreadyHasMessage = messageId ? processedMessageIds.has(messageId) : false;

    if (!existingCard && event === "message_updated") {
      return new Response(JSON.stringify({ message: "Update ignorado sem card existente" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (existingCard) {
      let newLog = [...existingLog];

      const attachmentEntries: any[] = [];
      for (const att of attachments) {
        let url = attachmentUrl(att);
        url = normalizeUrl(url || "", integrationCheck?.chatwoot_url);
        const name = (url || "").split("/").pop() || `anexo-${att?.id || ""}`;
        if (!url) continue;

        console.log("Processando anexo (update)", {
          url,
          content_type: att?.content_type || null,
          file_type: att?.file_type || null,
        });

        if (isAudioAttachment(att)) {
          let transcript: string | undefined = undefined;
          try {
            console.log("Invocando transcribe-audio (update)", {
              url,
              content_type: att?.content_type || att?.file_type || null,
            });
            const { data, error } = await supabase.functions.invoke("transcribe-audio", {
              body: {
                url,
                content_type: att?.content_type || att?.file_type || null,
                chatwoot_api_key: integrationCheck?.chatwoot_api_key || null,
              },
              headers: { Authorization: `Bearer ${supabaseKey}` },
            });
            if (!error && data?.transcript) transcript = data.transcript;
          } catch (err) {
            console.error("Transcrição falhou (update):", err);
          }
          attachmentEntries.push({ type: "audio", name, url, content_type: att?.content_type || null, transcript });
        } else if (isImageAttachment(att)) {
          attachmentEntries.push({ type: "image", name, url, content_type: att?.content_type || null });
        } else if (isFileAttachment(att)) {
          attachmentEntries.push({ type: "file", name, url, content_type: att?.content_type || null });
        } else {
          attachmentEntries.push({ type: "file", name, url, content_type: att?.content_type || att?.file_type || null });
        }
      }

      const entry = {
        id: messageId,
        timestamp,
        sender_label: chatSender.label,
        sender_role: chatSender.role,
        sender_name: effectiveSender?.name || (chatSender.role === "agent" ? "Atendente" : "Cliente"),
        content: contentText,
        attachments: attachmentEntries,
      };

      if (event === "message_updated" && alreadyHasMessage) {
        newLog = newLog.map((m) => (m.id === messageId ? entry : m));
      } else if (!alreadyHasMessage) {
        newLog.push(entry);
        if (messageId) {
          processedMessageIds.add(messageId);
        }
      }

      newLog.sort((a, b) => {
        const ta = new Date(a.timestamp).getTime();
        const tb = new Date(b.timestamp).getTime();
        return ta - tb;
      });

      const description = renderDescriptionFromLog(newLog);
      const priority = computePriority(description);

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

      const { error: updateError } = await supabase.from("cards").update(updateData).eq("id", existingCard.id);
      if (updateError) {
        console.error("Erro atualizando card:", updateError);
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      triggerAIAnalysis(existingCard.id).catch(() => {});
      return new Response(JSON.stringify({ message: `Card atualizado (${event})`, cardId: existingCard.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
        await supabase.rpc("increment_customer_stat", { profile_id: customerProfileId, stat_field: "total_interactions" });
        await supabase.from("customer_profiles").update({ last_contact_at: new Date().toISOString() }).eq("id", customerProfileId);
      }
    }

    const firstColumn =
      (integrationCheck as any).pipelines.columns.find((col: any) => col.name === "Novo Contato") ||
      (integrationCheck as any).pipelines.columns.sort((a: any, b: any) => a.position - b.position)[0];

    if (!firstColumn) {
      return new Response(JSON.stringify({ error: "Sem colunas configuradas" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const attachmentEntries: any[] = [];
    for (const att of attachments) {
      let url = attachmentUrl(att);
      url = normalizeUrl(url || "", integrationCheck?.chatwoot_url);
      const name = (url || "").split("/").pop() || `anexo-${att?.id || ""}`;
      if (!url) continue;

      console.log("Processando anexo (create)", {
        url,
        content_type: att?.content_type || null,
        file_type: att?.file_type || null,
      });

      if (isAudioAttachment(att)) {
        let transcript: string | undefined = undefined;
        try {
          console.log("Invocando transcribe-audio (create)", {
            url,
            content_type: att?.content_type || att?.file_type || null,
          });
          const { data, error } = await supabase.functions.invoke("transcribe-audio", {
            body: {
              url,
              content_type: att?.content_type || att?.file_type || null,
              chatwoot_api_key: integrationCheck?.chatwoot_api_key || null,
            },
            headers: { Authorization: `Bearer ${supabaseKey}` },
          });
          if (!error && data?.transcript) transcript = data.transcript;
        } catch (err) {
          console.error("Transcrição falhou (create):", err);
        }
        attachmentEntries.push({ type: "audio", name, url, content_type: att?.content_type || null, transcript });
      } else if (isImageAttachment(att)) {
        attachmentEntries.push({ type: "image", name, url, content_type: att?.content_type || null });
      } else if (isFileAttachment(att)) {
        attachmentEntries.push({ type: "file", name, url, content_type: att?.content_type || null });
      } else {
        attachmentEntries.push({ type: "file", name, url, content_type: att?.content_type || att?.file_type || null });
      }
    }

    const initialEntry = {
      id: messageId,
      timestamp,
      sender_label: chatSender.label,
      sender_role: chatSender.role,
      sender_name: effectiveSender?.name || (chatSender.role === "agent" ? "Atendente" : "Cliente"),
      content: contentText || "Nova conversa iniciada",
      attachments: attachmentEntries,
    };

    const initialLog = [initialEntry];
    const description = renderDescriptionFromLog(initialLog);
    const priority = computePriority(description);

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

    const { data: card, error } = await supabase.from("cards").insert(cardData).select().single();
    if (error) {
      console.error("Erro criando card:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (card?.id) {
      try { await triggerAIAnalysis(card.id); } catch {}
    }
    return new Response(JSON.stringify({ message: "Card criado com sucesso", card }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Erro processando webhook:", error);
    return new Response(JSON.stringify({ error: error?.message || "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});