-- 1) Enum app_role (admin|user)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'app_role' AND pg_type.typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.app_role AS ENUM ('admin','user');
  END IF;
END;
$$;

-- 2) Tabela workspaces
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3) Tabela workspace_members
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4) Tabela user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5) Habilitar RLS
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 6) Políticas: workspaces -> membro pode ver seu próprio workspace
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='workspaces' AND policyname='workspaces_select_policy'
  ) THEN
    CREATE POLICY workspaces_select_policy ON public.workspaces
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.workspace_members wm
          WHERE wm.workspace_id = workspaces.id AND wm.user_id = auth.uid()
        )
      );
  END IF;
END;
$$;

-- 7) Políticas: workspace_members -> usuário vê seus próprios vínculos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='workspace_members' AND policyname='workspace_members_select_policy'
  ) THEN
    CREATE POLICY workspace_members_select_policy ON public.workspace_members
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;
END;
$$;

-- 8) Políticas: user_roles -> usuário vê seu papel e pode inserir o papel 'user' para si
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='user_roles' AND policyname='user_roles_select_policy'
  ) THEN
    CREATE POLICY user_roles_select_policy ON public.user_roles
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='user_roles' AND policyname='user_roles_insert_policy'
  ) THEN
    CREATE POLICY user_roles_insert_policy ON public.user_roles
      FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid() AND role = 'user');
  END IF;
END;
$$;