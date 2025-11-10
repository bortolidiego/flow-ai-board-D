-- Seleciona pipeline da workspace KB Tech
WITH pw AS (
  SELECT p.id AS pipeline_id
  FROM public.workspaces w
  JOIN public.pipelines p ON p.workspace_id = w.id
  WHERE w.name = 'KB Tech'
  LIMIT 1
),
pid AS (
  SELECT pipeline_id FROM pw
),

-- Config JSON única para o template
config_json AS (
  SELECT jsonb_build_object(
    'stages', jsonb_build_array(
      jsonb_build_object('name','Novo Contato','position',0),
      jsonb_build_object('name','Em Atendimento','position',1),
      jsonb_build_object('name','Aguardando','position',2),
      jsonb_build_object('name','Finalizados','position',3)
    ),
    'custom_fields', jsonb_build_array(
      jsonb_build_object('field_name','produto_modelo','field_label','Produto/Modelo','field_type','text','is_required',true,'position',0),
      jsonb_build_object('field_name','imei_serie','field_label','IMEI/Número de Série','field_type','text','is_required',false,'position',1),
      jsonb_build_object('field_name','problema_relato','field_label','Problema Relatado','field_type','text','is_required',false,'position',2),
      jsonb_build_object('field_name','tipo_reparo','field_label','Tipo de Reparo','field_type','select','is_required',false,'position',3,'field_options', jsonb_build_object('options', jsonb_build_array('Troca de Tela','Bateria','Software','Conector','Outros'))),
      jsonb_build_object('field_name','estado_aparelho','field_label','Estado do Aparelho','field_type','select','is_required',false,'position',4,'field_options', jsonb_build_object('options', jsonb_build_array('Liga','Não Liga','Sem Áudio','Sem Imagem','Oxidação','Outros'))),
      jsonb_build_object('field_name','status_reparo','field_label','Status do Reparo','field_type','select','is_required',false,'position',5,'field_options', jsonb_build_object('options', jsonb_build_array('Pendente','Em Reparo','Aguardando Peça','Pronto'))),
      jsonb_build_object('field_name','valor_orcado','field_label','Valor Orçado','field_type','number','is_required',false,'position',6),
      jsonb_build_object('field_name','prazo_estimado','field_label','Prazo Estimado','field_type','date','is_required',false,'position',7),
      jsonb_build_object('field_name','forma_pagamento','field_label','Forma de Pagamento','field_type','select','is_required',false,'position',8,'field_options', jsonb_build_object('options', jsonb_build_array('PIX','Cartão','Dinheiro','Boleto'))),
      jsonb_build_object('field_name','nps','field_label','NPS (0-10)','field_type','number','is_required',false,'position',9),
      jsonb_build_object('field_name','prioridade_atendimento','field_label','Prioridade Atendimento','field_type','select','is_required',false,'position',10,'field_options', jsonb_build_object('options', jsonb_build_array('Baixa','Média','Alta')))
    ),
    'funnel_types', jsonb_build_array(
      jsonb_build_object(
        'funnel_type','venda',
        'funnel_name','Venda',
        'color','#8b5cf6',
        'is_monetary',true,
        'priority',1,
        'inactivity_days',7,
        'can_change_from_monetary',true,
        'lifecycle_stages', jsonb_build_array(
          jsonb_build_object('stage','Interesse','stage_name','Interesse','progress_percent',0,'is_initial',true,'is_terminal',false),
          jsonb_build_object('stage','Orçamento','stage_name','Orçamento','progress_percent',20,'is_terminal',false),
          jsonb_build_object('stage','Negociação','stage_name','Negociação','progress_percent',50,'is_terminal',false),
          jsonb_build_object('stage','Pagamento','stage_name','Pagamento','progress_percent',75,'is_terminal',false),
          jsonb_build_object('stage','Ganho','stage_name','Ganho','progress_percent',100,'is_terminal',true,'resolution_status','won'),
          jsonb_build_object('stage','Perdido','stage_name','Perdido','progress_percent',0,'is_terminal',true,'resolution_status','lost')
        )
      ),
      jsonb_build_object(
        'funnel_type','assistencia',
        'funnel_name','Assistência Técnica',
        'color','#06b6d4',
        'is_monetary',true,
        'priority',1,
        'inactivity_days',7,
        'can_change_from_monetary',true,
        'lifecycle_stages', jsonb_build_array(
          jsonb_build_object('stage','Diagnóstico','stage_name','Diagnóstico','progress_percent',0,'is_initial',true,'is_terminal',false),
          jsonb_build_object('stage','Orçamento','stage_name','Orçamento','progress_percent',20,'is_terminal',false),
          jsonb_build_object('stage','Aprovação','stage_name','Aprovação','progress_percent',40,'is_terminal',false),
          jsonb_build_object('stage','Em Reparo','stage_name','Em Reparo','progress_percent',60,'is_terminal',false),
          jsonb_build_object('stage','Pronto','stage_name','Pronto','progress_percent',80,'is_terminal',false),
          jsonb_build_object('stage','Entregue','stage_name','Entregue','progress_percent',100,'is_terminal',true,'resolution_status','won'),
          jsonb_build_object('stage','Cancelado','stage_name','Cancelado','progress_percent',0,'is_terminal',true,'resolution_status','lost')
        )
      ),
      jsonb_build_object(
        'funnel_type','duvida',
        'funnel_name','Dúvida',
        'color','#f59e0b',
        'is_monetary',false,
        'priority',3,
        'inactivity_days',3,
        'lifecycle_stages', jsonb_build_array(
          jsonb_build_object('stage','Recebimento','stage_name','Recebimento','progress_percent',0,'is_initial',true,'is_terminal',false),
          jsonb_build_object('stage','Em Análise','stage_name','Em Análise','progress_percent',50,'is_terminal',false),
          jsonb_build_object('stage','Respondido','stage_name','Respondido','progress_percent',100,'is_terminal',true,'resolution_status','resolved'),
          jsonb_build_object('stage','Não Resolvido','stage_name','Não Resolvido','progress_percent',0,'is_terminal',true,'resolution_status','unresolved')
        )
      ),
      jsonb_build_object(
        'funnel_type','reclamacao',
        'funnel_name','Reclamação',
        'color','#ef4444',
        'is_monetary',false,
        'priority',1,
        'inactivity_days',5,
        'lifecycle_stages', jsonb_build_array(
          jsonb_build_object('stage','Recebimento','stage_name','Recebimento','progress_percent',0,'is_initial',true,'is_terminal',false),
          jsonb_build_object('stage','Análise','stage_name','Análise','progress_percent',30,'is_terminal',false),
          jsonb_build_object('stage','Resolução','stage_name','Resolução','progress_percent',70,'is_terminal',false),
          jsonb_build_object('stage','Resolvido','stage_name','Resolvido','progress_percent',100,'is_terminal',true,'resolution_status','resolved'),
          jsonb_build_object('stage','Não Resolvido','stage_name','Não Resolvido','progress_percent',0,'is_terminal',true,'resolution_status','unresolved')
        )
      ),
      jsonb_build_object(
        'funnel_type','garantia',
        'funnel_name','Garantia',
        'color','#22c55e',
        'is_monetary',false,
        'priority',2,
        'inactivity_days',7,
        'lifecycle_stages', jsonb_build_array(
          jsonb_build_object('stage','Recebimento','stage_name','Recebimento','progress_percent',0,'is_initial',true,'is_terminal',false),
          jsonb_build_object('stage','Análise','stage_name','Análise','progress_percent',25,'is_terminal',false),
          jsonb_build_object('stage','Aprovado','stage_name','Aprovado','progress_percent',50,'is_terminal',false),
          jsonb_build_object('stage','Em Processamento','stage_name','Em Processamento','progress_percent',75,'is_terminal',false),
          jsonb_build_object('stage','Concluído','stage_name','Concluído','progress_percent',100,'is_terminal',true,'resolution_status','won'),
          jsonb_build_object('stage','Negado','stage_name','Negado','progress_percent',0,'is_terminal',true,'resolution_status','lost')
        )
      )
    ),
    'movement_rules', jsonb_build_array(
      jsonb_build_object('funnel_type','venda','when_lifecycle_stage','Ganho','move_to_column_name','Finalizados','is_active',true),
      jsonb_build_object('funnel_type','assistencia','when_lifecycle_stage','Cancelado','move_to_column_name','Finalizados','is_active',true),
      jsonb_build_object('funnel_type','assistencia','when_lifecycle_stage','Entregue','move_to_column_name','Finalizados','is_active',true),
      jsonb_build_object('funnel_type','garantia','when_lifecycle_stage','Negado','move_to_column_name','Finalizados','is_active',true),
      jsonb_build_object('funnel_type','garantia','when_lifecycle_stage','Concluído','move_to_column_name','Finalizados','is_active',true),
      jsonb_build_object('funnel_type','reclamacao','when_lifecycle_stage','Resolvido','move_to_column_name','Finalizados','is_active',true),
      jsonb_build_object('funnel_type','duvida','when_lifecycle_stage','Respondido','move_to_column_name','Finalizados','is_active',true)
    ),
    'inactivity_rules', jsonb_build_array(
      jsonb_build_object('funnel_type','assistencia','inactivity_days',7,'move_to_column_name','Aguardando','set_resolution_status',NULL,'only_if_non_monetary',true,'only_if_progress_below',60),
      jsonb_build_object('funnel_type','duvida','inactivity_days',3,'move_to_column_name','Finalizados','set_resolution_status','unresolved','only_if_non_monetary',true,'only_if_progress_below',50),
      jsonb_build_object('funnel_type','venda','inactivity_days',7,'move_to_column_name','Aguardando','set_resolution_status',NULL,'only_if_non_monetary',true,'only_if_progress_below',30)
    ),
    'ai_config', jsonb_build_object(
      'business_type','services',
      'objectives', jsonb_build_array('qualify_leads','identify_service_needs','assess_customer_satisfaction','extract_contact_data'),
      'generated_prompt','Você é um assistente de análise de conversas. Analise e extraia dados estruturados. Seja objetivo e extraia apenas informações explicitamente mencionadas.',
      'use_custom_prompt',false,
      'model_name','google/gemini-2.5-flash',
      'analyze_on_close',true,
      'analyze_on_message',true
    )
  ) AS cfg
),

