-- Adicionar campos para controle de finalização de negócios
ALTER TABLE cards 
ADD COLUMN conversation_status text DEFAULT 'open' CHECK (conversation_status IN ('open', 'closed')),
ADD COLUMN win_confirmation text,
ADD COLUMN loss_reason text;