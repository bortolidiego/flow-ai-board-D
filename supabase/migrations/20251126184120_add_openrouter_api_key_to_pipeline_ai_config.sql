-- Adicionar coluna openrouter_api_key na tabela pipeline_ai_config
ALTER TABLE pipeline_ai_config
ADD COLUMN IF NOT EXISTS openrouter_api_key TEXT;

-- Comentário explicativo
COMMENT ON COLUMN pipeline_ai_config.openrouter_api_key IS 'Chave API do OpenRouter para este pipeline (opcional, sobrescreve a chave global do Supabase)';
