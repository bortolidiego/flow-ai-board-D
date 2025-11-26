
### Anthropic Claude
- `anthropic/claude-3.5-sonnet` - Excelente para análise de conversas
- `anthropic/claude-3-opus` - Máxima qualidade
- `anthropic/claude-3-haiku` - Rápido e econômico

### Google Gemini
- `google/gemini-2.0-flash-exp` - Rápido e eficiente
- `google/gemini-1.5-pro` - Alta capacidade de contexto

### Meta Llama
- `meta-llama/llama-3.3-70b-instruct` - Open source de alta qualidade

### Outros
- `mistralai/mistral-large` - Modelo europeu de alta qualidade
- `cohere/command-r-plus` - Otimizado para RAG

> [!TIP]
> Veja a lista completa de modelos em [https://openrouter.ai/models](https://openrouter.ai/models)

## 5. Comparação de Custos

Custos aproximados por 1M de tokens (valores em USD):

| Modelo | Input | Output | Uso Recomendado |
|--------|-------|--------|-----------------|
| `openai/gpt-4o-mini` | $0.15 | $0.60 | Análise de conversas (melhor custo-benefício) |
| `openai/gpt-4o` | $2.50 | $10.00 | Análises complexas |
| `anthropic/claude-3.5-sonnet` | $3.00 | $15.00 | Compreensão profunda de contexto |
| `google/gemini-2.0-flash-exp` | $0.00 | $0.00 | Grátis durante preview |
| `meta-llama/llama-3.3-70b-instruct` | $0.35 | $0.40 | Melhor custo open source |

> [!NOTE]
> Preços podem variar. Consulte [https://openrouter.ai/models](https://openrouter.ai/models) para valores atualizados.

## 6. Troubleshooting

### Erro: "OPENROUTER_API_KEY não configurada"

**Solução**: Verifique se a chave foi adicionada corretamente nos secrets do Supabase.

```bash
# Verificar secrets configurados
supabase secrets list
```

### Erro: "OpenRouter API error: 401"

**Causa**: API key inválida ou expirada.

**Solução**: 
1. Verifique se a chave está correta
2. Gere uma nova chave em [https://openrouter.ai/keys](https://openrouter.ai/keys)
3. Atualize o secret no Supabase

### Erro: "OpenRouter API error: 402"

**Causa**: Créditos insuficientes na conta do OpenRouter.

**Solução**: Adicione créditos em [https://openrouter.ai/credits](https://openrouter.ai/credits)

### Erro: "Model not found"

**Causa**: Modelo digitado incorretamente ou não disponível.

**Solução**: 
1. Verifique o formato: `provedor/nome-do-modelo`
2. Consulte modelos disponíveis em [https://openrouter.ai/models](https://openrouter.ai/models)
3. Exemplos corretos:
   - ✅ `openai/gpt-4o-mini`
   - ✅ `anthropic/claude-3.5-sonnet`
   - ❌ `gpt-4o-mini` (falta provedor)
   - ❌ `openai/gpt4` (nome incorreto)

### Transcrição de áudio não funciona

**Verificar**:
1. Modelo de transcrição está configurado corretamente
2. Modelo suporta transcrição (ex: `openai/whisper-1`)
3. Formato de áudio é suportado (mp3, wav, ogg, etc.)

### Análise muito lenta

**Soluções**:
1. Use modelos mais rápidos:
   - `openai/gpt-4o-mini` ao invés de `openai/gpt-4o`
   - `google/gemini-2.0-flash-exp` (grátis e rápido)
   - `meta-llama/llama-3.3-70b-instruct`
2. Reduza o tamanho das conversas analisadas

## 7. Boas Práticas

### Escolha do Modelo

- **Análise de conversas simples**: `openai/gpt-4o-mini` ou `google/gemini-2.0-flash-exp`
- **Análise complexa com contexto longo**: `google/gemini-1.5-pro` ou `anthropic/claude-3.5-sonnet`
- **Transcrição de áudio**: `openai/whisper-1`
- **Melhor custo**: `meta-llama/llama-3.3-70b-instruct` ou `google/gemini-2.0-flash-exp`

### Monitoramento de Custos

1. Acesse [https://openrouter.ai/activity](https://openrouter.ai/activity)
2. Monitore uso por modelo
3. Configure alertas de gastos
4. Ajuste modelos conforme necessário

### Segurança

- ✅ Nunca compartilhe sua API key
- ✅ Use secrets do Supabase (não hardcode)
- ✅ Rotacione chaves periodicamente
- ✅ Monitore uso suspeito

## 8. Recursos Adicionais

- [Documentação do OpenRouter](https://openrouter.ai/docs)
- [Lista de Modelos](https://openrouter.ai/models)
- [Status da API](https://status.openrouter.ai/)
- [Suporte](https://discord.gg/openrouter)
