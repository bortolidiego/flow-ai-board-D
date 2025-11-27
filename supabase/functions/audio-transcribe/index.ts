/* eslint-disable */
// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { encode } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

// Normaliza content-type para Whisper
function normalizeContentType(ct) {
  const val = (ct || "").toLowerCase().trim();
  console.log("🔧 Normalizando content-type:", {
    original: ct,
    normalized: val
  });
  if (!val) return "audio/mpeg";
  if (val.startsWith("audio/") || val === "audio") return ct;
  // Muitos áudios do WhatsApp/Chatwoot chegam como TS de vídeo
  if (val.startsWith("video/vnd.dlna.mpeg-tts") || val.startsWith("video/mp2t") || val.startsWith("video/mpeg") || val.startsWith("application/octet-stream")) {
    console.log("✅ Convertendo content-type de vídeo/binário para audio/mpeg:", val);
    return "audio/mpeg";
  }
  // fallback seguro
  console.log("⚠️ Usando fallback audio/mpeg para content-type desconhecido:", val);
  return "audio/mpeg";
}

async function tryFetch(url, headers) {
  return await fetch(url, {
    headers,
    redirect: "follow"
  });
}

async function fetchAudio(url, apiKey) {
  console.log("🎵 Iniciando download do áudio:", {
    url,
    hasApiKey: !!apiKey
  });
  // Tentativas de autenticação para ActiveStorage do Chatwoot
  const baseHeaders = {
    Accept: "audio/*,application/octet-stream,*/*",
    "User-Agent": "Supabase-Edge-Transcriber/1.0"
  };
  const strategies = [];
  if (apiKey) {
    strategies.push({
      url,
      headers: {
        ...baseHeaders,
        "Api-Access-Token": apiKey
      },
      label: "Api-Access-Token header"
    });
    strategies.push({
      url,
      headers: {
        ...baseHeaders,
        api_access_token: apiKey
      },
      label: "api_access_token header (lowercase)"
    });
    strategies.push({
      url,
      headers: {
        ...baseHeaders,
        Authorization: `Bearer ${apiKey} `
      },
      label: "Authorization: Bearer"
    });
  }
  // Fallback sem cabeçalho
  strategies.push({
    url,
    headers: {
      ...baseHeaders
    },
    label: "no headers"
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
        headers: {
          ...baseHeaders
        },
        label: "api_access_token query"
      });
      // também tente com Api-Access-Token header junto com query, alguns setups exigem ambos
      strategies.push({
        url: u.toString(),
        headers: {
          ...baseHeaders,
          "Api-Access-Token": apiKey
        },
        label: "query + Api-Access-Token header"
      });
    } catch {
      // URL inválida, ignora fallback de query
    }
  }
  console.log("🔄 Estratégias de download:", strategies.map((s) => s.label));
  let lastErrorText = "";
  for (const strat of strategies) {
    try {
      console.log("🌐 Tentando baixar via:", strat.label, "URL:", strat.url);
      const res = await tryFetch(strat.url, strat.headers);
      console.log("📊 Resposta:", {
        status: res.status,
        statusText: res.statusText,
        contentType: res.headers.get("content-type"),
        contentLength: res.headers.get("content-length")
      });
      if (res.ok) {
        const contentType = res.headers.get("content-type") || "audio/mpeg";
        const buf = await res.arrayBuffer();
        console.log("✅ Audio baixado via", strat.label, "CT:", contentType, "Size:", buf.byteLength);
        return {
          buf,
          contentType
        };
      } else {
        const t = await res.text().catch(() => "");
        lastErrorText = `status = ${res.status} body = ${t?.slice(0, 300) || ""} `;
        console.warn("❌ Falha ao baixar áudio via", strat.label, lastErrorText);
      }
    } catch (e) {
      lastErrorText = String(e);
      console.warn("❌ Erro de rede na tentativa", strat.label, lastErrorText);
    }
  }
  console.error("❌ Todas as estratégias falharam. Último erro:", lastErrorText);
  throw new Error(`Falha ao baixar áudio (${lastErrorText || "desconhecido"})`);
}

