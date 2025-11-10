-- Fase 1: Sistema de Autenticação e Roles
-- Criar enum de roles
CREATE TYPE app_role AS ENUM ('admin', 'user');

-- Tabela de user_roles
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Habilitar RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Função segura para verificar role (SECURITY DEFINER evita recursão)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Políticas RLS: usuários podem ver apenas seus próprios roles
CREATE POLICY "Users can view own roles"
ON user_roles FOR SELECT
USING (auth.uid() = user_id);

-- Políticas RLS: apenas admins podem gerenciar roles
CREATE POLICY "Admins can manage roles"
ON user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Fase 2: Estrutura de Dados para Campos Dinâmicos
-- Adicionar coluna JSONB para campos customizados em cards
ALTER TABLE cards ADD COLUMN IF NOT EXISTS custom_fields_data JSONB DEFAULT '{}'::jsonb;

-- Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_cards_custom_fields ON cards USING gin(custom_fields_data);

-- Tabela de templates de comportamento
CREATE TABLE behavior_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  business_type TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  config JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE behavior_templates ENABLE ROW LEVEL SECURITY;

-- RLS: todos podem ver templates do sistema
CREATE POLICY "Anyone can view system templates"
ON behavior_templates FOR SELECT
USING (is_system = true);

-- RLS: usuários podem ver e editar seus próprios templates
CREATE POLICY "Users can manage own templates"
ON behavior_templates FOR ALL
USING (created_by = auth.uid());

-- Tabela de vínculo entre pipelines e templates
CREATE TABLE pipeline_behaviors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID REFERENCES pipelines(id) ON DELETE CASCADE UNIQUE,
  behavior_template_id UUID REFERENCES behavior_templates(id),
  is_customized BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pipeline_behaviors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view pipeline behaviors"
ON pipeline_behaviors FOR SELECT
USING (true);

CREATE POLICY "Anyone can manage pipeline behaviors"
ON pipeline_behaviors FOR ALL
USING (true);