-- 1) Template (upsert manual por name)
existing_template AS (
  SELECT id FROM public.behavior_templates 
  WHERE name = 'Loja de Eletrônicos com Assistência Técnica'
  LIMIT 1
),
upd_template AS (
  UPDATE public.behavior_templates bt
  SET 
    description = 'Template completo para lojas de eletrônicos com serviços de reparo. Inclui controle de SLA, monitoramento de tempo de atendimento e movimentação automática inteligente.',
    business_type = 'services',
    config = (SELECT cfg FROM config_json),
    is_system = TRUE,
    updated_at = NOW()
  WHERE bt.id = (SELECT id FROM existing_template)
  RETURNING bt.id
),
ins_template AS (
  INSERT INTO public.behavior_templates (id, name, description, business_type, config, is_system, created_by)
  SELECT 
    gen_random_uuid(),
    'Loja de Eletrônicos com Assistência Técnica',
    'Template completo para lojas de eletrônicos com serviços de reparo. Inclui controle de SLA, monitoramento de tempo de atendimento e movimentação automática inteligente.',
    'services',
    (SELECT cfg FROM config_json),
    TRUE,
    'system'
  WHERE NOT EXISTS (SELECT 1 FROM existing_template)
  RETURNING id
),
tpl AS (
  SELECT COALESCE((SELECT id FROM upd_template),(SELECT id FROM ins_template)) AS template_id
),

