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
    // Tenta ler o corpo como JSON
    body = await req.json();
  } catch (e) {
    // Se falhar (corpo vazio, não-JSON), loga e retorna 200 OK para evitar reenvio
    console.log('Failed to parse JSON body. Assuming non-critical event or ping.');
    return new Response(JSON.stringify({ message: 'Ignored non-JSON or empty payload' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const event = body.event;
  const conversation = body.conversation;
  const message = body.message;

  // Se faltar evento ou conversa, loga e retorna 200 OK
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

    // Só processamos eventos de criação de mensagem
    if (event !== 'message_created') {
        return new Response(JSON.stringify({ message: `Ignored event type: ${event}` }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // Para message_created, o objeto message é obrigatório
    if (!message) {
        console.log('message_created event received but message object is missing. Skipping.');
        return new Response(JSON.stringify({ message: 'Ignored message_created without message object' }), {
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
      .select('id, description, column_id')
      .eq('chatwoot_conversation_id', conversationId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    let cardId: string;
    let currentDescription: string;
    let columnId: string;

    if (!cardData) {
      console.log(`Card not found for conversation ID ${conversationId}. Attempting to create new card.`);
      
      // --- Lógica de Criação de Card ---
      
      // 1. Buscar a pipeline e a coluna inicial (Novo Contato)
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
      
      // 2. Determinar o título do card
      const contactName = conversation.contact?.name || conversation.meta?.sender?.name || `Conversa #${conversation.display_id}`;
      const title = contactName;
      
      // 3. Inserir novo card
      const { data: newCard, error: createError } = await supabaseClient
        .from('cards')
        .insert({
          title: title,
          description: newLine,
          column_id: initialColumn.id,
          position: initialColumn.position, // Usar a posição da coluna inicial
          priority: 'medium',
          chatwoot_conversation_id: conversationId,
          chatwoot_contact_name: contactName,
          chatwoot_contact_email: conversation.contact?.email,
          chatwoot_agent_name: conversation.agent_last_seen_at ? conversation.meta?.assignee?.name : null,
          inbox_name: conversation.inbox?.name,
          created_at: new Date().toISOString(),
          last_activity_at: new Date().toISOString(),
        })
        .select('id, description, column_id')
        .single();

      if (createError) throw createError;
      
      cardId = newCard.id;
      currentDescription = newCard.description || '';
      columnId = newCard.column_id;
      
      console.log(`✅ New card ${cardId} created successfully in column ${columnId}.`);
      
      // Se o card foi criado, a descrição já contém a primeira mensagem (newLine), então terminamos.
      return new Response(JSON.stringify({ message: 'New card created and message processed' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else {
      // --- Lógica de Atualização de Card Existente ---
      cardId = cardData.id;
      currentDescription = cardData.description || '';
      columnId = cardData.column_id;
      
      // 2. Prevenir Duplicação: Verificar se a nova linha já está presente na descrição
      if (currentDescription.includes(newLine)) {
          console.log(`[INFO] Message already exists in card ${cardId}. Skipping update.`);
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
        .eq('id', cardId);

      if (updateError) throw updateError;

      // 4. Retornar 200 OK após a conclusão bem-sucedida da atualização
      console.log(`Card ${cardId} updated successfully.`);
      return new Response(JSON.stringify({ message: 'Card updated successfully' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error processing webhook:', error);
    // Em caso de erro, retornamos 500 para que o Chatwoot tente novamente (se configurado)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});