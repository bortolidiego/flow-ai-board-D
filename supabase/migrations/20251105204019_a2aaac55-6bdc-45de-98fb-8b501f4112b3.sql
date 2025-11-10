-- FASE 1: Atualizar Estrutura das Colunas do Pipeline
-- Renomear e Consolidar Colunas para 4 Etapas Universais

-- 1.1 Atualizar nomes das colunas existentes
UPDATE columns SET name = 'Novo Contato' WHERE name = 'Lead';
UPDATE columns SET name = 'Em Atendimento' WHERE name = 'Orçamento';
UPDATE columns SET name = 'Aguardando' WHERE name = 'Negociação';
UPDATE columns SET name = 'Finalizados' WHERE name = 'Ganho';

-- 1.2 Mover cards da coluna "Perdido" para "Finalizados"
UPDATE cards 
SET column_id = (SELECT id FROM columns WHERE name = 'Finalizados' LIMIT 1)
WHERE column_id = (SELECT id FROM columns WHERE name = 'Perdido' LIMIT 1);

-- 1.3 Remover coluna "Perdido"
DELETE FROM columns WHERE name = 'Perdido';

-- 1.4 Reajustar positions das colunas restantes para garantir sequência correta
UPDATE columns SET position = 0 WHERE name = 'Novo Contato';
UPDATE columns SET position = 1 WHERE name = 'Em Atendimento';
UPDATE columns SET position = 2 WHERE name = 'Aguardando';
UPDATE columns SET position = 3 WHERE name = 'Finalizados';

-- Comentários para documentação
COMMENT ON TABLE columns IS 'Etapas fixas universais do pipeline: Novo Contato → Em Atendimento → Aguardando → Finalizados';

-- Resultado esperado:
-- - 4 etapas universais criadas
-- - Cards preservados e migrados corretamente  
-- - IDs das colunas mantidos (preserva relacionamentos)
-- - SLA funcionará em todas as etapas exceto "Finalizados"