-- 2) Colunas (garante 4)
ensure_columns AS (
  INSERT INTO public.columns (pipeline_id, name, position)
  SELECT (SELECT pipeline_id FROM pid), x.name, x.position
  FROM (VALUES
    ('Novo Contato',0),
    ('Em Atendimento',1),
    ('Aguardando',2),
    ('Finalizados',3)
  ) AS x(name,position)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.columns c 
    WHERE c.pipeline_id = (SELECT pipeline_id FROM pid) AND c.name = x.name
  )
  RETURNING 1
),
update_positions AS (
  UPDATE public.columns c
  SET position = x.position
  FROM (VALUES
    ('Novo Contato',0),
    ('Em Atendimento',1),
    ('Aguardando',2),
    ('Finalizados',3)
  ) AS x(name,position)
  WHERE c.pipeline_id = (SELECT pipeline_id FROM pid)
    AND c.name = x.name
  RETURNING 1
),

-- 3) Campos personalizados (substitui todos)
del_fields AS (
  DELETE FROM public.pipeline_custom_fields 
  WHERE pipeline_id = (SELECT pipeline_id FROM pid)
  RETURNING 1
),
ins_fields AS (
  INSERT INTO public.pipeline_custom_fields (pipeline_id, field_name, field_label, field_type, field_options, is_required, position)
  VALUES
    ((SELECT pipeline_id FROM pid),'produto_modelo','Produto/Modelo','text',NULL,TRUE,0),
    ((SELECT pipeline_id FROM pid),'imei_serie','IMEI/Número de Série','text',NULL,FALSE,1),
    ((SELECT pipeline_id FROM pid),'problema_relato','Problema Relatado','text',NULL,FALSE,2),
    ((SELECT pipeline_id FROM pid),'tipo_reparo','Tipo de Reparo','select', jsonb_build_object('options', jsonb_build_array('Troca de Tela','Bateria','Software','Conector','Outros')),FALSE,3),
    ((SELECT pipeline_id FROM pid),'estado_aparelho','Estado do Aparelho','select', jsonb_build_object('options', jsonb_build_array('Liga','Não Liga','Sem Áudio','Sem Imagem','Oxidação','Outros')),FALSE,4),
    ((SELECT pipeline_id FROM pid),'status_reparo','Status do Reparo','select', jsonb_build_object('options', jsonb_build_array('Pendente','Em Reparo','Aguardando Peça','Pronto')),FALSE,5),
    ((SELECT pipeline_id FROM pid),'valor_orcado','Valor Orçado','number',NULL,FALSE,6),
    ((SELECT pipeline_id FROM pid),'prazo_estimado','Prazo Estimado','date',NULL,FALSE,7),
    ((SELECT pipeline_id FROM pid),'forma_pagamento','Forma de Pagamento','select', jsonb_build_object('options', jsonb_build_array('PIX','Cartão','Dinheiro','Boleto')),FALSE,8),
    ((SELECT pipeline_id FROM pid),'nps','NPS (0-10)','number',NULL,FALSE,9),
    ((SELECT pipeline_id FROM pid),'prioridade_atendimento','Prioridade Atendimento','select', jsonb_build_object('options', jsonb_build_array('Baixa','Média','Alta')),FALSE,10)
  RETURNING 1
),

