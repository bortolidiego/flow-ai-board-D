import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
// @ts-ignore - Deno runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // @ts-ignore - Deno global
    const supabase = createClient(
      // @ts-ignore - Deno global
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore - Deno global
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    console.log('Evolution webhook received:', JSON.stringify(body, null, 2))

    // Handle different event types
    if (body.event === 'messages.upsert') {
      await handleMessageUpsert(supabase, body.data)
    } else if (body.event === 'connection.update') {
      await handleConnectionUpdate(supabase, body.data)
    } else if (body.event === 'messages.update') {
      await handleMessageUpdate(supabase, body.data)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Evolution webhook error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

async function handleMessageUpsert(supabase: any, data: any) {
  const { instance: instanceName, message } = data

  // Find the integration
  const { data: integration, error: integrationError } = await supabase
    .from('evolution_integrations' as any)
    .select('*')
    .eq('instance_name', instanceName)
    .eq('active', true)
    .single()

  if (integrationError || !integration) {
    console.log('Integration not found or inactive:', instanceName)
    return
  }

  // Skip if it's from us (outgoing messages)
  if (message.fromMe) {
    console.log('Skipping outgoing message')
    return
  }

  const remoteJid = message.key.remoteJid
  const messageContent = message.message?.conversation ||
                        message.message?.extendedTextMessage?.text ||
                        message.message?.imageMessage?.caption ||
                        '[Mensagem não suportada]'

  // Find existing card or create new one
  let cardId = null
  const { data: existingCard } = await supabase
    .from('cards')
    .select('id')
    .eq('chatwoot_conversation_id', remoteJid)
    .eq('column_id', (await getFirstColumnId(supabase, integration.pipeline_id)))

  if (existingCard) {
    cardId = existingCard.id
  } else if (integration.auto_create_cards) {
    // Create new card
    const { data: newCard, error: cardError } = await supabase
      .from('cards')
      .insert({
        title: `WhatsApp: ${remoteJid}`,
        description: messageContent,
        column_id: await getFirstColumnId(supabase, integration.pipeline_id),
        chatwoot_conversation_id: remoteJid,
        conversation_status: 'open'
      })
      .select('id')
      .single()

    if (cardError) {
      console.error('Error creating card:', cardError)
      return
    }
    cardId = newCard.id
  }

  if (cardId && integration.analyze_messages) {
    // Trigger AI analysis
    try {
      await supabase.functions.invoke('analyze-conversation', {
        body: { cardId }
      })
    } catch (analysisError) {
      console.error('Error triggering analysis:', analysisError)
    }
  }
}

async function handleConnectionUpdate(supabase: any, data: any) {
  const { instance: instanceName, state } = data

  const status = state === 'open' ? 'connected' : 'disconnected'

  const { error } = await supabase
    .from('evolution_integrations' as any)
    .update({
      status,
      last_connection: new Date().toISOString()
    })
    .eq('instance_name', instanceName)

  if (error) {
    console.error('Error updating connection status:', error)
  }
}

async function handleMessageUpdate(supabase: any, data: any) {
  // Handle message updates if needed
  console.log('Message update received:', data)
}

async function getFirstColumnId(supabase: any, pipelineId: string): Promise<string> {
  const { data: column } = await supabase
    .from('columns')
    .select('id')
    .eq('pipeline_id', pipelineId)
    .order('position')
    .limit(1)
    .single()

  return column?.id || ''
}