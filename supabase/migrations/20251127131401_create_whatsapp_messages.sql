CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id UUID NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  card_id UUID REFERENCES public.cards(id) ON DELETE SET NULL,
  
  -- Identificação da mensagem
  message_id TEXT NOT NULL,
  chat_id TEXT NOT NULL,
  
  -- Conteúdo
  message_type TEXT CHECK (message_type IN ('text', 'image', 'audio', 'video', 'document')),
  content TEXT,
  media_url TEXT,
  
  -- Metadados
  is_from_me BOOLEAN DEFAULT FALSE,
  sender_name TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(instance_id, message_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_instance ON whatsapp_messages(instance_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_card ON whatsapp_messages(card_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_chat ON whatsapp_messages(chat_id);

-- RLS
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY whatsapp_messages_select_policy ON public.whatsapp_messages
--   FOR SELECT TO authenticated
--   USING (EXISTS (
--     SELECT 1 FROM public.whatsapp_instances wi
--     JOIN public.pipelines p ON p.id = wi.pipeline_id
--     JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
--     WHERE wi.id = whatsapp_messages.instance_id
--   ));

-- CREATE POLICY whatsapp_messages_insert_policy ON public.whatsapp_messages
--   FOR INSERT TO authenticated
--   WITH CHECK (EXISTS (
--     SELECT 1 FROM public.whatsapp_instances wi
--     JOIN public.pipelines p ON p.id = wi.pipeline_id
--     JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
--     WHERE wi.id = whatsapp_messages.instance_id
--   ));
