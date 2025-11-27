# Integração Chatwoot - Flow AI Board

## Visão Geral
O Flow AI Board integra-se com o Chatwoot para criar e gerenciar cards automaticamente a partir de conversas de atendimento.

## Premissas da Integração

### 1. Criação de Cards
- **Quando**: Um card é criado automaticamente quando uma nova conversa é iniciada no Chatwoot
- **Evento**: `conversation_created` ou primeira `message_created`
- **Coluna Inicial**: Primeira coluna do pipeline configurado

### 2. Atualização de Cards
- **Quando**: Novas mensagens chegam na conversa
- **Evento**: `message_created`
- **Ação**: Adiciona o conteúdo da mensagem à descrição do card
- **Transcrição de Áudio**: Áudios são automaticamente transcritos e incluem detecção de emoção

### 3. **Resolução de Conversas (IMPORTANTE)**
- **Premissa**: Quando uma conversa é marcada como "Resolvida" no Chatwoot, o card correspondente deve ser automaticamente movido para a última coluna do pipeline e marcado como concluído
- **Evento**: `conversation_updated` com `status: 'resolved'`
- **Ação Automática**:
  - Move o card para a última coluna do pipeline
  - Define `completion_type = 'completed'`
  - Define `completion_reason = 'Resolvido no Chatwoot'`
  - Registra `completed_at` com timestamp atual
- **Log**: `✅ Marking card as resolved and moving to column [nome_da_coluna]`

### 4. Sincronização de Dados
- **Nome do Cliente**: Extraído de `conversation.meta.sender.name` ou fallback para telefone
- **Agente Responsável**: Extraído de `conversation.assignee.name` ou `sender.name` (se agente)
- **Valor do Negócio**: Extraído pela IA da descrição da conversa
- **Produto/Serviço**: Identificado automaticamente pela IA

### 5. Análise de IA
- **Quando**: Disparada após cada atualização de card
- **Função**: `analyze-conversation`
- **Extrai**:
  - Resumo da conversa
  - Tipo de funil (compra, suporte, informação)
  - Score de qualidade de atendimento (0-100)
  - Score de chance de conversão (0-100)
  - Valor monetário mencionado
  - Produto/serviço discutido
  - Emoção detectada (em áudios)
  - Campos customizados configurados no pipeline

### 6. Prevenção de Duplicatas
- **Mecanismo**: Tabela `chatwoot_processed_events` com constraint unique em `signature`
- **Signature**: Baseada em `messageId` ou combinação de `conversationId + senderName + messageType + content`
- **Proteção**: Evita criação de múltiplos cards para a mesma conversa

## Configuração Necessária

### No Chatwoot
1. Criar webhook apontando para: `https://[seu-projeto].supabase.co/functions/v1/chatwoot-webhook`
2. Configurar eventos:
   - `conversation_created`
   - `message_created`
   - `message_updated`
   - `conversation_updated` ← **Essencial para detecção de resolução**

### No Flow AI Board
1. Ir em "Brain" → "Integrações"
2. Adicionar integração Chatwoot
3. Informar:
   - Account ID do Chatwoot
   - URL do Chatwoot
   - API Key (opcional, para download de áudios)
4. Selecionar o pipeline de destino

## Troubleshooting

### Cards não estão sendo movidos quando conversa é resolvida
**Causa**: Webhook não está enviando evento `conversation_updated` ou campo `status` não está presente
**Solução**: 
1. Verificar configuração do webhook no Chatwoot
2. Verificar logs da função `chatwoot-webhook` para confirmar recebimento do evento
3. Procurar por log: `✅ Marking card as resolved and moving to column`

### Múltiplos cards para mesma conversa
**Causa**: Migration de constraint unique não foi aplicada
**Solução**: Aplicar migration `20251126200000_ensure_unique_event_signature.sql`

### Valor não aparece no card
**Causa**: IA está colocando valor em campo customizado em vez do campo nativo
**Solução**: Sistema agora tem fallback automático que copia de campos customizados para campo `value`

### Áudio não é transcrito
**Causa**: Modelo configurado não suporta transcrição ou API key inválida
**Solução**: 
1. Verificar `pipeline_ai_config.transcription_model` (recomendado: `google/gemini-flash-1.5-8b`)
2. Verificar `pipeline_ai_config.openrouter_api_key`

## Logs Importantes

### Webhook
- `Searching for existing card with conversationId: [id]`
- `Existing card found: [card_id]`
- `✅ Marking card as resolved and moving to column [name]`
- `DEBUG - customerName extracted: [name]`

### Análise de IA
- `Analysis completed: { value: [number], conversation_status: [status] }`
- `⚠️ FALLBACK: Copiando valor de custom_field "[field]" ([value]) para campo nativo "value"`

## Fluxo Completo

```
1. Cliente envia mensagem no WhatsApp/Instagram
   ↓
2. Chatwoot recebe e dispara webhook
   ↓
3. chatwoot-webhook cria/atualiza card
   ↓
4. Se áudio: transcreve com detecção de emoção
   ↓
5. Adiciona mensagem à descrição do card
   ↓
6. Dispara analyze-conversation
   ↓
7. IA extrai informações estruturadas
   ↓
8. Card é atualizado com dados da IA
   ↓
9. Se conversa resolvida: move para última coluna
```

## Versão
Última atualização: 27/11/2024
