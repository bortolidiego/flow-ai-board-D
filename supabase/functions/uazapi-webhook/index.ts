// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Schema Zod para validação do Webhook UAZAPI
const UAZAPIWebhookSchema = z.object({
    event: z.string(),
    instance: z.string(),
    data: z.object({
        key: z.object({
            remoteJid: z.string(),
            id: z.string(),
            fromMe: z.boolean().optional(),
        }).optional(),
        message: z.any().optional(),
        messageTimestamp: z.number().optional(),
        pushName: z.string().optional(),
        messageType: z.string().optional(),
        body: z.any().optional(), // Pode ser string ou objeto dependendo do tipo
        mediaUrl: z.string().optional(),
    }).optional(),
});

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

class UAZAPIWebhookService {
    constructor(private supabase: SupabaseClient, private supabaseKey: string) { }

    async findInstanceByToken(token: string) {
        const { data } = await this.supabase
            .from("whatsapp_instances")
            .select(`
        *,
        pipelines (
          id,
          columns (
            id,
            name,
            position
          )
        )
      `)
            .eq("instance_token", token)
            .maybeSingle();
        return data;
    }

    async findExistingCard(instanceId: string, chatId: string) {
        const { data } = await this.supabase
            .from("cards")
            .select("*")
            .eq("whatsapp_instance_id", instanceId)
            .eq("whatsapp_chat_id", chatId)
            .is("deleted_at", null)
            .is("completion_type", null)
            .maybeSingle();
        return data;
    }

    async createCard(data: any) {
        return await this.supabase.from("cards").insert(data).select().single();
    }

    async updateCardMetadata(cardId: string, data: any) {
        return await this.supabase.from("cards").update(data).eq("id", cardId);
    }

    async triggerAIAnalysis(cardId: string) {
        console.log(`Triggering AI analysis for card ${cardId}...`);
        const { error } = await this.supabase.functions.invoke("analyze-conversation", {
            body: { cardId },
            headers: { Authorization: `Bearer ${this.supabaseKey}` },
        });
        if (error) console.error("AI trigger error:", error);
    }

    async logMessage(data: any) {
        return await this.supabase.from("whatsapp_messages").insert(data);
    }
}

function getFormattedTimestamp() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' });
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
    return `${dateStr} ${timeStr}`;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceRoleKey = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
        const supabaseKey = supabaseServiceRoleKey || supabaseAnonKey!;

        const supabase = createClient(supabaseUrl, supabaseKey);
        const service = new UAZAPIWebhookService(supabase, supabaseKey);

        const rawWebhook = await req.json();
        console.log("DEBUG - UAZAPI Webhook payload:", JSON.stringify(rawWebhook).substring(0, 2000));

        // Validação básica
        if (!rawWebhook.event || !rawWebhook.instance) {
            return new Response(JSON.stringify({ message: "Invalid payload" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Busca instância pelo nome/token (assumindo que 'instance' no payload é o nome ou token)
        // Na UAZAPI geralmente é o nome da instância.
        // Mas precisamos validar se essa instância existe no nosso banco.
        // O ideal seria passar um token secreto na URL do webhook, mas vamos buscar pelo nome da instância por enquanto
        // Ou melhor, vamos buscar pelo instance_name na tabela whatsapp_instances

        const { data: instance } = await supabase
            .from("whatsapp_instances")
            .select(`*, pipelines(id, columns(id, name, position))`)
            .eq("instance_name", rawWebhook.instance)
            .maybeSingle();

        if (!instance) {
            console.warn(`Instance not found: ${rawWebhook.instance}`);
            return new Response(JSON.stringify({ message: "Instance not found" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        if (rawWebhook.event === "messages.upsert" || rawWebhook.event === "message.received") {
            const msgData = rawWebhook.data;
            const key = msgData.key;
            const isFromMe = key.fromMe;
            const chatId = key.remoteJid;
            const pushName = msgData.pushName || "Cliente WhatsApp";

            // Ignora status updates
            if (chatId === "status@broadcast") {
                return new Response(JSON.stringify({ message: "Status update ignored" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }

            // Extrai conteúdo da mensagem
            let content = "";
            let messageType = "text";

            if (msgData.message?.conversation) {
                content = msgData.message.conversation;
            } else if (msgData.message?.extendedTextMessage?.text) {
                content = msgData.message.extendedTextMessage.text;
            } else if (msgData.message?.imageMessage) {
                messageType = "image";
                content = msgData.message.imageMessage.caption || "[Imagem]";
            } else if (msgData.message?.audioMessage) {
                messageType = "audio";
                content = "[Áudio]";
            } else {
                content = "[Mensagem não suportada]";
            }

            // Formata mensagem para o card
            const roleEmoji = isFromMe ? "🧑‍💼" : "👤";
            const roleLabel = isFromMe ? "Atendente" : "Cliente";
            const senderName = isFromMe ? "Atendente" : pushName;
            const timestamp = getFormattedTimestamp();
            const formattedMessage = `[${timestamp}] ${roleEmoji} ${roleLabel} ${senderName}: ${content}`;

            // Busca card existente
            const existingCard = await service.findExistingCard(instance.id, chatId);

            if (existingCard) {
                // Atualiza card existente
                const updatedDescription = existingCard.description ? `${existingCard.description}\n${formattedMessage}` : formattedMessage;

                await service.updateCardMetadata(existingCard.id, {
                    description: updatedDescription,
                    updated_at: new Date().toISOString(),
                    last_activity_at: new Date().toISOString(),
                    whatsapp_contact_name: pushName // Atualiza nome se mudar
                });

                // Trigger AI
                await service.triggerAIAnalysis(existingCard.id);
            } else {
                // Cria novo card se não for mensagem enviada por mim (apenas mensagens recebidas criam cards novos)
                if (!isFromMe) {
                    const pipeline = instance.pipelines;
                    const columns = pipeline.columns?.sort((a: any, b: any) => a.position - b.position);
                    const firstColumn = columns?.[0];

                    if (firstColumn) {
                        const newCard = await service.createCard({
                            column_id: firstColumn.id,
                            title: `${pushName} - WhatsApp`,
                            description: formattedMessage,
                            whatsapp_instance_id: instance.id,
                            whatsapp_chat_id: chatId,
                            whatsapp_contact_name: pushName,
                            whatsapp_contact_number: chatId.split('@')[0],
                            priority: 'medium'
                        });

                        // Trigger AI
                        await service.triggerAIAnalysis(newCard.id);
                    }
                }
            }

            // Log mensagem (opcional)
            await service.logMessage({
                instance_id: instance.id,
                card_id: existingCard?.id,
                message_id: key.id,
                chat_id: chatId,
                message_type: messageType,
                content: content,
                is_from_me: isFromMe,
                sender_name: pushName
            });
        }

        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } catch (error) {
        console.error("Webhook Error:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
});
