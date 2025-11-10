-- Dependência para gen_random_uuid
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Tabela pipelines
CREATE TABLE IF NOT EXISTS public.pipelines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2) Tabela columns
CREATE TABLE IF NOT EXISTS public.columns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  pipeline_id UUID NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3) Habilitar RLS
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.columns ENABLE ROW LEVEL SECURITY;

-- 4) Políticas idempotentes baseadas em membership do workspace (sem depender de funções)
DO $$
BEGIN
  -- pipelines
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pipelines' AND policyname='pipelines_select_policy') THEN
    CREATE POLICY pipelines_select_policy ON public.pipelines
      FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = pipelines.workspace_id AND wm.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pipelines' AND policyname='pipelines_insert_policy') THEN
    CREATE POLICY pipelines_insert_policy ON public.pipelines
      FOR INSERT TO authenticated
      WITH CHECK (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = pipelines.workspace_id AND wm.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pipelines' AND policyname='pipelines_update_policy') THEN
    CREATE POLICY pipelines_update_policy ON public.pipelines
      FOR UPDATE TO authenticated
      USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = pipelines.workspace_id AND wm.user_id = auth.uid()))
      WITH CHECK (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = pipelines.workspace_id AND wm.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pipelines' AND policyname='pipelines_delete_policy') THEN
    CREATE POLICY pipelines_delete_policy ON public.pipelines
      FOR DELETE TO authenticated
      USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = pipelines.workspace_id AND wm.user_id = auth.uid()));
  END IF;

  -- columns
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='columns' AND policyname='columns_select_policy') THEN
    CREATE POLICY columns_select_policy ON public.columns
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.pipelines p
          JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
          WHERE p.id = columns.pipeline_id
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='columns' AND policyname='columns_insert_policy') THEN
    CREATE POLICY columns_insert_policy ON public.columns
      FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.pipelines p
          JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
          WHERE p.id = columns.pipeline_id
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='columns' AND policyname='columns_update_policy') THEN
    CREATE POLICY columns_update_policy ON public.columns
      FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.pipelines p
          JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
          WHERE p.id = columns.pipeline_id
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.pipelines p
          JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
          WHERE p.id = columns.pipeline_id
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='columns' AND policyname='columns_delete_policy') THEN
    CREATE POLICY columns_delete_policy ON public.columns
      FOR DELETE TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.pipelines p
          JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
          WHERE p.id = columns.pipeline_id
        )
      );
  END IF;
END;
$$;

-- 5) Provisionar pipeline única e 4 etapas padrão para o workspace "KB Tech"
DO $$
DECLARE v_wid UUID;
DECLARE v_pid UUID;
BEGIN
  -- Garantir workspace "KB Tech"
  SELECT id INTO v_wid FROM public.workspaces WHERE name = 'KB Tech';
  IF v_wid IS NULL THEN
    INSERT INTO public.workspaces (name) VALUES ('KB Tech') RETURNING id INTO v_wid;
  END IF;

  -- Criar pipeline única caso não exista
  SELECT id INTO v_pid FROM public.pipelines WHERE workspace_id = v_wid LIMIT 1;
  IF v_pid IS NULL THEN
    INSERT INTO public.pipelines (workspace_id) VALUES (v_wid) RETURNING id INTO v_pid;
  END IF;

  -- Criar 4 etapas padrão, somente se não existirem
  IF NOT EXISTS (SELECT 1 FROM public.columns WHERE pipeline_id = v_pid) THEN
    INSERT INTO public.columns (pipeline_id, name, position) VALUES
      (v_pid, 'Novo Contato', 0),
      (v_pid, 'Qualificação', 1),
      (v_pid, 'Em Progresso', 2),
      (v_pid, 'Finalizados', 3);
  END IF;
END;
$$;