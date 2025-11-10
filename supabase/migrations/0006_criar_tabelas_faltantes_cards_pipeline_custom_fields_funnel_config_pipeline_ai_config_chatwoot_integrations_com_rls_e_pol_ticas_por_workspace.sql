-- Dependências
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enums
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'custom_field_type' AND pg_type.typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.custom_field_type AS ENUM ('text','number','date','email','phone','select');
  END IF;
END;
$$;

-- Garantir pipelines/columns existem (por segurança)
CREATE TABLE IF NOT EXISTS public.pipelines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.columns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  pipeline_id UUID NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1) cards
CREATE TABLE IF NOT EXISTS public.cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT,
  position INT NOT NULL DEFAULT 0,
  column_id UUID NOT NULL REFERENCES public.columns(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  assignee TEXT,
  ai_suggested BOOLEAN,
  ai_suggestions JSONB,
  chatwoot_agent_name TEXT,
  chatwoot_contact_email TEXT,
  chatwoot_contact_name TEXT,
  chatwoot_conversation_id TEXT,
  inbox_name TEXT,
  funnel_score INT,
  funnel_type TEXT,
  service_quality_score INT,
  subject TEXT,
  value NUMERIC,
  product_item TEXT,
  conversation_status TEXT,
  win_confirmation TEXT,
  loss_reason TEXT,
  custom_fields_data JSONB,
  completion_type TEXT,
  completion_reason TEXT,
  completed_at TIMESTAMPTZ,
  completed_by TEXT,
  customer_profile_id UUID,
  current_lifecycle_stage TEXT,
  lifecycle_progress_percent INT,
  resolution_status TEXT,
  is_monetary_locked BOOLEAN,
  last_activity_at TIMESTAMPTZ
);

-- 2) pipeline_custom_fields
CREATE TABLE IF NOT EXISTS public.pipeline_custom_fields (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_id UUID NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type public.custom_field_type NOT NULL,
  field_options JSONB,
  is_required BOOLEAN,
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3) funnel_config
CREATE TABLE IF NOT EXISTS public.funnel_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_id UUID NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
  funnel_type TEXT NOT NULL,
  funnel_name TEXT NOT NULL,
  color TEXT,
  position INT,
  is_monetary BOOLEAN,
  priority INT,
  lifecycle_stages JSONB,
  can_change_from_monetary BOOLEAN,
  inactivity_days INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4) pipeline_ai_config (1:1 com pipeline)
CREATE TABLE IF NOT EXISTS public.pipeline_ai_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_id UUID NOT NULL UNIQUE REFERENCES public.pipelines(id) ON DELETE CASCADE,
  business_type TEXT,
  objectives TEXT[],
  generated_prompt TEXT NOT NULL DEFAULT 'Você é um assistente de análise de conversas.',
  custom_prompt TEXT,
  use_custom_prompt BOOLEAN,
  model_name TEXT,
  analyze_on_close BOOLEAN,
  analyze_on_message BOOLEAN,
  examples JSONB,
  move_rules JSONB,
  success_rate NUMERIC,
  total_analyses INT,
  last_analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  template_id UUID
);

