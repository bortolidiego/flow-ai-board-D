DO $$
BEGIN
  -- pipelines
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='pipelines') THEN
    EXECUTE 'ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY';
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pipelines' AND policyname='pipelines_select_policy') THEN
      EXECUTE 'CREATE POLICY pipelines_select_policy ON public.pipelines FOR SELECT TO authenticated USING (public.user_is_workspace_member(auth.uid(), workspace_id))';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pipelines' AND policyname='pipelines_insert_policy') THEN
      EXECUTE 'CREATE POLICY pipelines_insert_policy ON public.pipelines FOR INSERT TO authenticated WITH CHECK (public.user_is_workspace_member(auth.uid(), workspace_id))';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pipelines' AND policyname='pipelines_update_policy') THEN
      EXECUTE 'CREATE POLICY pipelines_update_policy ON public.pipelines FOR UPDATE TO authenticated USING (public.user_is_workspace_member(auth.uid(), workspace_id)) WITH CHECK (public.user_is_workspace_member(auth.uid(), workspace_id))';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pipelines' AND policyname='pipelines_delete_policy') THEN
      EXECUTE 'CREATE POLICY pipelines_delete_policy ON public.pipelines FOR DELETE TO authenticated USING (public.user_is_workspace_member(auth.uid(), workspace_id))';
    END IF;
  END IF;

  -- columns
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='columns') THEN
    EXECUTE 'ALTER TABLE public.columns ENABLE ROW LEVEL SECURITY';
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='columns' AND policyname='columns_select_policy') THEN
      EXECUTE 'CREATE POLICY columns_select_policy ON public.columns FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.pipelines p WHERE p.id = columns.pipeline_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id)))';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='columns' AND policyname='columns_insert_policy') THEN
      EXECUTE 'CREATE POLICY columns_insert_policy ON public.columns FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.pipelines p WHERE p.id = columns.pipeline_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id)))';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='columns' AND policyname='columns_update_policy') THEN
      EXECUTE 'CREATE POLICY columns_update_policy ON public.columns FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.pipelines p WHERE p.id = columns.pipeline_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.pipelines p WHERE p.id = columns.pipeline_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id)))';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='columns' AND policyname='columns_delete_policy') THEN
      EXECUTE 'CREATE POLICY columns_delete_policy ON public.columns FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.pipelines p WHERE p.id = columns.pipeline_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id)))';
    END IF;
  END IF;

  -- cards
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='cards') THEN
    EXECUTE 'ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY';
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cards' AND policyname='cards_select_policy') THEN
      EXECUTE 'CREATE POLICY cards_select_policy ON public.cards FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.columns c JOIN public.pipelines p ON p.id = c.pipeline_id WHERE c.id = cards.column_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id)))';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cards' AND policyname='cards_insert_policy') THEN
      EXECUTE 'CREATE POLICY cards_insert_policy ON public.cards FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.columns c JOIN public.pipelines p ON p.id = c.pipeline_id WHERE c.id = cards.column_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id)))';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cards' AND policyname='cards_update_policy') THEN
      EXECUTE 'CREATE POLICY cards_update_policy ON public.cards FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.columns c JOIN public.pipelines p ON p.id = c.pipeline_id WHERE c.id = cards.column_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.columns c JOIN public.pipelines p ON p.id = c.pipeline_id WHERE c.id = cards.column_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id)))';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cards' AND policyname='cards_delete_policy') THEN
      EXECUTE 'CREATE POLICY cards_delete_policy ON public.cards FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.columns c JOIN public.pipelines p ON p.id = c.pipeline_id WHERE c.id = cards.column_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id)))';
    END IF;
  END IF;

  -- pipeline_ai_config
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='pipeline_ai_config') THEN
    EXECUTE 'ALTER TABLE public.pipeline_ai_config ENABLE ROW LEVEL SECURITY';
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pipeline_ai_config' AND policyname='pipeline_ai_config_select_policy') THEN
      EXECUTE 'CREATE POLICY pipeline_ai_config_select_policy ON public.pipeline_ai_config FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.pipelines p WHERE p.id = pipeline_ai_config.pipeline_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id)))';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pipeline_ai_config' AND policyname='pipeline_ai_config_insert_policy') THEN
      EXECUTE 'CREATE POLICY pipeline_ai_config_insert_policy ON public.pipeline_ai_config FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.pipelines p WHERE p.id = pipeline_ai_config.pipeline_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id)))';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pipeline_ai_config' AND policyname='pipeline_ai_config_update_policy') THEN
      EXECUTE 'CREATE POLICY pipeline_ai_config_update_policy ON public.pipeline_ai_config FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.pipelines p WHERE p.id = pipeline_ai_config.pipeline_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.pipelines p WHERE p.id = pipeline_ai_config.pipeline_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id)))';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pipeline_ai_config' AND policyname='pipeline_ai_config_delete_policy') THEN
      EXECUTE 'CREATE POLICY pipeline_ai_config_delete_policy ON public.pipeline_ai_config FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.pipelines p WHERE p.id = pipeline_ai_config.pipeline_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id)))';
    END IF;
  END IF;

  -- pipeline_custom_fields
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='pipeline_custom_fields') THEN
    EXECUTE 'ALTER TABLE public.pipeline_custom_fields ENABLE ROW LEVEL SECURITY';
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pipeline_custom_fields' AND policyname='pipeline_custom_fields_select_policy') THEN
      EXECUTE 'CREATE POLICY pipeline_custom_fields_select_policy ON public.pipeline_custom_fields FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.pipelines p WHERE p.id = pipeline_custom_fields.pipeline_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id)))';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pipeline_custom_fields' AND policyname='pipeline_custom_fields_insert_policy') THEN
      EXECUTE 'CREATE POLICY pipeline_custom_fields_insert_policy ON public.pipeline_custom_fields FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.pipelines p WHERE p.id = pipeline_custom_fields.pipeline_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id)))';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pipeline_custom_fields' AND policyname='pipeline_custom_fields_update_policy') THEN
      EXECUTE 'CREATE POLICY pipeline_custom_fields_update_policy ON public.pipeline_custom_fields FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.pipelines p WHERE p.id = pipeline_custom_fields.pipeline_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.pipelines p WHERE p.id = pipeline_custom_fields.pipeline_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id)))';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pipeline_custom_fields' AND policyname='pipeline_custom_fields_delete_policy') THEN
      EXECUTE 'CREATE POLICY pipeline_custom_fields_delete_policy ON public.pipeline_custom_fields FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.pipelines p WHERE p.id = pipeline_custom_fields.pipeline_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id)))';
    END IF;
  END IF;

  -- funnel_config
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='funnel_config') THEN
    EXECUTE 'ALTER TABLE public.funnel_config ENABLE ROW LEVEL SECURITY';
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='funnel_config' AND policyname='funnel_config_select_policy') THEN
      EXECUTE 'CREATE POLICY funnel_config_select_policy ON public.funnel_config FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.pipelines p WHERE p.id = funnel_config.pipeline_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id)))';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='funnel_config' AND policyname='funnel_config_insert_policy') THEN
      EXECUTE 'CREATE POLICY funnel_config_insert_policy ON public.funnel_config FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.pipelines p WHERE p.id = funnel_config.pipeline_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id)))';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='funnel_config' AND policyname='funnel_config_update_policy') THEN
      EXECUTE 'CREATE POLICY funnel_config_update_policy ON public.funnel_config FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.pipelines p WHERE p.id = funnel_config.pipeline_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.pipelines p WHERE p.id = funnel_config.pipeline_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id)))';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='funnel_config' AND policyname='funnel_config_delete_policy') THEN
      EXECUTE 'CREATE POLICY funnel_config_delete_policy ON public.funnel_config FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.pipelines p WHERE p.id = funnel_config.pipeline_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id)))';
    END IF;
  END IF;

  -- pipeline_movement_rules
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='pipeline_movement_rules') THEN
    EXECUTE 'ALTER TABLE public.pipeline_movement_rules ENABLE ROW LEVEL SECURITY';
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pipeline_movement_rules' AND policyname='pipeline_movement_rules_select_policy') THEN
      EXECUTE 'CREATE POLICY pipeline_movement_rules_select_policy ON public.pipeline_movement_rules FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.pipelines p WHERE p.id = pipeline_movement_rules.pipeline_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id)))';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pipeline_movement_rules' AND policyname='pipeline_movement_rules_insert_policy') THEN
      EXECUTE 'CREATE POLICY pipeline_movement_rules_insert_policy ON public.pipeline_movement_rules FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.pipelines p WHERE p.id = pipeline_movement_rules.pipeline_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id)))';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pipeline_movement_rules' AND policyname='pipeline_movement_rules_update_policy') THEN
      EXECUTE 'CREATE POLICY pipeline_movement_rules_update_policy ON public.pipeline_movement_rules FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.pipelines p WHERE p.id = pipeline_movement_rules.pipeline_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.pipelines p WHERE p.id = pipeline_movement_rules.pipeline_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id)))';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pipeline_movement_rules' AND policyname='pipeline_movement_rules_delete_policy') THEN
      EXECUTE 'CREATE POLICY pipeline_movement_rules_delete_policy ON public.pipeline_movement_rules FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.pipelines p WHERE p.id = pipeline_movement_rules.pipeline_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id)))';
    END IF;
  END IF;

  -- pipeline_inactivity_config
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='pipeline_inactivity_config') THEN
    EXECUTE 'ALTER TABLE public.pipeline_inactivity_config ENABLE ROW LEVEL SECURITY';
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pipeline_inactivity_config' AND policyname='pipeline_inactivity_config_select_policy') THEN
      EXECUTE 'CREATE POLICY pipeline_inactivity_config_select_policy ON public.pipeline_inactivity_config FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.pipelines p WHERE p.id = pipeline_inactivity_config.pipeline_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id)))';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pipeline_inactivity_config' AND policyname='pipeline_inactivity_config_insert_policy') THEN
      EXECUTE 'CREATE POLICY pipeline_inactivity_config_insert_policy ON public.pipeline_inactivity_config FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.pipelines p WHERE p.id = pipeline_inactivity_config.pipeline_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id)))';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pipeline_inactivity_config' AND policyname='pipeline_inactivity_config_update_policy') THEN
      EXECUTE 'CREATE POLICY pipeline_inactivity_config_update_policy ON public.pipeline_inactivity_config FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.pipelines p WHERE p.id = pipeline_inactivity_config.pipeline_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.pipelines p WHERE p.id = pipeline_inactivity_config.pipeline_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id)))';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pipeline_inactivity_config' AND policyname='pipeline_inactivity_config_delete_policy') THEN
      EXECUTE 'CREATE POLICY pipeline_inactivity_config_delete_policy ON public.pipeline_inactivity_config FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.pipelines p WHERE p.id = pipeline_inactivity_config.pipeline_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id)))';
    END IF;
  END IF;

  -- chatwoot_integrations
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='chatwoot_integrations') THEN
    EXECUTE 'ALTER TABLE public.chatwoot_integrations ENABLE ROW LEVEL SECURITY';
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chatwoot_integrations' AND policyname='chatwoot_integrations_select_policy') THEN
      EXECUTE 'CREATE POLICY chatwoot_integrations_select_policy ON public.chatwoot_integrations FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.pipelines p WHERE p.id = chatwoot_integrations.pipeline_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id)))';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chatwoot_integrations' AND policyname='chatwoot_integrations_insert_policy') THEN
      EXECUTE 'CREATE POLICY chatwoot_integrations_insert_policy ON public.chatwoot_integrations FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.pipelines p WHERE p.id = chatwoot_integrations.pipeline_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id)))';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chatwoot_integrations' AND policyname='chatwoot_integrations_update_policy') THEN
      EXECUTE 'CREATE POLICY chatwoot_integrations_update_policy ON public.chatwoot_integrations FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.pipelines p WHERE p.id = chatwoot_integrations.pipeline_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.pipelines p WHERE p.id = chatwoot_integrations.pipeline_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id)))';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chatwoot_integrations' AND policyname='chatwoot_integrations_delete_policy') THEN
      EXECUTE 'CREATE POLICY chatwoot_integrations_delete_policy ON public.chatwoot_integrations FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.pipelines p WHERE p.id = chatwoot_integrations.pipeline_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id)))';
    END IF;
  END IF;

  -- workspace_members
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='workspace_members') THEN
    EXECUTE 'ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY';
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='workspace_members' AND policyname='workspace_members_select_policy') THEN
      EXECUTE 'CREATE POLICY workspace_members_select_policy ON public.workspace_members FOR SELECT TO authenticated USING (public.user_is_workspace_member(auth.uid(), workspace_id))';
    END IF;
  END IF;

  -- workspaces
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='workspaces') THEN
    EXECUTE 'ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY';
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='workspaces' AND policyname='workspaces_select_policy') THEN
      EXECUTE 'CREATE POLICY workspaces_select_policy ON public.workspaces FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = workspaces.id AND wm.user_id = auth.uid()))';
    END IF;
  END IF;

  -- card_analysis_history
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='card_analysis_history') THEN
    EXECUTE 'ALTER TABLE public.card_analysis_history ENABLE ROW LEVEL SECURITY';
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='card_analysis_history' AND policyname='card_analysis_history_select_policy') THEN
      EXECUTE 'CREATE POLICY card_analysis_history_select_policy ON public.card_analysis_history FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.cards c JOIN public.columns col ON col.id = c.column_id JOIN public.pipelines p ON p.id = col.pipeline_id WHERE c.id = card_analysis_history.card_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id)))';
    END IF;
  END IF;

  -- lead_data
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='lead_data') THEN
    EXECUTE 'ALTER TABLE public.lead_data ENABLE ROW LEVEL SECURITY';
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='lead_data' AND policyname='lead_data_select_policy') THEN
      EXECUTE 'CREATE POLICY lead_data_select_policy ON public.lead_data FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.cards c JOIN public.columns col ON col.id = c.column_id JOIN public.pipelines p ON p.id = col.pipeline_id WHERE c.id = lead_data.card_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id)))';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='lead_data' AND policyname='lead_data_insert_policy') THEN
      EXECUTE 'CREATE POLICY lead_data_insert_policy ON public.lead_data FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.cards c JOIN public.columns col ON col.id = c.column_id JOIN public.pipelines p ON p.id = col.pipeline_id WHERE c.id = lead_data.card_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id)))';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='lead_data' AND policyname='lead_data_update_policy') THEN
      EXECUTE 'CREATE POLICY lead_data_update_policy ON public.lead_data FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.cards c JOIN public.columns col ON col.id = c.column_id JOIN public.pipelines p ON p.id = col.pipeline_id WHERE c.id = lead_data.card_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.cards c JOIN public.columns col ON col.id = c.column_id JOIN public.pipelines p ON p.id = col.pipeline_id WHERE c.id = lead_data.card_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id)))';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='lead_data' AND policyname='lead_data_delete_policy') THEN
      EXECUTE 'CREATE POLICY lead_data_delete_policy ON public.lead_data FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.cards c JOIN public.columns col ON col.id = c.column_id JOIN public.pipelines p ON p.id = col.pipeline_id WHERE c.id = lead_data.card_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id)))';
    END IF;
  END IF;

  -- pipeline_behaviors
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='pipeline_behaviors') THEN
    EXECUTE 'ALTER TABLE public.pipeline_behaviors ENABLE ROW LEVEL SECURITY';
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pipeline_behaviors' AND policyname='pipeline_behaviors_select_policy') THEN
      EXECUTE 'CREATE POLICY pipeline_behaviors_select_policy ON public.pipeline_behaviors FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.pipelines p WHERE p.id = pipeline_behaviors.pipeline_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id)))';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pipeline_behaviors' AND policyname='pipeline_behaviors_insert_policy') THEN
      EXECUTE 'CREATE POLICY pipeline_behaviors_insert_policy ON public.pipeline_behaviors FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.pipelines p WHERE p.id = pipeline_behaviors.pipeline_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id)))';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pipeline_behaviors' AND policyname='pipeline_behaviors_update_policy') THEN
      EXECUTE 'CREATE POLICY pipeline_behaviors_update_policy ON public.pipeline_behaviors FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.pipelines p WHERE p.id = pipeline_behaviors.pipeline_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.pipelines p WHERE p.id = pipeline_behaviors.pipeline_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id)))';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pipeline_behaviors' AND policyname='pipeline_behaviors_delete_policy') THEN
      EXECUTE 'CREATE POLICY pipeline_behaviors_delete_policy ON public.pipeline_behaviors FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.pipelines p WHERE p.id = pipeline_behaviors.pipeline_id AND public.user_is_workspace_member(auth.uid(), p.workspace_id)))';
    END IF;
  END IF;

END;
$$;