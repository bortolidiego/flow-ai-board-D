import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🕐 Starting inactivity check...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar todos os pipelines ativos
    const { data: pipelines } = await supabase
      .from('pipelines')
      .select('id');

    if (!pipelines || pipelines.length === 0) {
      console.log('No pipelines found');
      return new Response(
        JSON.stringify({ message: 'No pipelines to check' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let totalCardsProcessed = 0;
    let totalCardsMoved = 0;

    for (const pipeline of pipelines) {
      console.log(`\n📊 Checking pipeline ${pipeline.id}`);
      
      // Buscar regras de inatividade
      const { data: inactivityRules } = await supabase
        .from('pipeline_inactivity_config')
        .select('*')
        .eq('pipeline_id', pipeline.id);

      if (!inactivityRules || inactivityRules.length === 0) {
        console.log('No inactivity rules for this pipeline');
        continue;
      }

      console.log(`Found ${inactivityRules.length} inactivity rules`);

      // Buscar cards do pipeline
      const { data: cards } = await supabase
        .from('cards')
        .select('id, column_id, funnel_type, last_activity_at, created_at, resolution_status, lifecycle_progress_percent, value')
        .eq('pipeline_id', pipeline.id)
        .is('resolution_status', null); // Apenas cards não resolvidos

      if (!cards || cards.length === 0) {
        console.log('No cards to check');
        continue;
      }

      console.log(`Checking ${cards.length} cards`);

      const now = new Date();

      for (const card of cards) {
        totalCardsProcessed++;
        
        const lastActivity = card.last_activity_at 
          ? new Date(card.last_activity_at) 
          : new Date(card.created_at);
        
        const inactiveDays = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

        // Verificar cada regra de inatividade
        for (const rule of inactivityRules) {
          // Filtrar por funnel_type se especificado
          if (rule.funnel_type && rule.funnel_type !== card.funnel_type) {
            continue;
          }

          // Verificar se atingiu o threshold
          if (inactiveDays >= rule.inactivity_days) {
            console.log(`Card ${card.id} is inactive for ${inactiveDays} days (threshold: ${rule.inactivity_days})`);

            // Verificar condições adicionais
            let shouldApply = true;

            // Verificar se é apenas para não-monetários
            if (rule.only_if_non_monetary && card.value && card.value > 0) {
              console.log(`Skipping card ${card.id}: rule only applies to non-monetary cards`);
              shouldApply = false;
            }

            // Verificar progresso mínimo
            if (rule.only_if_progress_below && card.lifecycle_progress_percent >= rule.only_if_progress_below) {
              console.log(`Skipping card ${card.id}: progress ${card.lifecycle_progress_percent}% exceeds threshold ${rule.only_if_progress_below}%`);
              shouldApply = false;
            }

            if (!shouldApply) continue;

            // Aplicar ação: mover para coluna
            if (rule.move_to_column_name) {
              // Buscar coluna de destino
              const { data: targetColumn } = await supabase
                .from('columns')
                .select('id')
                .eq('pipeline_id', pipeline.id)
                .eq('name', rule.move_to_column_name)
                .maybeSingle();

              if (targetColumn && targetColumn.id !== card.column_id) {
                const { error: moveError } = await supabase
                  .from('cards')
                  .update({
                    column_id: targetColumn.id,
                    updated_at: now.toISOString()
                  })
                  .eq('id', card.id);

                if (!moveError) {
                  totalCardsMoved++;
                  console.log(`✅ Card ${card.id} moved to "${rule.move_to_column_name}"`);
                } else {
                  console.error(`❌ Error moving card ${card.id}:`, moveError);
                }
              }
            }

            // Aplicar ação: atualizar resolution_status
            if (rule.set_resolution_status) {
              const { error: updateError } = await supabase
                .from('cards')
                .update({
                  resolution_status: rule.set_resolution_status,
                  updated_at: now.toISOString()
                })
                .eq('id', card.id);

              if (!updateError) {
                console.log(`✅ Card ${card.id} resolution updated to "${rule.set_resolution_status}"`);
              } else {
                console.error(`❌ Error updating card ${card.id}:`, updateError);
              }
            }

            break; // Primeira regra que atende
          }
        }
      }
    }

    console.log(`\n✅ Inactivity check completed: ${totalCardsProcessed} cards processed, ${totalCardsMoved} cards moved`);

    return new Response(
      JSON.stringify({ 
        success: true,
        cardsProcessed: totalCardsProcessed,
        cardsMoved: totalCardsMoved
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in check-inactivity-cron:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