-- 4) Funis (substitui todos, omitindo Acompanhamento e Pesquisa de Satisfação)
del_funnels AS (
  DELETE FROM public.funnel_config WHERE pipeline_id = (SELECT pipeline_id FROM pid)
  RETURNING 1
),
ins_funnels AS (
  INSERT INTO public.funnel_config (pipeline_id, funnel_type, funnel_name, color, position, is_monetary, priority, lifecycle_stages, inactivity_days, can_change_from_monetary)
  VALUES
    ((SELECT pipeline_id FROM pid),'venda','Venda','#8b5cf6',0,TRUE,1,
      '[
        {"stage":"Interesse","stage_name":"Interesse","progress_percent":0,"is_initial":true},
        {"stage":"Orçamento","stage_name":"Orçamento","progress_percent":20},
        {"stage":"Negociação","stage_name":"Negociação","progress_percent":50},
        {"stage":"Pagamento","stage_name":"Pagamento","progress_percent":75},
        {"stage":"Ganho","stage_name":"Ganho","progress_percent":100,"is_terminal":true,"resolution_status":"won"},
        {"stage":"Perdido","stage_name":"Perdido","progress_percent":0,"is_terminal":true,"resolution_status":"lost"}
      ]'::jsonb,7,TRUE),
    ((SELECT pipeline_id FROM pid),'assistencia','Assistência Técnica','#06b6d4',1,TRUE,1,
      '[
        {"stage":"Diagnóstico","stage_name":"Diagnóstico","progress_percent":0,"is_initial":true},
        {"stage":"Orçamento","stage_name":"Orçamento","progress_percent":20},
        {"stage":"Aprovação","stage_name":"Aprovação","progress_percent":40},
        {"stage":"Em Reparo","stage_name":"Em Reparo","progress_percent":60},
        {"stage":"Pronto","stage_name":"Pronto","progress_percent":80},
        {"stage":"Entregue","stage_name":"Entregue","progress_percent":100,"is_terminal":true,"resolution_status":"won"},
        {"stage":"Cancelado","stage_name":"Cancelado","progress_percent":0,"is_terminal":true,"resolution_status":"lost"}
      ]'::jsonb,7,TRUE),
    ((SELECT pipeline_id FROM pid),'duvida','Dúvida','#f59e0b',2,FALSE,3,
      '[
        {"stage":"Recebimento","stage_name":"Recebimento","progress_percent":0,"is_initial":true},
        {"stage":"Em Análise","stage_name":"Em Análise","progress_percent":50},
        {"stage":"Respondido","stage_name":"Respondido","progress_percent":100,"is_terminal":true,"resolution_status":"resolved"},
        {"stage":"Não Resolvido","stage_name":"Não Resolvido","progress_percent":0,"is_terminal":true,"resolution_status":"unresolved"}
      ]'::jsonb,3,TRUE),
    ((SELECT pipeline_id FROM pid),'reclamacao','Reclamação','#ef4444',3,FALSE,1,
      '[
        {"stage":"Recebimento","stage_name":"Recebimento","progress_percent":0,"is_initial":true},
        {"stage":"Análise","stage_name":"Análise","progress_percent":30},
        {"stage":"Resolução","stage_name":"Resolução","progress_percent":70},
        {"stage":"Resolvido","stage_name":"Resolvido","progress_percent":100,"is_terminal":true,"resolution_status":"resolved"},
        {"stage":"Não Resolvido","stage_name":"Não Resolvido","progress_percent":0,"is_terminal":true,"resolution_status":"unresolved"}
      ]'::jsonb,5,TRUE),
    ((SELECT pipeline_id FROM pid),'garantia','Garantia','#22c55e',4,FALSE,2,
      '[
        {"stage":"Recebimento","stage_name":"Recebimento","progress_percent":0,"is_initial":true},
        {"stage":"Análise","stage_name":"Análise","progress_percent":25},
        {"stage":"Aprovado","stage_name":"Aprovado","progress_percent":50},
        {"stage":"Em Processamento","stage_name":"Em Processamento","progress_percent":75},
        {"stage":"Concluído","stage_name":"Concluído","progress_percent":100,"is_terminal":true,"resolution_status":"won"},
        {"stage":"Negado","stage_name":"Negado","progress_percent":0,"is_terminal":true,"resolution_status":"lost"}
      ]'::jsonb,7,TRUE)
  RETURNING 1
),