async function transcribeWithOpenRouter(buf, contentType, apiKeyOverride, modelOverride) {
  const apiKey = apiKeyOverride || Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) throw new Error("OPENROUTER_API_KEY não configurada");

  const model = modelOverride || Deno.env.get("OPENROUTER_TRANSCRIPTION_MODEL") || "openai/whisper-1";
  const ct = normalizeContentType(contentType);

  // Lógica de seleção de endpoint baseada no modelo
  const isWhisper = model.toLowerCase().includes("whisper");

  if (isWhisper) {
    // --- Fluxo para modelos de Transcrição (Whisper) ---
    console.log(`🎙️ Usando endpoint de transcrição para modelo: ${model} `);

    const file = new File([buf], "audio.mp3", { type: ct });
    const form = new FormData();
    form.append("file", file);
    form.append("model", model);
    form.append("language", "pt"); // Forçar português se possível

    const resp = await fetch("https://openrouter.ai/api/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey} `,
        "HTTP-Referer": "https://flowaiboard.com",
        "X-Title": "Flow AI Board"
      },
      body: form
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Falha na transcrição(Whisper): ${resp.status} - ${errText} `);
    }

    const data = await resp.json();
    return data?.text;

  } else {
    // --- Fluxo para modelos Multimodais (Gemini, GPT-4o, etc.) ---
    console.log(`🤖 Usando endpoint de chat multimodal para modelo: ${model} `);

    const base64Audio = encode(buf);

    // Payload genérico para modelos multimodais no OpenRouter
    // A maioria aceita conteúdo como array de partes (texto + imagem/audio)
    // Para OpenRouter/Gemini, o formato costuma ser compatível com OpenAI Vision/Audio

    const payload = {
      model: model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Por favor, transcreva o áudio a seguir fielmente para texto em português. Identifique também a emoção do falante. O formato da resposta deve ser estritamente: '[Emoção: <emoção detectada>] <transcrição do texto>'. Exemplo: '[Emoção: Feliz] Olá, tudo bem?'"
            },
            {
              type: "image_url", // Hack: OpenRouter muitas vezes trata arquivos via image_url ou estrutura similar para compatibilidade
              image_url: {
                url: `data:${ct}; base64, ${base64Audio} `
              }
            }
          ]
        }
      ]
    };

    // Ajuste específico: Alguns modelos podem exigir 'input_audio' (padrão OpenAI real)
    // Mas o OpenRouter muitas vezes usa a estrutura de 'image_url' ou 'content' com data URI para arquivos genéricos.
    // Vamos tentar o formato mais comum de "multimodal content" que funciona para Gemini no OpenRouter.

    // NOTA: Se o modelo for especificamente 'google/gemini...', o OpenRouter mapeia data URIs corretamente.

    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey} `,
        "HTTP-Referer": "https://flowaiboard.com",
        "X-Title": "Flow AI Board",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Falha na transcrição(Multimodal): ${resp.status} - ${errText} `);
    }

    const data = await resp.json();
    return data?.choices?.[0]?.message?.content || "";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const body = await req.json();
    console.log("🎤 Requisição de transcrição recebida:", body);
    if (!body?.url) {
      return new Response(JSON.stringify({
        error: "URL do áudio é obrigatória"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const { buf, contentType } = await fetchAudio(body.url, body.chatwoot_api_key);
    const transcript = await transcribeWithOpenRouter(buf, body.content_type || contentType, body.openrouter_api_key, body.transcription_model);
    return new Response(JSON.stringify({
      transcript
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (err) {
    console.error("🔥 Erro na função de transcrição:", err);
    return new Response(JSON.stringify({
      error: err?.message || "Erro desconhecido"
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});