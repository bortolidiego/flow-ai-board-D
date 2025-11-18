import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0?no-check';

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

  console.log('Webhook received:', req.method, req.url);

  let body: any = {};
  try {
    body = await req.json();
  } catch (e) {
    console.log('Failed to parse JSON body. Assuming non-critical event or ping.');
    return new Response(JSON.stringify({ message: 'Ignored non-JSON or empty payload' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const event = body.event;
  const conversation = body.conversation;
  const message = body.message;

  if (!event || !conversation) {
    console.log('Invalid payload structure received (missing event or conversation).');
    return new Response(JSON.stringify({ message: 'Ignored incomplete payload' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log(`Processing event: ${event} for conversation: ${conversation.id}`);

    // Apenas processar eventos message_created que são mensagens reais
    if (event !== 'message_created') {
      return new Response(JSON.stringify({ message: `Ignored event type: ${event}` }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validação robusta do objeto 'message'
    if (!message || !message.content || message.private || message.message_type === 'activity') {
      let reason = 'Unknown';
      if (!message) reason = 'message object is missing';
      else if (!message.content) reason = 'message content is empty';
      else if (message.private) reason = 'message is a private note';
      else if (message.message_type === 'activity') reason = 'message is an activity log';
      
      console.log(`[INFO] Ignoring message_created event. Reason: ${reason}.`);
      return new Response(JSON.stringify({ message: `Ignored: ${reason}` }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const conversationId = String(conversation.id);
    const messageType = message.message_type; // incoming (client) or outgoing (agent)
    
    const role: 'agent' | 'client' = messageType === 'outgoing' ? 'agent' : 'client';
    
    const newLine = formatMessage(message, role);
    if (!newLine) {
        return new Response(JSON.stringify({ message: 'Ignored empty formatted message' }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const { data: cardData, error: fetchError } = await supabaseClient
      .from('cards')
      .select('id, description, column_id')
      .eq('chatwoot_conversation_id', conversationId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!cardData) {
      console.log(`Card not found for conversation ID ${conversationId}. Attempting to create new card.`);
      
      const { data: integrationData } = await supabaseClient
        .from('chatwoot_integrations')
        .select('pipeline_id')
        .eq('account_id', conversation.account_id)
        .maybeSingle();

      if (!integrationData) {
        console.log('No active integration found for this Chatwoot Account ID.');
        return new Response(JSON.stringify({ message: 'No active integration found' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const pipelineId = integrationData.pipeline_id;
      
      const { data: initialColumn } = await supabaseClient
        .from('columns')
        .select('id, position')
        .eq('pipeline_id', pipelineId)
        .order('position', { ascending: true })
        .limit(1)
        .single();

      if (!initialColumn) {
        console.error('Initial column not found for pipeline:', pipelineId);
        throw new Error('Initial column not found');
      }
      
      const contactName = conversation.contact?.name || conversation.meta?.sender?.name || `Conversa #${conversation.display_id}`;
      const title = contactName;
      
      const { data: newCard, error: createError } = await supabaseClient
        .from('cards')
        .insert({
          title: title,
          description: newLine,
          column_id: initialColumn.id,
          position: initialColumn.position,
          priority: 'medium',
          chatwoot_conversation_id: conversationId,
          chatwoot_contact_name: contactName,
          chatwoot_contact_email: conversation.contact?.email,
          chatwoot_agent_name: conversation.agent_last_seen_at ? conversation.meta?.assignee?.name : null,
          inbox_name: conversation.inbox?.name,
          created_at: new Date().toISOString(),
          last_activity_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (createError) throw createError;
      
      console.log(`✅ New card ${newCard.id} created successfully in column ${initialColumn.id}.`);
      
      return new Response(JSON.stringify({ message: 'New card created and message processed' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else {
      const cardId = cardData.id;
      const currentDescription = cardData.description || '';
      
      if (currentDescription.includes(newLine)) {
          console.log(`[INFO] Message already exists in card ${cardId}. Skipping update.`);
          return new Response(JSON.stringify({ message: 'Message already processed' }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
      }

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
        .eq('id', cardId);

      if (updateError) throw updateError;

      console.log(`Card ${cardId} updated successfully.`);
      return new Response(JSON.stringify({ message: 'Card updated successfully' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});