-- 5) chatwoot_integrations (1:1 com pipeline)
CREATE TABLE IF NOT EXISTS public.chatwoot_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_id UUID NOT NULL UNIQUE REFERENCES public.pipelines(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  chatwoot_url TEXT NOT NULL,
  chatwoot_api_key TEXT NOT NULL,
  inbox_id TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_ai_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatwoot_integrations ENABLE ROW LEVEL SECURITY;

-- Políticas por workspace (via joins até pipelines.workspace_id)
DO $$
BEGIN
  -- cards
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cards' AND policyname='cards_select_policy') THEN
    CREATE POLICY cards_select_policy ON public.cards
      FOR SELECT TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.columns c
        JOIN public.pipelines p ON p.id = c.pipeline_id
        JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
        WHERE c.id = cards.column_id
      ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cards' AND policyname='cards_insert_policy') THEN
    CREATE POLICY cards_insert_policy ON public.cards
      FOR INSERT TO authenticated
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.columns c
        JOIN public.pipelines p ON p.id = c.pipeline_id
        JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
        WHERE c.id = cards.column_id
      ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cards' AND policyname='cards_update_policy') THEN
    CREATE POLICY cards_update_policy ON public.cards
      FOR UPDATE TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.columns c
        JOIN public.pipelines p ON p.id = c.pipeline_id
        JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
        WHERE c.id = cards.column_id
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.columns c
        JOIN public.pipelines p ON p.id = c.pipeline_id
        JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
        WHERE c.id = cards.column_id
      ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cards' AND policyname='cards_delete_policy') THEN
    CREATE POLICY cards_delete_policy ON public.cards
      FOR DELETE TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.columns c
        JOIN public.pipelines p ON p.id = c.pipeline_id
        JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
        WHERE c.id = cards.column_id
      ));
  END IF;

  -- pipeline_custom_fields
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pipeline_custom_fields' AND policyname='pipeline_custom_fields_select_policy') THEN
    CREATE POLICY pipeline_custom_fields_select_policy ON public.pipeline_custom_fields
      FOR SELECT TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.pipelines p
        JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
        WHERE p.id = pipeline_custom_fields.pipeline_id
      ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pipeline_custom_fields' AND policyname='pipeline_custom_fields_insert_policy') THEN
    CREATE POLICY pipeline_custom_fields_insert_policy ON public.pipeline_custom_fields
      FOR INSERT TO authenticated
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.pipelines p
        JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
        WHERE p.id = pipeline_custom_fields.pipeline_id
      ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pipeline_custom_fields' AND policyname='pipeline_custom_fields_update_policy') THEN
    CREATE POLICY pipeline_custom_fields_update_policy ON public.pipeline_custom_fields
      FOR UPDATE TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.pipelines p
        JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
        WHERE p.id = pipeline_custom_fields.pipeline_id
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.pipelines p
        JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
        WHERE p.id = pipeline_custom_fields.pipeline_id
      ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pipeline_custom_fields' AND policyname='pipeline_custom_fields_delete_policy') THEN
    CREATE POLICY pipeline_custom_fields_delete_policy ON public.pipeline_custom_fields
      FOR DELETE TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.pipelines p
        JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
        WHERE p.id = pipeline_custom_fields.pipeline_id
      ));
  END IF;

  -- funnel_config
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='funnel_config' AND policyname='funnel_config_select_policy') THEN
    CREATE POLICY funnel_config_select_policy ON public.funnel_config
      FOR SELECT TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.pipelines p
        JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
        WHERE p.id = funnel_config.pipeline_id
      ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='funnel_config' AND policyname='funnel_config_insert_policy') THEN
    CREATE POLICY funnel_config_insert_policy ON public.funnel_config
      FOR INSERT TO authenticated
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.pipelines p
        JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
        WHERE p.id = funnel_config.pipeline_id
      ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='funnel_config' AND policyname='funnel_config_update_policy') THEN
    CREATE POLICY funnel_config_update_policy ON public.funnel_config
      FOR UPDATE TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.pipelines p
        JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
        WHERE p.id = funnel_config.pipeline_id
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.pipelines p
        JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
        WHERE p.id = funnel_config.pipeline_id
      ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='funnel_config' AND policyname='funnel_config_delete_policy') THEN
    CREATE POLICY funnel_config_delete_policy ON public.funnel_config
      FOR DELETE TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.pipelines p
        JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
        WHERE p.id = funnel_config.pipeline_id
      ));
  END IF;

  -- pipeline_ai_config
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pipeline_ai_config' AND policyname='pipeline_ai_config_select_policy') THEN
    CREATE POLICY pipeline_ai_config_select_policy ON public.pipeline_ai_config
      FOR SELECT TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.pipelines p
        JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
        WHERE p.id = pipeline_ai_config.pipeline_id
      ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pipeline_ai_config' AND policyname='pipeline_ai_config_insert_policy') THEN
    CREATE POLICY pipeline_ai_config_insert_policy ON public.pipeline_ai_config
      FOR INSERT TO authenticated
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.pipelines p
        JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
        WHERE p.id = pipeline_ai_config.pipeline_id
      ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pipeline_ai_config' AND policyname='pipeline_ai_config_update_policy') THEN
    CREATE POLICY pipeline_ai_config_update_policy ON public.pipeline_ai_config
      FOR UPDATE TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.pipelines p
        JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
        WHERE p.id = pipeline_ai_config.pipeline_id
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.pipelines p
        JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
        WHERE p.id = pipeline_ai_config.pipeline_id
      ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pipeline_ai_config' AND policyname='pipeline_ai_config_delete_policy') THEN
    CREATE POLICY pipeline_ai_config_delete_policy ON public.pipeline_ai_config
      FOR DELETE TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.pipelines p
        JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
        WHERE p.id = pipeline_ai_config.pipeline_id
      ));
  END IF;

  -- chatwoot_integrations
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chatwoot_integrations' AND policyname='chatwoot_integrations_select_policy') THEN
    CREATE POLICY chatwoot_integrations_select_policy ON public.chatwoot_integrations
      FOR SELECT TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.pipelines p
        JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
        WHERE p.id = chatwoot_integrations.pipeline_id
      ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chatwoot_integrations' AND policyname='chatwoot_integrations_insert_policy') THEN
    CREATE POLICY chatwoot_integrations_insert_policy ON public.chatwoot_integrations
      FOR INSERT TO authenticated
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.pipelines p
        JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
        WHERE p.id = chatwoot_integrations.pipeline_id
      ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chatwoot_integrations' AND policyname='chatwoot_integrations_update_policy') THEN
    CREATE POLICY chatwoot_integrations_update_policy ON public.chatwoot_integrations
      FOR UPDATE TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.pipelines p
        JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
        WHERE p.id = chatwoot_integrations.pipeline_id
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.pipelines p
        JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
        WHERE p.id = chatwoot_integrations.pipeline_id
      ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chatwoot_integrations' AND policyname='chatwoot_integrations_delete_policy') THEN
    CREATE POLICY chatwoot_integrations_delete_policy ON public.chatwoot_integrations
      FOR DELETE TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.pipelines p
        JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
        WHERE p.id = chatwoot_integrations.pipeline_id
      ));
  END IF;
END;
$$;