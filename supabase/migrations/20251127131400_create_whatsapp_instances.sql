CREATE TABLE IF NOT EXISTS public.whatsapp_instances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_id UUID NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
  
  -- Identificação da instância UAZAPI
  instance_name TEXT NOT NULL,
  instance_token TEXT NOT NULL UNIQUE,
  
  -- Configuração UAZAPI
  uazapi_base_url TEXT NOT NULL,
  uazapi_admin_token TEXT, -- Opcional, para operações administrativas
  
  -- Status da instância
  status TEXT DEFAULT 'disconnected' CHECK (status IN ('disconnected', 'connecting', 'connected', 'error')),
  qr_code TEXT, -- QR Code para conexão (temporário)
  qr_code_expires_at TIMESTAMPTZ,
  phone_number TEXT, -- Número conectado (após conexão)
  
  -- Metadados
  active BOOLEAN DEFAULT TRUE,
  last_connected_at TIMESTAMPTZ,
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_pipeline ON whatsapp_instances(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_status ON whatsapp_instances(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_token ON whatsapp_instances(instance_token);

-- RLS
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

-- Políticas (seguindo padrão chatwoot_integrations)
-- Políticas (seguindo padrão chatwoot_integrations)
-- CREATE POLICY whatsapp_instances_select_policy ON public.whatsapp_instances
--   FOR SELECT TO authenticated
--   USING (EXISTS (
--     SELECT 1 FROM public.pipelines p
--     JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
--     WHERE p.id = whatsapp_instances.pipeline_id
--   ));

-- CREATE POLICY whatsapp_instances_insert_policy ON public.whatsapp_instances
--   FOR INSERT TO authenticated
--   WITH CHECK (EXISTS (
--     SELECT 1 FROM public.pipelines p
--     JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
--     WHERE p.id = whatsapp_instances.pipeline_id
--   ));

-- CREATE POLICY whatsapp_instances_update_policy ON public.whatsapp_instances
--   FOR UPDATE TO authenticated
--   USING (EXISTS (
--     SELECT 1 FROM public.pipelines p
--     JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
--     WHERE p.id = whatsapp_instances.pipeline_id
--   ));

-- CREATE POLICY whatsapp_instances_delete_policy ON public.whatsapp_instances
--   FOR DELETE TO authenticated
--   USING (EXISTS (
--     SELECT 1 FROM public.pipelines p
--     JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
--     WHERE p.id = whatsapp_instances.pipeline_id
--   ));

-- Trigger para updated_at
CREATE TRIGGER update_whatsapp_instances_updated_at
  BEFORE UPDATE ON public.whatsapp_instances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
