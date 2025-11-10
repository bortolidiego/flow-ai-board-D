-- Fase 1: Estrutura do Banco de Dados

-- Criar enum para tipos de campo customizado
CREATE TYPE public.custom_field_type AS ENUM ('text', 'number', 'date', 'email', 'phone', 'select');

-- Tabela de dados do lead (campos fixos + customizados)
CREATE TABLE public.lead_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  full_name TEXT,
  cpf TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  gender TEXT,
  birthday DATE,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(card_id)
);

-- Tabela de configuração de campos customizados por pipeline
CREATE TABLE public.pipeline_custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type custom_field_type NOT NULL DEFAULT 'text',
  field_options JSONB, -- Para campos tipo 'select'
  is_required BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(pipeline_id, field_name)
);

-- Tabela de configuração de tipos de intenção por pipeline
CREATE TABLE public.intention_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
  intention_type TEXT NOT NULL,
  intention_label TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(pipeline_id, intention_type)
);

-- Adicionar colunas em cards para análises de IA
ALTER TABLE public.cards 
  ADD COLUMN conversation_summary TEXT,
  ADD COLUMN intention_score INTEGER CHECK (intention_score >= 0 AND intention_score <= 100),
  ADD COLUMN intention_type TEXT,
  ADD COLUMN service_quality_score INTEGER CHECK (service_quality_score >= 0 AND service_quality_score <= 100),
  ADD COLUMN ai_suggestions JSONB DEFAULT '[]'::jsonb;

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.lead_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intention_config ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para lead_data
CREATE POLICY "Anyone can view lead_data" ON public.lead_data
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert lead_data" ON public.lead_data
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update lead_data" ON public.lead_data
  FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete lead_data" ON public.lead_data
  FOR DELETE USING (true);

-- Políticas RLS para pipeline_custom_fields
CREATE POLICY "Anyone can view custom_fields" ON public.pipeline_custom_fields
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert custom_fields" ON public.pipeline_custom_fields
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update custom_fields" ON public.pipeline_custom_fields
  FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete custom_fields" ON public.pipeline_custom_fields
  FOR DELETE USING (true);

-- Políticas RLS para intention_config
CREATE POLICY "Anyone can view intention_config" ON public.intention_config
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert intention_config" ON public.intention_config
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update intention_config" ON public.intention_config
  FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete intention_config" ON public.intention_config
  FOR DELETE USING (true);

-- Trigger para atualizar updated_at em lead_data
CREATE TRIGGER update_lead_data_updated_at
  BEFORE UPDATE ON public.lead_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();