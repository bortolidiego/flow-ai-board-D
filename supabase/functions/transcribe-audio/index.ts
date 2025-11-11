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

async function fetchAudio(url: string, apiKey?: string | null) {
  // Tenta com cabeçalho; depois sem cabeçalho; por fim adiciona api_access_token na query
  const headers: Record<string, string> = {};
  if (apiKey) {
    headers["api_access_token"] = apiKey!;
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  // 1) Tenta com headers
  let res = await fetch(url, { headers });

  // 2) Fallback sem headers
  if (!res.ok) {
    res = await fetch(url);
  }

  // 3) Fallback com token na query
  if (!res.ok && apiKey) {
    try {
      const u = new URL(url);
      u.searchParams.set("api_access_token", apiKey!);
      res = await fetch(u.toString());
    } catch {
      // Se a URL não for válida, ignora e segue para erro
    }
  }

  if (!res.ok) {
    throw new Error(`Falha ao baixar áudio (${res.status})`);
  }
  const contentType = res.headers.get("content-type") || "audio/mpeg";
  const buf = await res.arrayBuffer();
  return { buf, contentType };
}

async function transcribeWithOpenAI(buf: ArrayBuffer, contentType: string) {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY não configurada");

  // Monta FormData para whisper-1
  const file = new File([buf], "audio", { type: contentType || "audio/mpeg" });
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