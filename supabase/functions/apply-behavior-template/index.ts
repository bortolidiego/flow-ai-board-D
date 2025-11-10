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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { template_id, pipeline_id } = await req.json();

    console.log('Applying template:', template_id, 'to pipeline:', pipeline_id);

    // Buscar template completo
    const { data: template, error: templateError } = await supabase
      .from('behavior_templates')
      .select('*')
      .eq('id', template_id)
      .single();

    if (templateError || !template) {
      throw new Error('Template not found');
    }

    const config = template.config;

    // Aplicar template ao pipeline único do workspace
    await applyConfigToPipeline(supabase, pipeline_id, config, template_id);

    return new Response(
      JSON.stringify({ success: true, pipeline_id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in apply-behavior-template:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function applyConfigToPipeline(supabase: any, pipelineId: string, config: any, templateId: string) {
  // 1. Criar/Atualizar etapas (columns)
  if (config.stages && Array.isArray(config.stages)) {
    // Deletar colunas antigas
    await supabase.from('columns').delete().eq('pipeline_id', pipelineId);

    // Criar novas
    const columnsToInsert = config.stages.map((stage: any) => ({
      pipeline_id: pipelineId,
      name: stage.name,
      position: stage.position,
    }));

    await supabase.from('columns').insert(columnsToInsert);
  }

  // 2. Criar/Atualizar campos customizados
  if (config.custom_fields && Array.isArray(config.custom_fields)) {
    await supabase.from('pipeline_custom_fields').delete().eq('pipeline_id', pipelineId);

    const fieldsToInsert = config.custom_fields.map((field: any) => ({
      pipeline_id: pipelineId,
      field_name: field.field_name,
      field_label: field.field_label,
      field_type: field.field_type,
      is_required: field.is_required || false,
      position: field.position || 0,
      field_options: field.field_options || null,
    }));

    await supabase.from('pipeline_custom_fields').insert(fieldsToInsert);
  }

  // 3. Criar/Atualizar tipos de funil com ciclos de vida
  if (config.funnel_types && Array.isArray(config.funnel_types)) {
    await supabase.from('funnel_config').delete().eq('pipeline_id', pipelineId);

    const funnelsToInsert = config.funnel_types.map((funnel: any) => ({
      pipeline_id: pipelineId,
      funnel_type: funnel.funnel_type,
      funnel_name: funnel.funnel_name,
      color: funnel.color || '#3b82f6',
      position: funnel.position || 0,
      
      // NOVOS CAMPOS
      is_monetary: funnel.is_monetary || false,
      priority: funnel.priority || 'medium',
      lifecycle_stages: funnel.lifecycle_stages || [],
      can_change_from_monetary: funnel.can_change_from_monetary !== false,
      inactivity_days: funnel.inactivity_days || null,
    }));

    await supabase.from('funnel_config').insert(funnelsToInsert);
  }

  // 4. Criar/Atualizar configuração da IA
  if (config.ai_config) {
    const { data: existing } = await supabase
      .from('pipeline_ai_config')
      .select('id')
      .eq('pipeline_id', pipelineId)
      .maybeSingle();

    const aiConfigData = {
      pipeline_id: pipelineId,
      business_type: config.ai_config.business_type || 'custom',
      objectives: config.ai_config.objectives || [],
      generated_prompt: config.ai_config.generated_prompt || 'Você é um assistente de análise de conversas.',
      custom_prompt: config.ai_config.custom_prompt || null,
      use_custom_prompt: config.ai_config.use_custom_prompt || false,
      model_name: config.ai_config.model_name || 'google/gemini-2.5-flash',
      analyze_on_close: config.ai_config.analyze_on_close !== false,
      analyze_on_message: config.ai_config.analyze_on_message || false,
    };

    if (existing) {
      await supabase
        .from('pipeline_ai_config')
        .update(aiConfigData)
        .eq('id', existing.id);
    } else {
      await supabase.from('pipeline_ai_config').insert(aiConfigData);
    }
  }

  // 5. Registrar em pipeline_behaviors
  const { data: existingBehavior } = await supabase
    .from('pipeline_behaviors')
    .select('id')
    .eq('pipeline_id', pipelineId)
    .maybeSingle();

  const behaviorData = {
    pipeline_id: pipelineId,
    behavior_template_id: templateId,
    is_customized: false,
  };

  if (existingBehavior) {
    await supabase
      .from('pipeline_behaviors')
      .update(behaviorData)
      .eq('id', existingBehavior.id);
  } else {
    await supabase.from('pipeline_behaviors').insert(behaviorData);
  }

  // 6. Criar/Atualizar regras de movimentação
  if (config.movement_rules && Array.isArray(config.movement_rules)) {
    await supabase.from('pipeline_movement_rules').delete().eq('pipeline_id', pipelineId);

    const rulesToInsert = config.movement_rules.map((rule: any) => ({
      pipeline_id: pipelineId,
      funnel_type: rule.funnel_type,
      when_lifecycle_stage: rule.when_lifecycle_stage,
      move_to_column_name: rule.move_to_column_name,
      is_active: rule.is_active !== false,
    }));

    await supabase.from('pipeline_movement_rules').insert(rulesToInsert);
  }

  // 7. Criar/Atualizar regras de inatividade
  if (config.inactivity_rules && Array.isArray(config.inactivity_rules)) {
    await supabase.from('pipeline_inactivity_config').delete().eq('pipeline_id', pipelineId);

    const inactivityRulesToInsert = config.inactivity_rules.map((rule: any) => ({
      pipeline_id: pipelineId,
      funnel_type: rule.funnel_type || null,
      inactivity_days: rule.inactivity_days,
      move_to_column_name: rule.move_to_column_name || null,
      set_resolution_status: rule.set_resolution_status || null,
      only_if_non_monetary: rule.only_if_non_monetary !== false,
      only_if_progress_below: rule.only_if_progress_below || null,
    }));

    await supabase.from('pipeline_inactivity_config').insert(inactivityRulesToInsert);
  }
}
