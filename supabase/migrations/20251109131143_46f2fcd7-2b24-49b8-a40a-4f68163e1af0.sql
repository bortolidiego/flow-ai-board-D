-- PARTE 1: Limpar dados existentes
DELETE FROM cards;
DELETE FROM intention_config;

-- PARTE 2: Atualizar intention_config com novas colunas
ALTER TABLE intention_config
ADD COLUMN IF NOT EXISTS is_monetary BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS lifecycle_stages JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS can_change_from_monetary BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS inactivity_days INTEGER DEFAULT 3;

-- PARTE 3: Inserir intenções genéricas
INSERT INTO intention_config (pipeline_id, intention_type, intention_label, color, is_monetary, priority, lifecycle_stages, can_change_from_monetary, inactivity_days, position)
SELECT 
  p.id,
  'venda',
  'Venda',
  '#10b981',
  true,
  1,
  '[
    {"stage": "Interesse", "progress_percent": 0, "is_initial": true},
    {"stage": "Orçamento", "progress_percent": 20},
    {"stage": "Negociação", "progress_percent": 50},
    {"stage": "Pagamento", "progress_percent": 75},
    {"stage": "Ganho", "progress_percent": 100, "is_terminal": true, "resolution_status": "won"},
    {"stage": "Perdido", "progress_percent": 0, "is_terminal": true, "resolution_status": "lost"}
  ]'::jsonb,
  false,
  7,
  0
FROM pipelines p
UNION ALL
SELECT 
  p.id,
  'assistencia',
  'Assistência Técnica',
  '#3b82f6',
  true,
  1,
  '[
    {"stage": "Diagnóstico", "progress_percent": 0, "is_initial": true},
    {"stage": "Orçamento", "progress_percent": 20},
    {"stage": "Aprovação", "progress_percent": 40},
    {"stage": "Em Reparo", "progress_percent": 60},
    {"stage": "Pronto", "progress_percent": 80},
    {"stage": "Entregue", "progress_percent": 100, "is_terminal": true, "resolution_status": "won"},
    {"stage": "Cancelado", "progress_percent": 0, "is_terminal": true, "resolution_status": "lost"}
  ]'::jsonb,
  false,
  7,
  1
FROM pipelines p
UNION ALL
SELECT 
  p.id,
  'duvida',
  'Dúvida',
  '#8b5cf6',
  false,
  3,
  '[
    {"stage": "Recebimento", "progress_percent": 0, "is_initial": true},
    {"stage": "Em Análise", "progress_percent": 50},
    {"stage": "Respondido", "progress_percent": 100, "is_terminal": true, "resolution_status": "resolved"},
    {"stage": "Não Resolvido", "progress_percent": 0, "is_terminal": true, "resolution_status": "unresolved"}
  ]'::jsonb,
  true,
  3,
  2
FROM pipelines p
UNION ALL
SELECT 
  p.id,
  'reclamacao',
  'Reclamação',
  '#ef4444',
  false,
  1,
  '[
    {"stage": "Recebimento", "progress_percent": 0, "is_initial": true},
    {"stage": "Análise", "progress_percent": 30},
    {"stage": "Resolução", "progress_percent": 70},
    {"stage": "Resolvido", "progress_percent": 100, "is_terminal": true, "resolution_status": "resolved"},
    {"stage": "Não Resolvido", "progress_percent": 0, "is_terminal": true, "resolution_status": "unresolved"}
  ]'::jsonb,
  true,
  5,
  3
FROM pipelines p
UNION ALL
SELECT 
  p.id,
  'acompanhamento',
  'Acompanhamento',
  '#6366f1',
  false,
  2,
  '[
    {"stage": "Recebimento", "progress_percent": 0, "is_initial": true},
    {"stage": "Verificação", "progress_percent": 50},
    {"stage": "Atualizado", "progress_percent": 100, "is_terminal": true, "resolution_status": "resolved"},
    {"stage": "Fechado", "progress_percent": 0, "is_terminal": true, "resolution_status": "unresolved"}
  ]'::jsonb,
  true,
  3,
  4
FROM pipelines p
UNION ALL
SELECT 
  p.id,
  'garantia',
  'Garantia',
  '#f59e0b',
  false,
  2,
  '[
    {"stage": "Solicitação", "progress_percent": 0, "is_initial": true},
    {"stage": "Análise", "progress_percent": 25},
    {"stage": "Aprovado", "progress_percent": 50},
    {"stage": "Em Processamento", "progress_percent": 75},
    {"stage": "Concluído", "progress_percent": 100, "is_terminal": true, "resolution_status": "won"},
    {"stage": "Negado", "progress_percent": 0, "is_terminal": true, "resolution_status": "lost"}
  ]'::jsonb,
  true,
  7,
  5
FROM pipelines p
UNION ALL
SELECT 
  p.id,
  'nps',
  'Pesquisa de Satisfação',
  '#14b8a6',
  false,
  3,
  '[
    {"stage": "Enviado", "progress_percent": 0, "is_initial": true},
    {"stage": "Respondido", "progress_percent": 100, "is_terminal": true, "resolution_status": "resolved"},
    {"stage": "Não Respondido", "progress_percent": 0, "is_terminal": true, "resolution_status": "unresolved"}
  ]'::jsonb,
  true,
  7,
  6