-- Trigger para atualizar updated_at em behavior_templates
CREATE TRIGGER update_behavior_templates_updated_at
BEFORE UPDATE ON behavior_templates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger para atualizar updated_at em pipeline_behaviors
CREATE TRIGGER update_pipeline_behaviors_updated_at
BEFORE UPDATE ON pipeline_behaviors
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Inserir templates do sistema
INSERT INTO behavior_templates (name, business_type, description, is_system, config) VALUES
('E-commerce', 'ecommerce', 'Template para lojas virtuais com foco em conversão de vendas', true, '{
  "stages": [
    {"name": "Lead", "position": 0},
    {"name": "Orçamento", "position": 1},
    {"name": "Negociação", "position": 2},
    {"name": "Ganho", "position": 3},
    {"name": "Perdido", "position": 4}
  ],
  "custom_fields": [
    {"field_name": "valor", "field_label": "Valor do Pedido", "field_type": "number", "is_required": true, "position": 0},
    {"field_name": "produto", "field_label": "Produto", "field_type": "text", "is_required": true, "position": 1},
    {"field_name": "metodo_pagamento", "field_label": "Método de Pagamento", "field_type": "select", "field_options": {"options": ["Cartão", "PIX", "Boleto"]}, "position": 2}
  ],
  "intention_types": [
    {"intention_type": "compra", "intention_label": "Compra", "color": "#22c55e", "position": 0},
    {"intention_type": "duvida", "intention_label": "Dúvida", "color": "#3b82f6", "position": 1},
    {"intention_type": "reclamacao", "intention_label": "Reclamação", "color": "#ef4444", "position": 2}
  ],
  "ai_config": {
    "business_type": "ecommerce",
    "objectives": ["extract_lead_data", "detect_intention", "measure_quality", "suggest_actions"],
    "analyze_on_close": true,
    "analyze_on_message": false
  }
}'),
('Serviços', 'services', 'Template para empresas de serviços profissionais', true, '{
  "stages": [
    {"name": "Contato", "position": 0},
    {"name": "Qualificação", "position": 1},
    {"name": "Proposta", "position": 2},
    {"name": "Fechamento", "position": 3},
    {"name": "Perdido", "position": 4}
  ],
  "custom_fields": [
    {"field_name": "servico_interesse", "field_label": "Serviço de Interesse", "field_type": "text", "is_required": true, "position": 0},
    {"field_name": "orcamento_estimado", "field_label": "Orçamento Estimado", "field_type": "number", "position": 1},
    {"field_name": "prazo", "field_label": "Prazo Desejado", "field_type": "date", "position": 2}
  ],
  "intention_types": [
    {"intention_type": "contratacao", "intention_label": "Contratação", "color": "#22c55e", "position": 0},
    {"intention_type": "orcamento", "intention_label": "Orçamento", "color": "#3b82f6", "position": 1},
    {"intention_type": "informacao", "intention_label": "Informação", "color": "#f59e0b", "position": 2}
  ],
  "ai_config": {
    "business_type": "services",
    "objectives": ["extract_lead_data", "detect_intention", "measure_quality"],
    "analyze_on_close": true,
    "analyze_on_message": false
  }
}'),
('Imobiliária', 'realestate', 'Template para corretores e imobiliárias', true, '{
  "stages": [
    {"name": "Lead", "position": 0},
    {"name": "Visita Agendada", "position": 1},
    {"name": "Proposta", "position": 2},
    {"name": "Contrato", "position": 3},
    {"name": "Perdido", "position": 4}
  ],
  "custom_fields": [
    {"field_name": "tipo_imovel", "field_label": "Tipo de Imóvel", "field_type": "select", "field_options": {"options": ["Casa", "Apartamento", "Terreno", "Comercial"]}, "is_required": true, "position": 0},
    {"field_name": "bairro", "field_label": "Bairro", "field_type": "text", "position": 1},
    {"field_name": "valor_maximo", "field_label": "Valor Máximo", "field_type": "number", "position": 2},
    {"field_name": "finalidade", "field_label": "Finalidade", "field_type": "select", "field_options": {"options": ["Compra", "Aluguel"]}, "position": 3}
  ],
  "intention_types": [
    {"intention_type": "compra", "intention_label": "Compra", "color": "#22c55e", "position": 0},
    {"intention_type": "aluguel", "intention_label": "Aluguel", "color": "#3b82f6", "position": 1},
    {"intention_type": "avaliacao", "intention_label": "Avaliação", "color": "#f59e0b", "position": 2}
  ],
  "ai_config": {
    "business_type": "realestate",
    "objectives": ["extract_lead_data", "detect_intention", "measure_quality"],
    "analyze_on_close": true,
    "analyze_on_message": false
  }
}'),
('Suporte', 'support', 'Template para equipes de atendimento e suporte', true, '{
  "stages": [
    {"name": "Aberto", "position": 0},
    {"name": "Em Análise", "position": 1},
    {"name": "Resolvido", "position": 2},
    {"name": "Fechado", "position": 3}
  ],
  "custom_fields": [
    {"field_name": "tipo_problema", "field_label": "Tipo de Problema", "field_type": "select", "field_options": {"options": ["Técnico", "Financeiro", "Dúvida", "Reclamação"]}, "is_required": true, "position": 0},
    {"field_name": "prioridade", "field_label": "Prioridade", "field_type": "select", "field_options": {"options": ["Baixa", "Média", "Alta", "Urgente"]}, "position": 1},
    {"field_name": "produto", "field_label": "Produto", "field_type": "text", "position": 2}
  ],
  "intention_types": [
    {"intention_type": "bug", "intention_label": "Bug/Erro", "color": "#ef4444", "position": 0},
    {"intention_type": "duvida", "intention_label": "Dúvida", "color": "#3b82f6", "position": 1},
    {"intention_type": "sugestao", "intention_label": "Sugestão", "color": "#22c55e", "position": 2}
  ],
  "ai_config": {
    "business_type": "support",
    "objectives": ["detect_intention", "measure_quality", "suggest_actions"],
    "analyze_on_close": true,
    "analyze_on_message": true
  }
}')