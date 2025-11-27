// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
        const supabaseServiceRoleKey = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        const supabase = createClient(supabaseUrl, supabaseServiceRoleKey!);

        const { instanceId, chatId, message, mediaUrl, mediaType } = await req.json();

        if (!instanceId || !chatId) {
            throw new Error("Missing instanceId or chatId");
        }

        const { data: instance } = await supabase.from('whatsapp_instances').select('*').eq('id', instanceId).single();
        if (!instance) throw new Error("Instance not found");

        let endpoint = '/message/sendText';
        let body: any = {
            number: chatId,
            options: {
                delay: 1200,
                presence: "composing",
            },
            textMessage: {
                text: message
            }
        };

        if (mediaUrl) {
            endpoint = '/message/sendMedia';
            body = {
                number: chatId,
                options: {
                    delay: 1200,
                    presence: "composing",
                },
                mediaMessage: {
                    mediatype: mediaType || 'image',
                    caption: message,
                    media: mediaUrl
                }
            };
        }

        const uazapiRes = await fetch(`${instance.uazapi_base_url}${endpoint}/${instance.instance_name}`, {
            method: 'POST',
            headers: {
                'apikey': instance.instance_token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!uazapiRes.ok) {
            const errorText = await uazapiRes.text();
            throw new Error(`UAZAPI Error: ${errorText}`);
        }

        const result = await uazapiRes.json();

        // Log message
        await supabase.from('whatsapp_messages').insert({
            instance_id: instanceId,
            chat_id: chatId,
            message_id: result.key?.id || crypto.randomUUID(),
            message_type: mediaUrl ? (mediaType || 'image') : 'text',
            content: message,
            media_url: mediaUrl,
            is_from_me: true,
            sender_name: 'Atendente'
        });

        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } catch (error) {
        console.error("Send Message Error:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
});
