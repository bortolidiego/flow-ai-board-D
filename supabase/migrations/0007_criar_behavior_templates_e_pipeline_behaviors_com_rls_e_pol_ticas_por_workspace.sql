-- Extensão necessária
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Tabela behavior_templates (catálogo de templates)
CREATE TABLE IF NOT EXISTS public.behavior_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  business_type TEXT NOT NULL,
  config JSONB NOT NULL,
  is_system BOOLEAN DEFAULT FALSE,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2) Tabela pipeline_behaviors (1:1 com pipelines)
CREATE TABLE IF NOT EXISTS public.pipeline_behaviors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_id UUID NOT NULL UNIQUE REFERENCES public.pipelines(id) ON DELETE CASCADE,
  behavior_template_id UUID REFERENCES public.behavior_templates(id) ON DELETE SET NULL,
  is_customized BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.behavior_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_behaviors ENABLE ROW LEVEL SECURITY;

-- Políticas:
DO $$
BEGIN
  -- behavior_templates: leitura para usuários autenticados (catálogo)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='behavior_templates' AND policyname='behavior_templates_select_authenticated'
  ) THEN
    CREATE POLICY behavior_templates_select_authenticated ON public.behavior_templates
      FOR SELECT TO authenticated
      USING (true);
  END IF;

  -- pipeline_behaviors: por workspace da pipeline
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='pipeline_behaviors' AND policyname='pipeline_behaviors_select_policy'
  ) THEN
    CREATE POLICY pipeline_behaviors_select_policy ON public.pipeline_behaviors
      FOR SELECT TO authenticated
      USING (EXISTS (
        SELECT 1 
        FROM public.pipelines p
        JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
        WHERE p.id = pipeline_behaviors.pipeline_id
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='pipeline_behaviors' AND policyname='pipeline_behaviors_insert_policy'
  ) THEN
    CREATE POLICY pipeline_behaviors_insert_policy ON public.pipeline_behaviors
      FOR INSERT TO authenticated
      WITH CHECK (EXISTS (
        SELECT 1 
        FROM public.pipelines p
        JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
        WHERE p.id = pipeline_behaviors.pipeline_id
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='pipeline_behaviors' AND policyname='pipeline_behaviors_update_policy'
  ) THEN
    CREATE POLICY pipeline_behaviors_update_policy ON public.pipeline_behaviors
      FOR UPDATE TO authenticated
      USING (EXISTS (
        SELECT 1 
        FROM public.pipelines p
        JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
        WHERE p.id = pipeline_behaviors.pipeline_id
      ))
      WITH CHECK (EXISTS (
        SELECT 1 
        FROM public.pipelines p
        JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
        WHERE p.id = pipeline_behaviors.pipeline_id
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='pipeline_behaviors' AND policyname='pipeline_behaviors_delete_policy'
  ) THEN
    CREATE POLICY pipeline_behaviors_delete_policy ON public.pipeline_behaviors
      FOR DELETE TO authenticated
      USING (EXISTS (
        SELECT 1 
        FROM public.pipelines p
        JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
        WHERE p.id = pipeline_behaviors.pipeline_id
      ));
  END IF;
END;
$$;