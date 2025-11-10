-- FASE 1 - Migration 1: Adicionar campos de finalização e perfil de cliente aos cards

-- 1.1 Adicionar campos de finalização aos cards
ALTER TABLE cards 
ADD COLUMN IF NOT EXISTS completion_type VARCHAR(20) CHECK (completion_type IN ('won', 'lost', 'completed')),
ADD COLUMN IF NOT EXISTS completion_reason TEXT,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS customer_profile_id UUID;

-- 1.2 Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_cards_completion ON cards(completion_type, completed_at) WHERE completion_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cards_customer_profile ON cards(customer_profile_id) WHERE customer_profile_id IS NOT NULL;

-- 1.3 Comentários para documentação
COMMENT ON COLUMN cards.completion_type IS 'Tipo de finalização: won (ganho), lost (perdido), completed (concluído sem venda)';
COMMENT ON COLUMN cards.completion_reason IS 'Motivo detalhado da finalização';
COMMENT ON COLUMN cards.customer_profile_id IS 'Vincula card ao perfil centralizado do cliente';