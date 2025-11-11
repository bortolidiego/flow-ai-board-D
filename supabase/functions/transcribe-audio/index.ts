/* eslint-disable */
// @ts-nocheck

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type TranscribeRequest = {
  url: string;
  content_type?: string | null;
  chatwoot_api_key?: string | null;
};

// Normaliza content-type para Whisper
function normalizeContentType(ct?: string | null): string {
  const val = (ct || "").toLowerCase().trim();
  console.log("🔧 Normalizando content-type:", { original: ct, normalized: val });
  
  if (!val) return "audio/mpeg";
  if (val.startsWith("audio/") || val === "audio") return ct!;
  // Muitos áudios do WhatsApp/Chatwoot chegam como TS de vídeo
  if (val === "video/vnd.dlna.mpeg-tts" || val === "video/mp2t" || val === "video/mpeg" || val === "application/octet-stream") {
    console.log("✅ Convertendo content-type TS para audio/mpeg:", val);
    return "audio/mpeg";
  }
  // fallback seguro
  console.log("⚠️ Usando fallback audio/mpeg para content-type desconhecido:", val);
  return "audio/mpeg";
}

async function tryFetch(url: string, headers: Record<string, string>) {
  return await fetch(url, {
    headers,
    redirect: "follow",
  });
}

async function fetchAudio(url: string, apiKey?: string | null) {
  // Tentativas de autenticação para ActiveStorage do Chatwoot
  const baseHeaders: Record<string, string> = {
    Accept: "audio/*,application/octet-stream",
    "User-Agent": "Supabase-Edge-Transcriber/1.0",
  };

  const strategies: Array<{ url: string; headers: Record<string, string>; label: string }> = [];

  if (apiKey) {
    strategies.push({
      url,
      headers: { ...baseHeaders, "Api-Access-Token": apiKey },
      label: "Api-Access-Token header",
    });
    strategies.push({
      url,
      headers: { ...baseHeaders, api_access_token: apiKey },
      label: "api_access_token header (lowercase)",
    });
    strategies.push({
      url,
      headers: { ...baseHeaders, Authorization: `Bearer ${apiKey}` },
      label: "Authorization: Bearer",
    });
  }

  // Fallback sem cabeçalho
  strategies.push({
    url,
    headers: { ...baseHeaders },
    label: "no headers",
  });

  // Fallback com token na query
  if (apiKey) {
    try {
      const u = new URL(url);
      const hadToken = u.searchParams.has("api_access_token");
      if (!hadToken) {
        u.searchParams.set("api_access_token", apiKey);
      }
      strategies.push({
        url: u.toString(),
        headers: { ...baseHeaders },
        label: "api_access_token query",
      });
      // também tente com Api-Access-Token header junto com query, alguns setups exigem ambos
      strategies.push({
        url: u.toString(),
        headers: { ...baseHeaders, "Api-Access-Token": apiKey },
        label: "query + Api-Access-Token header",
      });
    } catch {
      // URL inválida, ignora fallback de query
    }
  }

  let lastErrorText = "";
  for (const strat of strategies) {
    try {
      const res = await tryFetch(strat.url, strat.headers);
      if (res.ok) {
        const contentType = res.headers.get("content-type") || "audio/mpeg";
        const buf = await res.arrayBuffer();
        console.log("✅ Audio baixado via", strat.label, "CT:", contentType);
        return { buf, contentType };
      } else {
        const t = await res.text().catch(() => "");
        lastErrorText = `status=${res.status} body=${t?.slice(0, 300) || ""}`;
        console.warn("❌ Falha ao baixar áudio via", strat.label, lastErrorText);
      }
    } catch (e) {
      lastErrorText = String(e);
      console.warn("❌ Erro de rede na tentativa", strat.label, lastErrorText);
    }
  }

  throw new Error(`Falha ao baixar áudio (${lastErrorText || "desconhecido"})`);
}

async function transcribeWithOpenAI(buf: ArrayBuffer, contentType: string) {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY não configurada");

  // Ajusta content-type para Whisper
  const ct = normalizeContentType(contentType);
  const file = new File([buf], "audio", { type: ct });

  const form = new FormData();
  form.append("file", file);
  form.append("model", "whisper-1");
  form.append("language", "pt");

  const resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Falha na transcrição: ${resp.status} - ${errText}`);
  }
  const data = await resp.json();
  return data?.text as string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as TranscribeRequest;
    if (!body?.url) {
      return new Response(JSON.stringify({ error: "URL do áudio é obrigatória" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { buf, contentType } = await fetchAudio(body.url, body.chatwoot_api_key);
    const transcript = await transcribeWithOpenAI(buf, body.content_type || contentType);

    return new Response(JSON.stringify({ transcript }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Erro na transcrição:", err);
    return new Response(JSON.stringify({ error: err?.message || "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});