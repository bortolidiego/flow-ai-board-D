-- Criar tabela se não existir
CREATE TABLE IF NOT EXISTS public.pipeline_sla_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pipeline_id UUID NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
    first_response_minutes INTEGER DEFAULT 60,
    ongoing_response_minutes INTEGER DEFAULT 1440,
    warning_threshold_percent INTEGER DEFAULT 80,
    sla_basis TEXT DEFAULT 'resolution',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_pipeline_sla_config UNIQUE (pipeline_id)
);

-- Habilitar RLS
ALTER TABLE public.pipeline_sla_config ENABLE ROW LEVEL SECURITY;

-- Recriar políticas para garantir acesso
DROP POLICY IF EXISTS "pipeline_sla_config_select_policy" ON public.pipeline_sla_config;
CREATE POLICY "pipeline_sla_config_select_policy" ON public.pipeline_sla_config
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.pipelines p
            JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id
            WHERE p.id = pipeline_sla_config.pipeline_id
            AND wm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "pipeline_sla_config_insert_policy" ON public.pipeline_sla_config;
CREATE POLICY "pipeline_sla_config_insert_policy" ON public.pipeline_sla_config
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.pipelines p
            JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id
            WHERE p.id = pipeline_sla_config.pipeline_id
            AND wm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "pipeline_sla_config_update_policy" ON public.pipeline_sla_config;
CREATE POLICY "pipeline_sla_config_update_policy" ON public.pipeline_sla_config
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.pipelines p
            JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id
            WHERE p.id = pipeline_sla_config.pipeline_id
            AND wm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "pipeline_sla_config_delete_policy" ON public.pipeline_sla_config;
CREATE POLICY "pipeline_sla_config_delete_policy" ON public.pipeline_sla_config
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.pipelines p
            JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id
            WHERE p.id = pipeline_sla_config.pipeline_id
            AND wm.user_id = auth.uid()
        )
    );

-- Forçar atualização do cache do PostgREST
NOTIFY pgrst, 'reload schema';