import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EvolutionWebhookPayload {
  event: string;
  data: any;
  instance: string;
}

interface ProcessedMessage {
  id: string;
  from: string;
  message: string;
  timestamp: number;
  pushName?: string;
  fromMe: boolean;
  messageType: string;
  instance: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const pipelineId = url.pathname.split('/').pop()

    if (!pipelineId) {
      throw new Error('Pipeline ID não fornecido na URL')
    }

    const payload: EvolutionWebhookPayload = await req.json()
    console.log('Evolution webhook received:', { event: payload.event, pipelineId })

    // Buscar integração ativa para este pipeline
    const { data: integration, error: integrationError } = await supabase
      .from('evolution_integrations')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .eq('instance_name', payload.instance)
      .eq('status', 'connected')
      .single()

    if (integrationError || !integration) {
      console.log('No active integration found for pipeline:', pipelineId)
      return new Response(JSON.stringify({ success: true, message: 'No integration configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Processar diferentes tipos de eventos
    switch (payload.event) {
      case 'messages.upsert':
        await handleMessageUpsert(supabase, integration, payload.data)
        break
      
      case 'messages.update':
        await handleMessageUpdate(supabase, integration, payload.data)
        break
      
      case 'connection.update':
        await handleConnectionUpdate(supabase, integration, payload.data)
        break
      
      default:
        console.log('Unhandled event type:', payload.event)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Evolution webhook error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

async function handleMessageUpsert(supabase: any, integration: any, data: any) {
  if (!data.message || data.key?.fromMe) {
    return // Ignorar mensagens do próprio bot ou sem conteúdo
  }

  const processedMessage = processEvolutionMessage(data, integration.instance_name)
  if (!processedMessage) return

  console.log('Processing message:', processedMessage.id)

  // Buscar ou criar coluna padrão para mensagens
  const { data: columns } = await supabase
    .from('columns')
    .select('id, name')
    .eq('pipeline_id', integration.pipeline_id)
    .eq('name', 'Mensagens Recebidas')
    .limit(1)

  let columnId = columns?.[0]?.id

  // Se não existe, criar coluna padrão
  if (!columnId) {
    const { data: newColumn } = await supabase
      .from('columns')
      .insert({
        pipeline_id: integration.pipeline_id,
        name: 'Mensagens Recebidas',
        position: 0
      })
      .select('id')
      .single()

    columnId = newColumn?.id
  }

  if (!columnId) {
    throw new Error('Could not find or create column for messages')
  }

  // Buscar card existente para este contato
  const { data: existingCard } = await supabase
    .from('cards')
    .select('id')
    .eq('chatwoot_contact_name', processedMessage.pushName || 'Contato WhatsApp')
    .eq('column_id', columnId)
    .eq('pipeline_id', integration.pipeline_id)
    .order('created_at', { ascending: false })
    .limit(1)

  let cardId: string

  if (existingCard && existingCard.length > 0 && !integration.auto_create_cards) {
    // Atualizar card existente
    cardId = existingCard[0].id

    const { error: updateError } = await supabase
      .from('cards')
      .update({
        description: `${processedMessage.message}\n\n---\nÚltima mensagem: ${new Date(processedMessage.timestamp * 1000).toLocaleString('pt-BR')}`,
        updated_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString()
      })
      .eq('id', cardId)

    if (updateError) {
      console.error('Error updating card:', updateError)
    }

  } else if (integration.auto_create_cards) {
    // Criar novo card
    const { data: newCard, error: createError } = await supabase
      .from('cards')
      .insert({
        pipeline_id: integration.pipeline_id,
        column_id: columnId,
        title: processedMessage.pushName || 'Contato WhatsApp',
        description: processedMessage.message,
        position: 0,
        chatwoot_contact_name: processedMessage.pushName || 'Contato WhatsApp',
        chatwoot_conversation_id: processedMessage.id,
        inbox_name: `Evolution - ${integration.instance_alias}`,
        last_activity_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (createError) {
      console.error('Error creating card:', createError)
      return
    }

    cardId = newCard.id

    // Criar entrada na lead_data se não existir
    if (processedMessage.pushName) {
      const { error: leadDataError } = await supabase
        .from('lead_data')
        .insert({
          card_id: cardId,
          full_name: processedMessage.pushName,
          phone: formatPhoneNumber(processedMessage.from)
        })

      if (leadDataError) {
        console.error('Error creating lead data:', leadDataError)
      }
    }

  } else {
    console.log('Card creation disabled, skipping...')
    return
  }

  // Disparar análise se configurada
  if (integration.analyze_messages && cardId) {
    try {
      await supabase.functions.invoke('analyze-conversation', {
        body: { cardId }
      })
    } catch (error) {
      console.error('Error triggering analysis:', error)
    }
  }
}

async function handleMessageUpdate(supabase: any, integration: any, data: any) {
  // Atualizar timestamp de última atividade
  const { error } = await supabase
    .from('cards')
    .update({
      updated_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString()
    })
    .eq('chatwoot_conversation_id', data.key?.id)

  if (error) {
    console.error('Error updating card timestamp:', error)
  }
}

async function handleConnectionUpdate(supabase: any, integration: any, data: any) {
  // Atualizar status da conexão
  const newStatus = data.state === 'open' ? 'connected' : 'disconnected'
  
  const { error } = await supabase
    .from('evolution_integrations')
    .update({
      status: newStatus,
      last_connection: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', integration.id)

  if (error) {
    console.error('Error updating connection status:', error)
  }
}

function processEvolutionMessage(data: any, instanceName: string): ProcessedMessage | null {
  if (!data.key?.remoteJid || !data.message) {
    return null
  }

  // Extrair texto da mensagem
  let messageText = ''
  let messageType = 'conversation'

  if (data.message.conversation) {
    messageText = data.message.conversation
    messageType = 'conversation'
  } else if (data.message.extendedTextMessage?.text) {
    messageText = data.message.extendedTextMessage.text
    messageType = 'extendedText'
  } else if (data.message.imageMessage?.caption) {
    messageText = data.message.imageMessage.caption
    messageType = 'image'
  } else if (data.message.documentMessage?.caption) {
    messageText = data.message.documentMessage.caption
    messageType = 'document'
  } else {
    // Para outros tipos, extrair o que for possível
    const keys = Object.keys(data.message)
    for (const key of keys) {
      if (data.message[key]?.caption || data.message[key]?.text) {
        messageText = data.message[key].caption || data.message[key].text
        messageType = key.replace('Message', '').toLowerCase()
        break
      }
    }
  }

  if (!messageText.trim()) {
    return null
  }

  return {
    id: data.key.id,
    from: data.key.remoteJid,
    message: messageText,
    timestamp: data.messageTimestamp || Math.floor(Date.now() / 1000),
    pushName: data.pushName,
    fromMe: data.key.fromMe || false,
    messageType,
    instance: instanceName
  }
}

function formatPhoneNumber(jid: string): string {
  // Converter jid para formato de telefone
  return jid.split('@')[0]
}