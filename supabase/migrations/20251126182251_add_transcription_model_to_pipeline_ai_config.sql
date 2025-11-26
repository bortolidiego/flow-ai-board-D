-- Adicionar coluna transcription_model na tabela pipeline_ai_config
ALTER TABLE pipeline_ai_config
ADD COLUMN IF NOT EXISTS transcription_model TEXT DEFAULT 'openai/whisper-1';

-- Comentário explicativo
COMMENT ON COLUMN pipeline_ai_config.transcription_model IS 'Modelo OpenRouter usado para transcrição de áudios (ex: openai/whisper-1)';
