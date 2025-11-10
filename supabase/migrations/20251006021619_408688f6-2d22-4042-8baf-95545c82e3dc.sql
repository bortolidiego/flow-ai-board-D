-- Add value and inbox fields to cards table
ALTER TABLE public.cards 
ADD COLUMN IF NOT EXISTS value DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS inbox_name TEXT;

COMMENT ON COLUMN public.cards.value IS 'Valor estimado ou real do negócio';
COMMENT ON COLUMN public.cards.inbox_name IS 'Nome do canal/inbox do Chatwoot (WhatsApp, Instagram, etc)';