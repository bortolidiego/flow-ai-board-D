-- Extensão para UUID
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tabela pipeline_movement_rules
CREATE TABLE IF NOT EXISTS public.pipeline_movement_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_id UUID NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
  funnel_type TEXT NOT NULL,
  move_to_column_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  priority INT,
  when_conversation_status TEXT,
  when_inactivity_days INT,
  when_lifecycle_stage TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela pipeline_inactivity_config
CREATE TABLE IF NOT EXISTS public.pipeline_inactivity_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_id UUID NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
  funnel_type TEXT NOT NULL,
  inactivity_days INT NOT NULL,
  move_to_column_name TEXT,
  set_resolution_status TEXT,
  only_if_non_monetary BOOLEAN,
  only_if_progress_below INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.pipeline_movement_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_inactivity_config ENABLE ROW LEVEL SECURITY;

-- Políticas por workspace (via join até pipelines.workspace_id)
DO $$
BEGIN
  -- SELECT
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pipeline_movement_rules' AND policyname='pipeline_movement_rules_select_policy') THEN
    CREATE POLICY pipeline_movement_rules_select_policy ON public.pipeline_movement_rules
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.pipelines p
          JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
          WHERE p.id = pipeline_movement_rules.pipeline_id
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pipeline_inactivity_config' AND policyname='pipeline_inactivity_config_select_policy') THEN
    CREATE POLICY pipeline_inactivity_config_select_policy ON public.pipeline_inactivity_config
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.pipelines p
          JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
          WHERE p.id = pipeline_inactivity_config.pipeline_id
        )
      );
  END IF;

  -- INSERT
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pipeline_movement_rules' AND policyname='pipeline_movement_rules_insert_policy') THEN
    CREATE POLICY pipeline_movement_rules_insert_policy ON public.pipeline_movement_rules
      FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.pipelines p
          JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
          WHERE p.id = pipeline_movement_rules.pipeline_id
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pipeline_inactivity_config' AND policyname='pipeline_inactivity_config_insert_policy') THEN
    CREATE POLICY pipeline_inactivity_config_insert_policy ON public.pipeline_inactivity_config
      FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.pipelines p
          JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
          WHERE p.id = pipeline_inactivity_config.pipeline_id
        )
      );
  END IF;

  -- UPDATE
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pipeline_movement_rules' AND policyname='pipeline_movement_rules_update_policy') THEN
    CREATE POLICY pipeline_movement_rules_update_policy ON public.pipeline_movement_rules
      FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.pipelines p
          JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
          WHERE p.id = pipeline_movement_rules.pipeline_id
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.pipelines p
          JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
          WHERE p.id = pipeline_movement_rules.pipeline_id
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pipeline_inactivity_config' AND policyname='pipeline_inactivity_config_update_policy') THEN
    CREATE POLICY pipeline_inactivity_config_update_policy ON public.pipeline_inactivity_config
      FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.pipelines p
          JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
          WHERE p.id = pipeline_inactivity_config.pipeline_id
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.pipelines p
          JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
          WHERE p.id = pipeline_inactivity_config.pipeline_id
        )
      );
  END IF;

  -- DELETE
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pipeline_movement_rules' AND policyname='pipeline_movement_rules_delete_policy') THEN
    CREATE POLICY pipeline_movement_rules_delete_policy ON public.pipeline_movement_rules
      FOR DELETE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.pipelines p
          JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
          WHERE p.id = pipeline_movement_rules.pipeline_id
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pipeline_inactivity_config' AND policyname='pipeline_inactivity_config_delete_policy') THEN
    CREATE POLICY pipeline_inactivity_config_delete_policy ON public.pipeline_inactivity_config
      FOR DELETE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.pipelines p
          JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
          WHERE p.id = pipeline_inactivity_config.pipeline_id
        )
      );
  END IF;
END;
$$;