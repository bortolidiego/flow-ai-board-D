/* eslint-disable */
// @ts-nocheck

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type TranscribeRequest = {
  url: string;
  content_type?: string | null;
  chatwoot_api_key?: string | null;
};

async function fetchAudio(url: string, apiKey?: string | null) {
  // Tenta com cabeçalho, se fornecido; caso não, tenta sem headers.
  const headers: Record<string, string> = {};
  if (apiKey) {
    // Alguns deployments do Chatwoot aceitam 'api_access_token' como header
    headers["api_access_token"] = apiKey!;
    // Em outros, Authorization Bearer pode funcionar; manter ambos não atrapalha.
    headers["Authorization"] = `Bearer ${apiKey}`;
  }
  let res = await fetch(url, { headers });
  if (!res.ok) {
    // fallback sem headers
    res = await fetch(url);
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