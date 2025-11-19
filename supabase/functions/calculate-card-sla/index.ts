// @ts-nocheck

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
};

interface SLAStatus {
  status: 'ok' | 'warning' | 'overdue' | 'completed';
  elapsedMinutes: number;
  remainingMinutes: number;
  targetMinutes: number;
  strategy: string;
}

serve(async (req) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    });

    const { cardId } = await req.json();

    // Buscar card e pipeline config
    const { data: card } = await supabase
      .from('cards')
      .select(`
        id,
        created_at,
        updated_at,
        last_activity_at,
        completion_type,
        columns!inner(
          name,
          pipeline_id,
          pipelines!inner(
            id
          )
        )
      `)
      .eq('id', cardId)
      .single();

    if (!card) {
      return new Response(
        JSON.stringify({ error: 'Card not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Se card está finalizado, SLA não se aplica (completed)
    if (card.completion_type) {
      return new Response(
        JSON.stringify({ 
          cardId, 
          sla: { status: 'completed', elapsedMinutes: 0, remainingMinutes: 0, targetMinutes: 0 } 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar config de SLA
    const pipelineId = (card.columns as any).pipeline_id;
    const { data: slaConfig } = await supabase
      .from('pipeline_sla_config')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .single();
      
    // Definições padrão
    const firstResponseMinutes = slaConfig?.first_response_minutes || 60;
    const ongoingResponseMinutes = slaConfig?.ongoing_response_minutes || 1440; // 24h
    const warningThreshold = slaConfig?.warning_threshold_percent || 80;
    const strategy = slaConfig?.sla_strategy || 'response_time';

    const columnName = (card.columns as any).name;
    
    // Cards na coluna "Finalizados" são considerados completed para SLA
    if (columnName === 'Finalizados') {
      return new Response(
        JSON.stringify({ 
          cardId, 
          sla: { status: 'completed', elapsedMinutes: 0, remainingMinutes: 0, targetMinutes: 0 } 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    let targetMinutes: number;
    let baseTime: Date;
    
    // LÓGICA DE CÁLCULO BASEADA NA ESTRATÉGIA
    if (strategy === 'resolution_time') {
      // Estratégia: Tempo Total de Resolução
      // Conta desde a criação do card até agora
      targetMinutes = ongoingResponseMinutes;
      baseTime = new Date(card.created_at);
    } else {
      // Estratégia: Tempo de Resposta (Por Etapa/Atividade)
      
      if (columnName === 'Novo Contato' || columnName.toLowerCase().includes('novo')) {
        // Primeiro contato: conta desde a criação
        targetMinutes = firstResponseMinutes;
        baseTime = new Date(card.created_at);
      } else {
        // Resposta contínua: conta desde a última atividade ou atualização (mudança de coluna)
        targetMinutes = ongoingResponseMinutes;
        
        // Prioriza last_activity_at (interação real), fallback para updated_at (mudança de coluna), fallback created_at
        const lastTime = card.last_activity_at || card.updated_at || card.created_at;
        baseTime = new Date(lastTime);
      }
    }

    const now = new Date();
    const elapsedMs = now.getTime() - baseTime.getTime();
    const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));
    
    const remainingMinutes = Math.max(0, targetMinutes - elapsedMinutes);
    const percentElapsed = targetMinutes > 0 ? (elapsedMinutes / targetMinutes) * 100 : 100;
    
    // Determinar status
    let status: 'ok' | 'warning' | 'overdue';
    
    if (elapsedMinutes >= targetMinutes) {
      status = 'overdue';
    } else if (percentElapsed >= warningThreshold) {
      status = 'warning';
    } else {
      status = 'ok';
    }

    const sla: SLAStatus = {
      status,
      elapsedMinutes,
      remainingMinutes,
      targetMinutes,
      strategy
    };

    return new Response(
      JSON.stringify({ cardId, sla }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error calculating SLA:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unexpected error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});