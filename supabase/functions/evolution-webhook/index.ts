import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    const url = new URL(req.url)
    const pathSegments = url.pathname.split('/').filter(Boolean)
    const pipelineId = pathSegments[pathSegments.length - 1]

    if (!pipelineId) {
      throw new Error('Pipeline ID não fornecido na URL')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    const { instance, event, data } = body

    console.log('Received Evolution webhook:', { pipelineId, instance, event })

    switch (event) {
      case 'connection.update':
        await handleConnectionUpdate(supabase, instance, data, pipelineId)
        break
      
      case 'messages.upsert':
        await handleMessageUpsert(supabase, instance, data, pipelineId)
        break
      
      case 'messages.update':
        await handleMessageUpdate(supabase, instance, data, pipelineId)
        break
      
      default:
        console.log(`Evento não processado: ${event}`)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error processing Evolution webhook:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

async function handleConnectionUpdate(supabase, instance, data, pipelineId) {
  try {
    const { error } = await supabase
      .from('evolution_integrations')
      .update({
        status: data.state === 'open' ? 'connected' : 'disconnected',
        last_connection: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('instance_name', instance)
      .eq('pipeline_id', pipelineId)

    if (error) {
      console.error('Error updating connection status:', error)
    } else {
      console.log('Connection status updated:', instance, data.state)
    }
  } catch (error) {
    console.error('Error in handleConnectionUpdate:', error)
  }
}

async function handleMessageUpsert(supabase, instance, data, pipelineId) {
  try {
    const { data: integration, error: integrationError } = await supabase
      .from('evolution_integrations')
      .select('*')
      .eq('instance_name', instance)
      .eq('pipeline_id', pipelineId)
      .eq('active', true)
      .single()

    if (integrationError || !integration) {
      console.log('Integration not found or inactive:', instance)
      return
    }

    const message = data.message
    const chat = data.chat

    if (!integration.auto_create_cards) {
      await updateExistingCard(supabase, chat, message, integration)
      return
    }

    const { data: existingCard } = await supabase
      .from('cards')
      .select('id')
      .eq('chatwoot_conversation_id', chat.id)
      .maybeSingle()

    if (existingCard) {
      await updateExistingCard(supabase, chat, message, integration)
    } else {
      await createNewCard(supabase, chat, message, integration, data)
    }

  } catch (error) {
    console.error('Error in handleMessageUpsert:', error)
  }
}

async function handleMessageUpdate(supabase, instance, data, pipelineId) {
  try {
    const message = data.message
    const chat = data.chat
    await updateExistingCard(supabase, chat, message, null, true)
  } catch (error) {
    console.error('Error in handleMessageUpdate:', error)
  }
}

async function createNewCard(supabase, chat, message, integration, fullData) {
  try {
    const { data: columns } = await supabase
      .from('columns')
      .select('id')
      .eq('pipeline_id', integration.pipeline_id)
      .order('position')
      .limit(1)

    if (!columns || columns.length === 0) {
      console.log('No columns found for pipeline:', integration.pipeline_id)
      return
    }

    const title = message.pushName || chat.name || `Conversa ${chat.id}`
    const description = `[${new Date().toLocaleTimeString('pt-BR')}] ${message.pushName || 'WhatsApp'}: ${message.body}`

    const cardData = {
      title,
      description,
      column_id: columns[0].id,
      chatwoot_contact_name: message.pushName || chat.name || null,
      chatwoot_conversation_id: chat.id,
      chatwoot_agent_name: null,
      inbox_name: integration.instance_alias || integration.instance_name,
      conversation_status: chat.archive || 'open',
      last_activity_at: new Date().toISOString(),
      ai_suggested: integration.analyze_messages
    }

    const { data: card, error: cardError } = await supabase
      .from('cards')
      .insert(cardData)
      .select()
      .single()

    if (cardError) {
      console.error('Error creating card:', cardError)
      return
    }

    console.log('Card created:', card.id)

    if (message.pushName || chat.name) {
      const leadData = {
        card_id: card.id,
        full_name: message.pushName || chat.name,
        phone: chat.id.split('@')[0]
      }

      await supabase
        .from('lead_data')
        .insert(leadData)
    }

    if (integration.analyze_messages && card.id) {
      try {
        await supabase.functions.invoke('analyze-conversation', {
          body: { cardId: card.id }
        })
        console.log('AI analysis triggered for card:', card.id)
      } catch (analysisError) {
        console.error('Error triggering AI analysis:', analysisError)
      }
    }

  } catch (error) {
    console.error('Error in createNewCard:', error)
  }
}

async function updateExistingCard(supabase, chat, message, integration = null, isUpdate = false) {
  try {
    const { data: existingCard } = await supabase
      .from('cards')
      .select('id, description, last_activity_at')
      .eq('chatwoot_conversation_id', chat.id)
      .single()

    if (!existingCard) {
      console.log('Card not found for conversation:', chat.id)
      return
    }

    const timestamp = new Date().toLocaleTimeString('pt-BR')
    const senderName = message.pushName || 'WhatsApp'
    const newMessageLine = `[${timestamp}] ${senderName}: ${message.body}`
    
    const newDescription = isUpdate 
      ? `${existingCard.description}\n${newMessageLine}`
      : `${existingCard.description}\n${newMessageLine}`

    const { error } = await supabase
      .from('cards')
      .update({
        description: newDescription,
        last_activity_at: new Date().toISOString(),
        conversation_status: chat.archive || 'open',
        ai_suggested: integration?.analyze_messages || false
      })
      .eq('id', existingCard.id)

    if (error) {
      console.error('Error updating card:', error)
    } else {
      console.log('Card updated:', existingCard.id)
      
      if (integration?.analyze_messages) {
        try {
          await supabase.functions.invoke('analyze-conversation', {
            body: { cardId: existingCard.id }
          })
          console.log('AI analysis triggered for updated card:', existingCard.id)
        } catch (analysisError) {
          console.error('Error triggering AI analysis:', analysisError)
        }
      }
    }

  } catch (error) {
    console.error('Error in updateExistingCard:', error)
  }
}