-- Create table card_analysis_history
CREATE TABLE IF NOT EXISTS public.card_analysis_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT,
  summary TEXT,
  suggestions JSONB,
  model_name TEXT,
  score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.card_analysis_history ENABLE ROW LEVEL SECURITY;

-- Policies: acesso apenas para membros do workspace do card
CREATE POLICY card_analysis_history_select_policy ON public.card_analysis_history
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.cards c
    JOIN public.columns col ON col.id = c.column_id
    JOIN public.pipelines p ON p.id = col.pipeline_id
    JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
    WHERE c.id = card_analysis_history.card_id
  )
);

CREATE POLICY card_analysis_history_insert_policy ON public.card_analysis_history
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.cards c
    JOIN public.columns col ON col.id = c.column_id
    JOIN public.pipelines p ON p.id = col.pipeline_id
    JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
    WHERE c.id = card_analysis_history.card_id
  )
);

CREATE POLICY card_analysis_history_update_policy ON public.card_analysis_history
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.cards c
    JOIN public.columns col ON col.id = c.column_id
    JOIN public.pipelines p ON p.id = col.pipeline_id
    JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
    WHERE c.id = card_analysis_history.card_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.cards c
    JOIN public.columns col ON col.id = c.column_id
    JOIN public.pipelines p ON p.id = col.pipeline_id
    JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
    WHERE c.id = card_analysis_history.card_id
  )
);

CREATE POLICY card_analysis_history_delete_policy ON public.card_analysis_history
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.cards c
    JOIN public.columns col ON col.id = c.column_id
    JOIN public.pipelines p ON p.id = col.pipeline_id
    JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
    WHERE c.id = card_analysis_history.card_id
  )
);