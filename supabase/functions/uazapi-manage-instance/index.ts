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

        const { action, instanceId, instanceName, uazapiBaseUrl, uazapiAdminToken, pipelineId } = await req.json();

        if (action === "create") {
            if (!instanceName || !uazapiBaseUrl || !pipelineId) {
                throw new Error("Missing required fields: instanceName, uazapiBaseUrl, pipelineId");
            }

            const token = crypto.randomUUID().replace(/-/g, '');
            const webhookUrl = `${supabaseUrl}/functions/v1/uazapi-webhook`;

            // Cria instância na UAZAPI
            const uazapiRes = await fetch(`${uazapiBaseUrl}/instance/create`, {
                method: 'POST',
                headers: {
                    'apikey': uazapiAdminToken || '',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    instanceName: instanceName,
                    token: token,
                    qrcode: true, // Solicita QR Code na resposta se possível
                    webhook: webhookUrl,
                    events: ['APPLICATION_STARTUP', 'QRCODE_UPDATED', 'MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'MESSAGES_DELETE', 'SEND_MESSAGE', 'CONNECTION_UPDATE']
                })
            });

            if (!uazapiRes.ok) {
                const errorText = await uazapiRes.text();
                throw new Error(`UAZAPI Error: ${errorText}`);
            }

            const uazapiData = await uazapiRes.json();

            // Salva no banco
            const { data, error } = await supabase.from('whatsapp_instances').insert({
                pipeline_id: pipelineId,
                instance_name: instanceName,
                instance_token: token,
                uazapi_base_url: uazapiBaseUrl,
                uazapi_admin_token: uazapiAdminToken,
                status: 'disconnected',
                // Se a API já retornar o QR Code na criação
                qr_code: uazapiData.qrcode || uazapiData.base64 || null
            }).select().single();

            if (error) throw error;

            return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        if (action === "connect" || action === "status") {
            const { data: instance } = await supabase.from('whatsapp_instances').select('*').eq('id', instanceId).single();
            if (!instance) throw new Error("Instance not found");

            // Busca status/QR Code na UAZAPI
            // Endpoint hipotético: /instance/connect/{instanceName}
            const uazapiRes = await fetch(`${instance.uazapi_base_url}/instance/connect/${instance.instance_name}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${instance.instance_token}`
                }
            });

            if (uazapiRes.ok) {
                const result = await uazapiRes.json();

                // Atualiza status no banco se necessário
                if (result.base64 || result.qrcode) {
                    await supabase.from('whatsapp_instances').update({
                        qr_code: result.base64 || result.qrcode,
                        status: 'connecting'
                    }).eq('id', instanceId);
                } else if (result.instance?.state === 'open') {
                    await supabase.from('whatsapp_instances').update({
                        status: 'connected',
                        qr_code: null,
                        phone_number: result.instance?.ownerJid // Exemplo
                    }).eq('id', instanceId);
                }

                return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            } else {
                // Se falhar, retorna erro mas tenta manter status atual
                return new Response(JSON.stringify({ error: "Failed to fetch status from UAZAPI" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }
        }

        if (action === "disconnect") {
            const { data: instance } = await supabase.from('whatsapp_instances').select('*').eq('id', instanceId).single();
            if (!instance) throw new Error("Instance not found");

            await fetch(`${instance.uazapi_base_url}/instance/logout/${instance.instance_name}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${instance.instance_token}`
                }
            });

            await supabase.from('whatsapp_instances').update({
                status: 'disconnected',
                qr_code: null,
                phone_number: null
            }).eq('id', instanceId);

            return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        if (action === "delete") {
            const { data: instance } = await supabase.from('whatsapp_instances').select('*').eq('id', instanceId).single();
            if (instance) {
                // Tenta deletar na UAZAPI também
                try {
                    await fetch(`${instance.uazapi_base_url}/instance/delete/${instance.instance_name}`, {
                        method: 'DELETE',
                        headers: {
                            'apikey': instance.uazapi_admin_token || ''
                        }
                    });
                } catch (e) {
                    console.error("Failed to delete instance on UAZAPI", e);
                }
            }

            const { error } = await supabase.from('whatsapp_instances').delete().eq('id', instanceId);
            if (error) throw error;

            return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        return new Response(JSON.stringify({ message: "Action not supported" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } catch (error) {
        console.error("Manage Instance Error:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
});
