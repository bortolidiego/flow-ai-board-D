-- 1) Verificar existência da função de autorização
SELECT EXISTS (
  SELECT 1 
  FROM pg_proc p 
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' 
    AND p.proname = 'user_is_workspace_member'
) AS user_is_workspace_member_exists;

-- 2) Verificar se as tabelas críticas existem
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'pipelines','columns','cards',
    'pipeline_ai_config','pipeline_custom_fields','funnel_config',
    'pipeline_movement_rules','pipeline_inactivity_config',
    'chatwoot_integrations','workspace_members','workspaces',
    'card_analysis_history','lead_data','pipeline_behaviors'
  )
ORDER BY table_name;

-- 3) Verificar se RLS está habilitado por tabela
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'pipelines','columns','cards',
    'pipeline_ai_config','pipeline_custom_fields','funnel_config',
    'pipeline_movement_rules','pipeline_inactivity_config',
    'chatwoot_integrations','workspace_members','workspaces',
    'card_analysis_history','lead_data','pipeline_behaviors'
  )
ORDER BY c.relname;

-- 4) Contagem de políticas por tabela
SELECT tablename, COUNT(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'pipelines','columns','cards',
    'pipeline_ai_config','pipeline_custom_fields','funnel_config',
    'pipeline_movement_rules','pipeline_inactivity_config',
    'chatwoot_integrations','workspace_members','workspaces',
    'card_analysis_history','lead_data','pipeline_behaviors'
  )
GROUP BY tablename
ORDER BY tablename;

-- 5) Detalhes das políticas (cmd, roles, qual, with_check)
SELECT policyname, tablename, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'pipelines','columns','cards',
    'pipeline_ai_config','pipeline_custom_fields','funnel_config',
    'pipeline_movement_rules','pipeline_inactivity_config',
    'chatwoot_integrations','workspace_members','workspaces',
    'card_analysis_history','lead_data','pipeline_behaviors'
  )
ORDER BY tablename, policyname;