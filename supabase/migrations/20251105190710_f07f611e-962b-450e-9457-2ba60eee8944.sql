-- FASE 1 - Migration 3: Criar tabela de configuração de SLA

-- 3.1 Criar tabela pipeline_sla_config
CREATE TABLE IF NOT EXISTS pipeline_sla_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  
  -- Tempos de SLA (em minutos)
  first_response_minutes INTEGER DEFAULT 60,
  ongoing_response_minutes INTEGER DEFAULT 240,
  
  -- Alertas de SLA
  warning_threshold_percent INTEGER DEFAULT 80,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(pipeline_id)
);

-- 3.2 RLS Policies
ALTER TABLE pipeline_sla_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own pipeline SLA config" ON pipeline_sla_config;
CREATE POLICY "Users can view own pipeline SLA config"
  ON pipeline_sla_config FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pipelines p
      WHERE p.id = pipeline_sla_config.pipeline_id 
      AND p.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage own pipeline SLA config" ON pipeline_sla_config;
CREATE POLICY "Users can manage own pipeline SLA config"
  ON pipeline_sla_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM pipelines p
      WHERE p.id = pipeline_sla_config.pipeline_id 
      AND p.created_by = auth.uid()
    )
  );

-- 3.3 Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_pipeline_sla_config_updated_at ON pipeline_sla_config;
CREATE TRIGGER update_pipeline_sla_config_updated_at
  BEFORE UPDATE ON pipeline_sla_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 3.4 Inserir configurações padrão para pipelines existentes
INSERT INTO pipeline_sla_config (pipeline_id, first_response_minutes, ongoing_response_minutes, warning_threshold_percent)
SELECT id, 60, 240, 80
FROM pipelines
ON CONFLICT (pipeline_id) DO NOTHING;