-- 5) Regras de movimentação (substitui todas)
del_move AS (DELETE FROM public.pipeline_movement_rules WHERE pipeline_id = (SELECT pipeline_id FROM pid) RETURNING 1),
ins_move AS (
  INSERT INTO public.pipeline_movement_rules (pipeline_id, funnel_type, when_lifecycle_stage, move_to_column_name, is_active, priority)
  VALUES
    ((SELECT pipeline_id FROM pid),'venda','Ganho','Finalizados',TRUE,1),
    ((SELECT pipeline_id FROM pid),'assistencia','Cancelado','Finalizados',TRUE,2),
    ((SELECT pipeline_id FROM pid),'assistencia','Entregue','Finalizados',TRUE,3),
    ((SELECT pipeline_id FROM pid),'garantia','Negado','Finalizados',TRUE,4),
    ((SELECT pipeline_id FROM pid),'garantia','Concluído','Finalizados',TRUE,5),
    ((SELECT pipeline_id FROM pid),'reclamacao','Resolvido','Finalizados',TRUE,6),
    ((SELECT pipeline_id FROM pid),'duvida','Respondido','Finalizados',TRUE,7)
  RETURNING 1
),

-- 6) Regras de inatividade
del_inact AS (DELETE FROM public.pipeline_inactivity_config WHERE pipeline_id = (SELECT pipeline_id FROM pid) RETURNING 1),
ins_inact AS (
  INSERT INTO public.pipeline_inactivity_config (pipeline_id, funnel_type, inactivity_days, move_to_column_name, set_resolution_status, only_if_non_monetary, only_if_progress_below)
  VALUES
    ((SELECT pipeline_id FROM pid),'assistencia',7,'Aguardando',NULL,TRUE,60),
    ((SELECT pipeline_id FROM pid),'duvida',3,'Finalizados','unresolved',TRUE,50),
    ((SELECT pipeline_id FROM pid),'venda',7,'Aguardando',NULL,TRUE,30)
  RETURNING 1
),

