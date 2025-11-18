import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função auxiliar para formatar a mensagem
function formatMessage(message: any, role: 'agent' | 'client'): string {
  const time = new Date(message.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const name = message.sender?.name || (role === 'agent' ? 'Atendente' : 'Cliente');
  const roleIcon = role === 'agent' ? '🧑‍💼' : '👤';
  
  const content = message.content?.trim() || '';

  if (!content) {
    return ''; // Ignorar mensagens sem conteúdo
  }

  // Formato esperado pelo frontend (ConversationSummary.tsx): [HH:MM] 🧑‍💼 Nome: Mensagem
  return `[${time}] ${roleIcon} ${name}: ${content}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const body = await req.json();
    const event = body.event;
    const conversation = body.conversation;
    const message = body.message;

    if (!conversation || !message || !event) {
      return new Response(JSON.stringify({ error: 'Invalid webhook payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Só processamos eventos de criação de mensagem
    if (event !== 'message_created') {
        return new Response(JSON.stringify({ message: `Ignored event type: ${event}` }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const conversationId = String(conversation.id);
    const messageType = message.message_type; // incoming (client) or outgoing (agent)
    const messageContent = message.content;
    const isPrivate = message.private;

    // Ignorar notas privadas e mensagens sem conteúdo
    if (isPrivate || !messageContent) {
      return new Response(JSON.stringify({ message: 'Ignored private note or empty message' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determinar o papel (role)
    const role: 'agent' | 'client' = messageType === 'outgoing' ? 'agent' : 'client';
    
    // Formatar a nova linha de conversa
    const newLine = formatMessage(message, role);
    if (!newLine) {
        return new Response(JSON.stringify({ message: 'Ignored empty formatted message' }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // 1. Buscar o card existente
    const { data: cardData, error: fetchError } = await supabaseClient
      .from('cards')
      .select('id, description')
      .eq('chatwoot_conversation_id', conversationId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!cardData) {
      return new Response(JSON.stringify({ message: 'Card not found for conversation ID' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const currentDescription = cardData.description || '';
    
    // 2. Prevenir Duplicação: Verificar se a última linha já corresponde à nova linha
    const lines = currentDescription.split('\n').filter(line => line.trim() !== '');
    const lastLine = lines[lines.length - 1];

    // Se a última linha for idêntica à nova linha, ou se a nova linha já estiver presente
    // nas últimas 3 linhas (para cobrir pequenos atrasos ou retransmissões), ignoramos.
    const isDuplicate = lines.slice(-3).some(line => line.trim() === newLine.trim());

    if (isDuplicate) {
        console.log(`[INFO] Message already exists in card ${cardData.id}. Skipping update.`);
        return new Response(JSON.stringify({ message: 'Message already processed' }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // 3. Atualizar a descrição do card
    const newDescription = currentDescription 
      ? `${currentDescription}\n${newLine}` 
      : newLine;

    const { error: updateError } = await supabaseClient
      .from('cards')
      .update({ 
        description: newDescription,
        updated_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
      })
      .eq('id', cardData.id);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ message: 'Card updated successfully' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});