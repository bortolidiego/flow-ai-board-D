-- Create pipelines table
CREATE TABLE public.pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create columns table
CREATE TABLE public.columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID REFERENCES public.pipelines(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create cards table
CREATE TABLE public.cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  column_id UUID REFERENCES public.columns(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  assignee TEXT,
  ai_suggested BOOLEAN DEFAULT false,
  chatwoot_conversation_id TEXT,
  chatwoot_contact_name TEXT,
  chatwoot_contact_email TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create chatwoot_integrations table
CREATE TABLE public.chatwoot_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID REFERENCES public.pipelines(id) ON DELETE CASCADE NOT NULL,
  chatwoot_url TEXT NOT NULL,
  chatwoot_api_key TEXT NOT NULL,
  account_id TEXT NOT NULL,
  inbox_id TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(pipeline_id)
);

-- Enable RLS
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatwoot_integrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pipelines (public read, no auth required for demo)
CREATE POLICY "Anyone can view pipelines" ON public.pipelines FOR SELECT USING (true);
CREATE POLICY "Anyone can insert pipelines" ON public.pipelines FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update pipelines" ON public.pipelines FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete pipelines" ON public.pipelines FOR DELETE USING (true);

-- RLS Policies for columns
CREATE POLICY "Anyone can view columns" ON public.columns FOR SELECT USING (true);
CREATE POLICY "Anyone can insert columns" ON public.columns FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update columns" ON public.columns FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete columns" ON public.columns FOR DELETE USING (true);

-- RLS Policies for cards
CREATE POLICY "Anyone can view cards" ON public.cards FOR SELECT USING (true);
CREATE POLICY "Anyone can insert cards" ON public.cards FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update cards" ON public.cards FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete cards" ON public.cards FOR DELETE USING (true);

-- RLS Policies for chatwoot_integrations
CREATE POLICY "Anyone can view integrations" ON public.chatwoot_integrations FOR SELECT USING (true);
CREATE POLICY "Anyone can insert integrations" ON public.chatwoot_integrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update integrations" ON public.chatwoot_integrations FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete integrations" ON public.chatwoot_integrations FOR DELETE USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_pipelines_updated_at
  BEFORE UPDATE ON public.pipelines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cards_updated_at
  BEFORE UPDATE ON public.cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chatwoot_integrations_updated_at
  BEFORE UPDATE ON public.chatwoot_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default pipeline and columns
INSERT INTO public.pipelines (name, color, position) VALUES
  ('Vendas', 'from-primary to-secondary', 0);

INSERT INTO public.columns (pipeline_id, name, position)
SELECT id, 'Novos', 0 FROM public.pipelines WHERE name = 'Vendas'
UNION ALL
SELECT id, 'Contatados', 1 FROM public.pipelines WHERE name = 'Vendas'
UNION ALL
SELECT id, 'Qualificados', 2 FROM public.pipelines WHERE name = 'Vendas'
UNION ALL
SELECT id, 'Proposta', 3 FROM public.pipelines WHERE name = 'Vendas'
UNION ALL
SELECT id, 'Ganhos', 4 FROM public.pipelines WHERE name = 'Vendas';
