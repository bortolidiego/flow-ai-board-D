-- Adicionar campos WhatsApp aos cards
ALTER TABLE public.cards 
ADD COLUMN IF NOT EXISTS whatsapp_instance_id UUID REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS whatsapp_chat_id TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_contact_name TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_contact_number TEXT;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_cards_whatsapp_instance ON cards(whatsapp_instance_id) WHERE whatsapp_instance_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cards_whatsapp_chat ON cards(whatsapp_chat_id) WHERE whatsapp_chat_id IS NOT NULL;

-- Comentários
COMMENT ON COLUMN cards.whatsapp_instance_id IS 'Referência à instância WhatsApp UAZAPI';
COMMENT ON COLUMN cards.whatsapp_chat_id IS 'ID do chat no WhatsApp (formato: 5511999999999@c.us)';
