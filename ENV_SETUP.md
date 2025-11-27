# Configuração de Variáveis de Ambiente

## Problema Identificado

O Supabase injeta automaticamente `SUPABASE_SERVICE_ROLE_KEY` nas Edge Functions, mas em alguns casos essa chave vem truncada/inválida (41 caracteres em vez de ~200).

## Solução Implementada

Usamos uma variável customizada `SERVICE_ROLE_KEY` que é configurada como secret no Supabase e está disponível para todas as Edge Functions.

## Configuração Local (Desenvolvimento)

1. Copie `.env.example` para `.env`:
   ```bash
   cp .env.example .env
   ```

2. Preencha com os valores do seu projeto Supabase (disponíveis em Settings → API):
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SERVICE_ROLE_KEY` (service_role key)

## Configuração em Produção (Supabase)

A variável `SERVICE_ROLE_KEY` já está configurada como secret global no Supabase e está disponível para todas as Edge Functions.

Para atualizar ou verificar:

```bash
# Ver secrets atuais
npx supabase secrets list --project-ref dqnzwlumxbbissehrumv

# Atualizar SERVICE_ROLE_KEY
npx supabase secrets set SERVICE_ROLE_KEY="sua-chave-aqui" --project-ref dqnzwlumxbbissehrumv
```

## Uso nas Edge Functions

Todas as Edge Functions devem usar:

```typescript
const supabaseKey = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
```

Isso garante:
1. **Produção**: Usa `SERVICE_ROLE_KEY` (configurada como secret)
2. **Fallback**: Se não encontrar, tenta `SUPABASE_SERVICE_ROLE_KEY` (auto-injetada)
3. **Desenvolvimento local**: Usa o valor do `.env`

## Novas Edge Functions

Ao criar novas Edge Functions, sempre use o padrão acima para obter a Service Role Key. Não é necessário configurar nada adicional, pois `SERVICE_ROLE_KEY` é um secret global.

## Segurança

⚠️ **NUNCA** commite o arquivo `.env` no git. Ele já está no `.gitignore`.

⚠️ A `SERVICE_ROLE_KEY` tem acesso total ao banco de dados. Mantenha-a segura!