-- 7) AI Config (upsert manual por pipeline_id)
existing_ai AS (
  SELECT id FROM public.pipeline_ai_config WHERE pipeline_id = (SELECT pipeline_id FROM pid) LIMIT 1
),
upd_ai AS (
  UPDATE public.pipeline_ai_config
  SET
    business_type = 'services',
    objectives = ARRAY['qualify_leads','identify_service_needs','assess_customer_satisfaction','extract_contact_data'],
    generated_prompt = 'Você é um assistente de análise de conversas. Analise e extraia dados estruturados. Seja objetivo e extraia apenas informações explicitamente mencionadas.',
    use_custom_prompt = FALSE,
    model_name = 'google/gemini-2.5-flash',
    analyze_on_close = TRUE,
    analyze_on_message = TRUE,
    updated_at = NOW()
  WHERE id = (SELECT id FROM existing_ai)
  RETURNING id
),
ins_ai AS (
  INSERT INTO public.pipeline_ai_config (pipeline_id, business_type, objectives, generated_prompt, use_custom_prompt, model_name, analyze_on_close, analyze_on_message)
  SELECT (SELECT pipeline_id FROM pid),
    'services',
    ARRAY['qualify_leads','identify_service_needs','assess_customer_satisfaction','extract_contact_data'],
    'Você é um assistente de análise de conversas. Analise e extraia dados estruturados. Seja objetivo e extraia apenas informações explicitamente mencionadas.',
    FALSE,
    'google/gemini-2.5-flash',
    TRUE,
    TRUE
  WHERE NOT EXISTS (SELECT 1 FROM existing_ai)
  RETURNING id
),

-- 8) Registrar vínculo do template na pipeline (upsert manual por pipeline_id)
existing_behavior AS (
  SELECT id FROM public.pipeline_behaviors WHERE pipeline_id = (SELECT pipeline_id FROM pid) LIMIT 1
),
upd_behavior AS (
  UPDATE public.pipeline_behaviors
  SET behavior_template_id = (SELECT template_id FROM tpl),
      is_customized = FALSE,
      updated_at = NOW()
  WHERE id = (SELECT id FROM existing_behavior)
  RETURNING id
),
ins_behavior AS (
  INSERT INTO public.pipeline_behaviors (pipeline_id, behavior_template_id, is_customized)
  SELECT (SELECT pipeline_id FROM pid), (SELECT template_id FROM tpl), FALSE
  WHERE NOT EXISTS (SELECT 1 FROM existing_behavior)
  RETURNING id
)

SELECT 'ok';