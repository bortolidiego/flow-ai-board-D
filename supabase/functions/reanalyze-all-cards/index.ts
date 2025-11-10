import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { pipelineId } = await req.json();

    // Verify pipeline ownership
    const { data: pipeline, error: pipelineError } = await supabase
      .from('pipelines')
      .select('created_by')
      .eq('id', pipelineId)
      .single();

    if (pipelineError || !pipeline) {
      console.error('Pipeline error:', pipelineError);
      return new Response(
        JSON.stringify({ error: 'Pipeline not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (pipeline.created_by !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: You do not own this pipeline' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting reanalysis of all cards for pipeline:', pipelineId);

    // Get all cards for the specified pipeline
    let query = supabase
      .from('cards')
      .select(`
        id, 
        title, 
        column_id,
        columns!inner(pipeline_id)
      `);

    if (pipelineId) {
      query = query.eq('columns.pipeline_id', pipelineId);
    }

    const { data: cardsToAnalyze, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching cards:', fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!cardsToAnalyze || cardsToAnalyze.length === 0) {
      console.log('No cards found to reanalyze');
      return new Response(JSON.stringify({ 
        message: 'No cards to reanalyze',
        processed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${cardsToAnalyze.length} cards to reanalyze`);

    // Analyze cards in batches to avoid timeouts
    const batchSize = 5;
    const results = [];
    
    for (let i = 0; i < cardsToAnalyze.length; i += batchSize) {
      const batch = cardsToAnalyze.slice(i, i + batchSize);
      
      for (const card of batch) {
        try {
          console.log(`Reanalyzing card ${card.id} (${i + batch.indexOf(card) + 1}/${cardsToAnalyze.length})...`);
          
          const { data, error: analysisError } = await supabase.functions.invoke('analyze-conversation', {
            body: { cardId: card.id }
          });

          if (analysisError) {
            console.error(`Error analyzing card ${card.id}:`, analysisError);
            results.push({ 
              cardId: card.id, 
              title: card.title,
              status: 'error', 
              error: analysisError.message 
            });
          } else {
            console.log(`Successfully reanalyzed card ${card.id}`);
            results.push({ 
              cardId: card.id, 
              title: card.title,
              status: 'success' 
            });
          }

          // Add delay between requests to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`Failed to analyze card ${card.id}:`, error);
          results.push({ 
            cardId: card.id,
            title: card.title, 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }

      // Longer delay between batches
      if (i + batchSize < cardsToAnalyze.length) {
        console.log(`Completed batch ${Math.floor(i / batchSize) + 1}, pausing before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    
    console.log(`Reanalysis completed: ${successCount} successful, ${errorCount} errors`);

    return new Response(JSON.stringify({ 
      message: 'Reanalysis completed',
      total: results.length,
      successful: successCount,
      errors: errorCount,
      results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in reanalyze-all-cards:', error);
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
