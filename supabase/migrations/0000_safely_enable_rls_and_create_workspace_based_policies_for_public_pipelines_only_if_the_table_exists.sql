DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'pipelines'
  ) THEN
    -- Enable RLS
    EXECUTE 'ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY';

    -- SELECT policy
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'pipelines' AND policyname = 'pipelines_select_policy'
    ) THEN
      EXECUTE $sql$
        CREATE POLICY pipelines_select_policy ON public.pipelines
        FOR SELECT TO authenticated
        USING (public.user_is_workspace_member(auth.uid(), workspace_id));
      $sql$;
    END IF;

    -- INSERT policy
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'pipelines' AND policyname = 'pipelines_insert_policy'
    ) THEN
      EXECUTE $sql$
        CREATE POLICY pipelines_insert_policy ON public.pipelines
        FOR INSERT TO authenticated
        WITH CHECK (public.user_is_workspace_member(auth.uid(), workspace_id));
      $sql$;
    END IF;

    -- UPDATE policy
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'pipelines' AND policyname = 'pipelines_update_policy'
    ) THEN
      EXECUTE $sql$
        CREATE POLICY pipelines_update_policy ON public.pipelines
        FOR UPDATE TO authenticated
        USING (public.user_is_workspace_member(auth.uid(), workspace_id))
        WITH CHECK (public.user_is_workspace_member(auth.uid(), workspace_id));
      $sql$;
    END IF;

    -- DELETE policy
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'pipelines' AND policyname = 'pipelines_delete_policy'
    ) THEN
      EXECUTE $sql$
        CREATE POLICY pipelines_delete_policy ON public.pipelines
        FOR DELETE TO authenticated
        USING (public.user_is_workspace_member(auth.uid(), workspace_id));
      $sql$;
    END IF;

    RAISE NOTICE 'RLS enabled and policies ensured for public.pipelines.';
  ELSE
    RAISE NOTICE 'Table public.pipelines does not exist; skipping RLS and policies.';
  END IF;
END;
$$;