FROM pipelines p;

-- PARTE 4: Atualizar cards com novas colunas
ALTER TABLE cards
ADD COLUMN IF NOT EXISTS current_lifecycle_stage TEXT,
ADD COLUMN IF NOT EXISTS lifecycle_progress_percent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS resolution_status TEXT,
ADD COLUMN IF NOT EXISTS is_monetary_locked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Criar índices para otimizar buscas
CREATE INDEX IF NOT EXISTS idx_cards_intention_lifecycle ON cards(intention_type, current_lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_cards_last_activity ON cards(last_activity_at);
CREATE INDEX IF NOT EXISTS idx_cards_monetary_locked ON cards(is_monetary_locked);

-- PARTE 5: Atualizar card_analysis_history
ALTER TABLE card_analysis_history
ADD COLUMN IF NOT EXISTS lifecycle_stage_at_analysis TEXT,
ADD COLUMN IF NOT EXISTS lifecycle_progress_percent INTEGER;

-- PARTE 6: Criar tabela pipeline_movement_rules
CREATE TABLE IF NOT EXISTS pipeline_movement_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  intention_type TEXT NOT NULL,
  
  -- Condições de ativação
  when_lifecycle_stage TEXT,
  when_conversation_status TEXT,
  when_inactivity_days INTEGER,
  
  -- Ação
  move_to_column_name TEXT NOT NULL,
  
  -- Meta
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(pipeline_id, intention_type, when_lifecycle_stage)
);

-- Enable RLS
ALTER TABLE pipeline_movement_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage movement rules"
ON pipeline_movement_rules
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM pipelines p
    WHERE p.id = pipeline_movement_rules.pipeline_id
    AND user_is_workspace_member(auth.uid(), p.workspace_id)
    AND has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Workspace members can view movement rules"
ON pipeline_movement_rules
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM pipelines p
    WHERE p.id = pipeline_movement_rules.pipeline_id
    AND user_is_workspace_member(auth.uid(), p.workspace_id)
  )
);

-- Popular regras padrão
INSERT INTO pipeline_movement_rules (pipeline_id, intention_type, when_lifecycle_stage, move_to_column_name, priority)
SELECT p.id, 'venda', 'Ganho', 'Finalizados', 1 FROM pipelines p
UNION ALL
SELECT p.id, 'venda', 'Perdido', 'Finalizados', 1 FROM pipelines p
UNION ALL
SELECT p.id, 'assistencia', 'Entregue', 'Finalizados', 1 FROM pipelines p
UNION ALL
SELECT p.id, 'assistencia', 'Cancelado', 'Finalizados', 1 FROM pipelines p
UNION ALL
SELECT p.id, 'duvida', 'Respondido', 'Finalizados', 2 FROM pipelines p
UNION ALL
SELECT p.id, 'reclamacao', 'Resolvido', 'Finalizados', 1 FROM pipelines p
UNION ALL
SELECT p.id, 'acompanhamento', 'Atualizado', 'Finalizados', 2 FROM pipelines p
UNION ALL
SELECT p.id, 'garantia', 'Concluído', 'Finalizados', 1 FROM pipelines p
UNION ALL
SELECT p.id, 'garantia', 'Negado', 'Finalizados', 1 FROM pipelines p
UNION ALL
SELECT p.id, 'nps', 'Respondido', 'Finalizados', 3 FROM pipelines p;

-- PARTE 7: Criar tabela pipeline_inactivity_config
CREATE TABLE IF NOT EXISTS pipeline_inactivity_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  intention_type TEXT NOT NULL,
  
  -- Configuração de inatividade
  inactivity_days INTEGER NOT NULL DEFAULT 3,
  
  -- Ações
  move_to_column_name TEXT,
  set_resolution_status TEXT,
  
  -- Condições
  only_if_progress_below INTEGER,
  only_if_non_monetary BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(pipeline_id, intention_type)
);

-- Enable RLS
ALTER TABLE pipeline_inactivity_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage inactivity config"
ON pipeline_inactivity_config
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM pipelines p
    WHERE p.id = pipeline_inactivity_config.pipeline_id
    AND user_is_workspace_member(auth.uid(), p.workspace_id)
    AND has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Workspace members can view inactivity config"
ON pipeline_inactivity_config
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM pipelines p
    WHERE p.id = pipeline_inactivity_config.pipeline_id
    AND user_is_workspace_member(auth.uid(), p.workspace_id)
  )
);

-- Popular configurações de inatividade
INSERT INTO pipeline_inactivity_config (pipeline_id, intention_type, inactivity_days, move_to_column_name, set_resolution_status, only_if_progress_below)
SELECT p.id, 'duvida', 3, 'Finalizados', 'unresolved', 50 FROM pipelines p
UNION ALL
SELECT p.id, 'acompanhamento', 3, 'Finalizados', 'unresolved', 50 FROM pipelines p
UNION ALL
SELECT p.id, 'venda', 7, 'Aguardando', NULL, 30 FROM pipelines p
UNION ALL
SELECT p.id, 'assistencia', 7, 'Aguardando', NULL, 60 FROM pipelines p
UNION ALL
SELECT p.id, 'nps', 7, 'Finalizados', 'unresolved', 1 FROM pipelines p;