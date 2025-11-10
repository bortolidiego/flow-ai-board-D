-- Fase 1: Criar tabela de histórico completo de análises
CREATE TABLE card_analysis_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Análise de intenção
  intention_type TEXT,
  intention_score INTEGER,
  
  -- Análise de qualidade
  service_quality_score INTEGER,
  service_quality_suggestions JSONB DEFAULT '[]'::jsonb,
  
  -- Resumo e contexto
  conversation_summary TEXT,
  subject TEXT,
  product_item TEXT,
  value NUMERIC,
  
  -- Status da conversa
  conversation_status TEXT,
  win_confirmation TEXT,
  loss_reason TEXT,
  
  -- Snapshots dos dados estruturados
  custom_fields_snapshot JSONB DEFAULT '{}'::jsonb,
  lead_data_snapshot JSONB DEFAULT '{}'::jsonb,
  
  -- Metadados da análise
  trigger_source TEXT, -- 'message', 'manual', 'close', 'cron'
  conversation_length INTEGER, -- quantas mensagens tinha
  model_used TEXT, -- qual modelo foi usado
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_card_analysis_history_card_id ON card_analysis_history(card_id);
CREATE INDEX idx_card_analysis_history_analyzed_at ON card_analysis_history(analyzed_at DESC);
CREATE INDEX idx_card_analysis_history_card_analyzed ON card_analysis_history(card_id, analyzed_at DESC);

-- RLS: Workspace members podem ver histórico dos cards do seu workspace
ALTER TABLE card_analysis_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view analysis history"
ON card_analysis_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM cards c
    JOIN columns col ON c.column_id = col.id
    JOIN pipelines p ON col.pipeline_id = p.id
    WHERE c.id = card_analysis_history.card_id
    AND user_is_workspace_member(auth.uid(), p.workspace_id)
  )
);

-- Fase 5: Remover campo personalizado duplicado que causa confusão
DELETE FROM pipeline_custom_fields 
WHERE field_name = 'tipo_solicitacao';