-- Garante que a tabela chatwoot_processed_events existe e tem constraint unique na signature
CREATE TABLE IF NOT EXISTS chatwoot_processed_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  signature TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tenta adicionar a constraint unique se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chatwoot_processed_events_signature_key'
  ) THEN
    ALTER TABLE chatwoot_processed_events ADD CONSTRAINT chatwoot_processed_events_signature_key UNIQUE (signature);
  END IF;
END $$;
