// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting periodic AI analysis of cards...');

    // Find cards that need analysis:
    // 1. Cards without conversation_summary (never analyzed)
    // 2. Cards updated in the last 30 minutes that don't have recent analysis
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    const { data: cardsToAnalyze, error: fetchError } = await supabase
      .from('cards')
      .select('id, updated_at, conversation_summary')
      .or(`conversation_summary.is.null,and(updated_at.gte.${thirtyMinutesAgo},conversation_summary.is.null)`)
      .limit(20); // Process max 20 cards per cron run to avoid timeouts

    if (fetchError) {
      console.error('Error fetching cards:', fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!cardsToAnalyze || cardsToAnalyze.length === 0) {
      console.log('No cards need analysis at this time');
      return new Response(JSON.stringify({ 
        message: 'No cards to analyze',
        processed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${cardsToAnalyze.length} cards to analyze`);

    // Analyze cards sequentially to avoid rate limits
    const results = [];
    for (const card of cardsToAnalyze) {
      try {
        console.log(`Analyzing card ${card.id}...`);
        
        // Usando a chave de serviço para autenticar a chamada interna
        const { data, error: analysisError } = await supabase.functions.invoke('analyze-conversation', {
          body: { cardId: card.id },
          headers: { Authorization: `Bearer ${supabaseKey}` }
        });

        if (analysisError) {
          console.error(`Error analyzing card ${card.id}:`, analysisError);
          results.push({ cardId: card.id, status: 'error', error: analysisError.message });
        } else {
          console.log(`Successfully analyzed card ${card.id}`);
          results.push({ cardId: card.id, status: 'success' });
        }

        // Add small delay between requests to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to analyze card ${card.id}:`, error);
        results.push({ 
          cardId: card.id, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    console.log(`Completed analysis: ${successCount}/${results.length} successful`);

    return new Response(JSON.stringify({ 
      message: 'Periodic analysis completed',
      processed: results.length,
      successful: successCount,
      results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-cards-cron:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});