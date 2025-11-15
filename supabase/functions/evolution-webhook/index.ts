// Import necessary types for Deno
import type { Serve } from "https://deno.land/std@0.190.0/http/server.ts";
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// Mock Deno for TypeScript compilation
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// @ts-ignore - Deno.serve is available at runtime
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the request's authorization header
    const authHeader = req.headers.get('Authorization') || '';
    // @ts-ignore - Supabase client is available at runtime
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get the request body
    const body = await req.json();
    const { instance, event, data } = body;

    console.log('Evolution webhook received:', { instance, event, data });

    // Find integration by instance name
    const { data: integration, error: integrationError } = await supabaseClient
      .from('evolution_integrations')
      .select('*')
      .eq('instance_name', instance)
      .single();

    if (integrationError || !integration) {
      console.error('Integration not found for instance:', instance);
      return new Response(
        JSON.stringify({ error: 'Integration not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update last connection and status
    if (event === 'connection.update') {
      const status = data.state === 'open' ? 'connected' : 'disconnected';
      await supabaseClient
        .from('evolution_integrations')
        .update({ 
          last_connection: new Date().toISOString(),
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', integration.id);
    }

    // Process messages
    if (event === 'messages.upsert' && integration.auto_create_cards) {
      await processMessage(supabaseClient, integration, data);
    }

    return new Response(
      JSON.stringify({ message: 'Webhook processed successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Error processing webhook' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processMessage(supabaseClient: any, integration: any, messageData: any) {
  try {
    const message = messageData.messages?.[0];
    if (!message) return;

    // Only process incoming text messages
    if (message.key?.fromMe || message.message?.conversation === undefined) {
      return;
    }

    const phoneNumber = message.key?.remoteJid?.replace('@s.whatsapp.net', '');
    const messageText = message.message.conversation;
    const timestamp = new Date((message.messageTimestamp || Date.now()) * 1000).toISOString();

    // Check if card already exists for this contact
    const { data: existingCard, error: cardError } = await supabaseClient
      .from('cards')
      .select('id, title, description')
      .eq('customer_profile_id', phoneNumber)
      .eq('column_id', (await getFirstColumnId(supabaseClient, integration.pipeline_id)).columnId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cardError) {
      console.error('Error checking existing card:', cardError);
      return;
    }

    if (existingCard) {
      // Update existing card with new message
      const updatedDescription = existingCard.description 
        ? `${existingCard.description}\n[${timestamp}] 👤 Cliente: ${messageText}`
        : `[${timestamp}] 👤 Cliente: ${messageText}`;

      await supabaseClient
        .from('cards')
        .update({ 
          description: updatedDescription,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingCard.id);
    } else {
      // Create new card for this contact
      const columnResult = await getFirstColumnId(supabaseClient, integration.pipeline_id);
      
      if (columnResult.error) {
        console.error('Error getting first column:', columnResult.error);
        return;
      }

      const { data: newCard, error: createError } = await supabaseClient
        .from('cards')
        .insert({
          title: `WhatsApp: ${phoneNumber}`,
          description: `[${timestamp}] 👤 Cliente: ${messageText}`,
          column_id: columnResult.columnId,
          customer_profile_id: phoneNumber,
          inbox_name: 'WhatsApp'
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating card:', createError);
        return;
      }

      // Create lead data entry
      await supabaseClient
        .from('lead_data')
        .insert({
          card_id: newCard.id,
          phone: phoneNumber,
          full_name: phoneNumber
        });
    }

    // Trigger AI analysis if enabled
    if (integration.analyze_messages) {
      // This would trigger an AI analysis function
      console.log('AI analysis would be triggered for message from:', phoneNumber);
    }
  } catch (error) {
    console.error('Error processing message:', error);
  }
}

async function getFirstColumnId(supabaseClient: any, pipelineId: string) {
  const { data, error } = await supabaseClient
    .from('columns')
    .select('id')
    .eq('pipeline_id', pipelineId)
    .order('position', { ascending: true })
    .limit(1)
    .maybeSingle();

  return { columnId: data?.id, error };
}