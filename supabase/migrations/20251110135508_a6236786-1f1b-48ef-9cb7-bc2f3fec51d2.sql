-- Adicionar campo para armazenar o nome do agente do Chatwoot
ALTER TABLE cards 
ADD COLUMN IF NOT EXISTS chatwoot_agent_name TEXT;

-- Criar índice para melhor performance em queries por agente
CREATE INDEX IF NOT EXISTS idx_cards_chatwoot_agent_name 
ON cards(chatwoot_agent_name) 
WHERE chatwoot_agent_name IS NOT NULL;

-- Atualizar cards existentes com o valor do campo assignee se disponível
UPDATE cards 
SET chatwoot_agent_name = assignee 
WHERE chatwoot_conversation_id IS NOT NULL 
AND assignee IS NOT NULL 
AND chatwoot_agent_name IS NULL;