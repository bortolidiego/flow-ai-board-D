-- Create table lead_data
CREATE TABLE IF NOT EXISTS public.lead_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.lead_data ENABLE ROW LEVEL SECURITY;

-- Policies: acesso apenas para membros do workspace do card
CREATE POLICY lead_data_select_policy ON public.lead_data
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.cards c
    JOIN public.columns col ON col.id = c.column_id
    JOIN public.pipelines p ON p.id = col.pipeline_id
    JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
    WHERE c.id = lead_data.card_id
  )
);

CREATE POLICY lead_data_insert_policy ON public.lead_data
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.cards c
    JOIN public.columns col ON col.id = c.column_id
    JOIN public.pipelines p ON p.id = col.pipeline_id
    JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
    WHERE c.id = lead_data.card_id
  )
);

CREATE POLICY lead_data_update_policy ON public.lead_data
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.cards c
    JOIN public.columns col ON col.id = c.column_id
    JOIN public.pipelines p ON p.id = col.pipeline_id
    JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
    WHERE c.id = lead_data.card_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.cards c
    JOIN public.columns col ON col.id = c.column_id
    JOIN public.pipelines p ON p.id = col.pipeline_id
    JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
    WHERE c.id = lead_data.card_id
  )
);

CREATE POLICY lead_data_delete_policy ON public.lead_data
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.cards c
    JOIN public.columns col ON col.id = c.column_id
    JOIN public.pipelines p ON p.id = col.pipeline_id
    JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
    WHERE c.id = lead_data.card_id
  )
);