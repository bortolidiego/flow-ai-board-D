-- Renomear tabela intention_config para funnel_config
ALTER TABLE intention_config RENAME TO funnel_config;

-- Renomear colunas na tabela funnel_config
ALTER TABLE funnel_config RENAME COLUMN intention_type TO funnel_type;
ALTER TABLE funnel_config RENAME COLUMN intention_label TO funnel_name;

-- Renomear colunas na tabela cards
ALTER TABLE cards RENAME COLUMN intention_type TO funnel_type;
ALTER TABLE cards RENAME COLUMN intention_score TO funnel_score;

-- Renomear colunas na tabela card_analysis_history
ALTER TABLE card_analysis_history RENAME COLUMN intention_type TO funnel_type;
ALTER TABLE card_analysis_history RENAME COLUMN intention_score TO funnel_score;

-- Renomear colunas na tabela pipeline_movement_rules
ALTER TABLE pipeline_movement_rules RENAME COLUMN intention_type TO funnel_type;

-- Renomear colunas na tabela pipeline_inactivity_config
ALTER TABLE pipeline_inactivity_config RENAME COLUMN intention_type TO funnel_type;

-- Recriar índices se necessário (Postgres renomeia automaticamente, mas vamos garantir)
-- Os índices e constraints são renomeados automaticamente pelo Postgres

-- Atualizar comentários das tabelas
COMMENT ON TABLE funnel_config IS 'Configuração de funis de conversão por pipeline';
COMMENT ON COLUMN funnel_config.funnel_type IS 'Tipo/identificador único do funil';
COMMENT ON COLUMN funnel_config.funnel_name IS 'Nome amigável do funil para exibição';
COMMENT ON COLUMN funnel_config.is_monetary IS 'Indica se este funil representa oportunidades monetárias';
COMMENT ON COLUMN funnel_config.lifecycle_stages IS 'Etapas do ciclo de vida deste funil';