# Explicação da Lógica de Funcionamento do App

Analisando os arquivos do projeto, este é um **sistema Kanban inteligente com IA integrada** para gestão de leads e atendimentos. Vou explicar a lógica de funcionamento:

## 🎯 Conceito Principal

O app é um **CRM visual tipo Kanban** que:
1. Sincroniza conversas do Chatwoot (plataforma de atendimento)
2. Usa IA para analisar conversas e extrair dados automaticamente
3. Move cards automaticamente baseado em regras e análises da IA
4. Gerencia ciclos de vida de leads com funis personalizados

## 🏗️ Arquitetura em Camadas

### 1. **Camada de Dados (Supabase)**
- **Workspaces**: Espaços de trabalho isolados
- **Pipelines**: Funis de vendas/atendimento dentro de workspaces
- **Columns**: Etapas do Kanban (ex: "Novo", "Em Atendimento", "Finalizado")
- **Cards**: Representam leads/atendimentos individuais
- **Lead Data**: Dados extraídos dos leads (nome, CPF, email, etc.)

### 2. **Camada de Integração**

#### Chatwoot Integration (`ChatwootSettings.tsx`)
```
Chatwoot → Webhook → Edge Function → Cria/Atualiza Cards
```
- Recebe eventos de conversas via webhook
- Cria cards automaticamente para novas conversas
- Atualiza cards quando mensagens chegam

#### Evolution API Integration
- Similar ao Chatwoot, mas para WhatsApp via Evolution API
- Sincroniza mensagens do WhatsApp diretamente

### 3. **Camada de IA (Análise Inteligente)**

#### Configuração (`AIPromptBuilder.tsx`)
O usuário configura:
- **Tipo de negócio**: E-commerce, Serviços, Imóveis, Suporte, etc.
- **Objetivos**: O que a IA deve extrair (dados do lead, tipo de funil, qualidade)
- **Campos customizados**: Campos específicos do negócio

#### Processo de Análise
```
1. Conversa chega → Card criado
2. IA analisa a conversa usando o prompt configurado
3. IA extrai:
   - Dados do lead (nome, telefone, email, etc.)
   - Tipo de funil (venda, suporte, orçamento, etc.)
   - Score de conversão (0-100%)
   - Score de qualidade do atendimento (0-100%)
   - Etapa do ciclo de vida
   - Campos customizados
4. Dados são salvos no card
```

### 4. **Camada de Automação**

#### Funis e Ciclos de Vida (`FunnelLifecycleManager.tsx`)
Cada funil tem:
- **Etapas do ciclo**: Ex: "Interesse" → "Negociação" → "Fechamento"
- **Progresso %**: Cada etapa tem um percentual de progresso
- **Etapas terminais**: Ganho, Perdido, Resolvido, etc.
- **Monetário/Não-monetário**: Funis de venda vs. suporte

#### Regras de Movimentação (`MovementRulesManager.tsx`)
```
SE (card chega na etapa "Fechamento")
ENTÃO (mover para coluna "Finalizados")
```

#### Regras de Inatividade (`InactivityRulesManager.tsx`)
```
SE (card sem atividade há 7 dias)
E (progresso < 50%)
E (funil não-monetário)
ENTÃO (mover para "Arquivados")
```

### 5. **Camada de Interface**

#### Kanban Board (`KanbanColumn.tsx` + `KanbanCard.tsx`)
- **Drag & Drop**: Mover cards entre colunas
- **Seleção em massa**: Selecionar múltiplos cards
- **Filtros avançados**: Por funil, atendente, valor, progresso, etc.
- **Ordenação**: Por progresso, valor, atividade, etc.

#### Card Details (`CardDetailDialog.tsx`)
Mostra:
- Resumo da conversa (gerado pela IA)
- Dados do lead (editáveis)
- Métricas (score de conversão, qualidade)
- Timeline de análises (histórico de mudanças)
- Progresso do ciclo de vida

## 🔄 Fluxo Completo de Uso

### Exemplo: Loja de Celulares

1. **Configuração Inicial**
```
Admin cria Pipeline "Vendas"
→ Configura funil "Venda" (monetário)
→ Etapas: Interesse → Orçamento → Negociação → Fechamento
→ Configura IA para extrair: modelo do celular, valor, forma de pagamento
→ Integra com Chatwoot
```

2. **Cliente entra em contato**
```
Cliente: "Oi, quanto custa o iPhone 15?"
→ Chatwoot recebe mensagem
→ Webhook cria card no Kanban
→ Card aparece na coluna "Novo"
```

3. **IA analisa automaticamente**
```
IA detecta:
- Funil: "Venda"
- Produto: "iPhone 15"
- Etapa: "Interesse" (10% de progresso)
- Score de conversão: 45%
- Dados do lead: (ainda não fornecidos)
```

4. **Atendente responde**
```
Atendente: "Olá! O iPhone 15 128GB está R$ 4.500. Qual seu nome?"
Cliente: "João Silva, CPF 123.456.789-00"
→ IA atualiza automaticamente:
   - Nome: João Silva
   - CPF: 123.456.789-00
   - Etapa: "Orçamento" (40% de progresso)
   - Score: 60%
```

5. **Negociação**
```
Cliente: "Aceita R$ 4.200 no PIX?"
Atendente: "Fechado! Pode fazer o PIX"
→ IA detecta:
   - Etapa: "Fechamento" (90% de progresso)
   - Valor: R$ 4.200
   - Forma de pagamento: PIX
   - Score: 95%
```

6. **Movimentação automática**
```
Regra: SE etapa = "Fechamento" ENTÃO mover para "Finalizados"
→ Card move automaticamente
→ Atendente marca como "Ganho"
→ Card arquivado com sucesso
```

## 🎨 Recursos Especiais

### 1. **Funis Monetários Travados**
- Se um card muda de funil monetário → não-monetário
- O card é "travado" para preservar o valor
- Evita perda de dados de vendas

### 2. **SLA (Service Level Agreement)**
- Calcula tempo desde criação do card
- Mostra badges: OK (verde), Atenção (amarelo), Atrasado (vermelho)
- Atualiza em tempo real

### 3. **Timeline de Análises**
- Histórico completo de todas as análises da IA
- Mostra evolução dos scores
- Identifica mudanças em campos

### 4. **Filtros Inteligentes**
```
Filtros rápidos:
- Monetárias travadas
- Em fechamento (progresso > 70%)
- Estagnadas (sem atividade > 7 dias)
- Sem atendente
- Alto valor (> R$ 5.000)
```

### 5. **Visões Salvas**
- Salvar combinações de filtros
- Compartilhar entre equipe
- Acesso rápido a visões frequentes

## 🔐 Segurança (RLS - Row Level Security)

Todas as tabelas têm políticas RLS:
```sql
-- Usuário só vê cards do seu workspace
CREATE POLICY "cards_select_policy" ON cards
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = cards.workspace_id
    AND user_id = auth.uid()
  )
);
```

## 📊 Métricas e Análises

### Scores da IA
- **Score de Conversão (0-100%)**: Probabilidade de fechar negócio
- **Score de Qualidade (0-100%)**: Qualidade do atendimento
- **Progresso do Ciclo (0-100%)**: Onde está no funil

### Totalizadores
- Valor total por coluna
- Quantidade de cards
- Cards selecionados

## 🎯 Casos de Uso

1. **E-commerce**: Vendas online, orçamentos, pós-venda
2. **Assistência Técnica**: Orçamentos de reparo, acompanhamento
3. **Imobiliária**: Leads de imóveis, visitas, propostas
4. **Educação**: Matrículas, dúvidas, suporte
5. **Suporte**: Tickets, reclamações, dúvidas

## 🔧 Componentes Principais

### Frontend (React + TypeScript)
- **AppLayout.tsx**: Layout principal com sidebar e breadcrumbs
- **KanbanBoard**: Visualização principal do Kanban
- **KanbanCard**: Card individual com métricas e dados
- **CardDetailDialog**: Modal com detalhes completos do card
- **AIPromptBuilder**: Configurador de prompts da IA
- **FunnelLifecycleManager**: Gerenciador de ciclos de vida
- **MovementRulesManager**: Configurador de regras de automação
- **ChatwootSettings**: Configuração da integração Chatwoot

### Backend (Supabase Edge Functions)
- **chatwoot-webhook**: Recebe eventos do Chatwoot
- **analyze-conversation**: Analisa conversas com IA
- **calculate-card-sla**: Calcula SLA dos cards

### Banco de Dados (PostgreSQL via Supabase)
Principais tabelas:
- `workspaces`: Espaços de trabalho
- `pipelines`: Funis de vendas/atendimento
- `columns`: Colunas do Kanban
- `cards`: Cards individuais
- `lead_data`: Dados dos leads
- `funnel_config`: Configuração dos funis
- `pipeline_ai_config`: Configuração da IA
- `pipeline_movement_rules`: Regras de movimentação
- `pipeline_inactivity_config`: Regras de inatividade
- `chatwoot_integrations`: Integrações com Chatwoot
- `card_analysis_history`: Histórico de análises

## 🚀 Fluxo de Dados

```
┌─────────────┐
│  Chatwoot   │
│  WhatsApp   │
└──────┬──────┘
       │ Webhook
       ▼
┌─────────────────┐
│  Edge Function  │
│  (Webhook)      │
└──────┬──────────┘
       │ Cria/Atualiza
       ▼
┌─────────────────┐
│     Card        │
│  (Supabase)     │
└──────┬──────────┘
       │ Trigger
       ▼
┌─────────────────┐
│  Edge Function  │
│  (Analyze)      │
└──────┬──────────┘
       │ Extrai dados
       ▼
┌─────────────────┐
│   IA (OpenAI)   │
│   Gemini        │
└──────┬──────────┘
       │ Retorna análise
       ▼
┌─────────────────┐
│  Atualiza Card  │
│  + Lead Data    │
└──────┬──────────┘
       │ Verifica regras
       ▼
┌─────────────────┐
│  Movimentação   │
│   Automática    │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Kanban Board   │
│  (Interface)    │
└─────────────────┘
```

## 📱 Responsividade

O app é totalmente responsivo:
- **Desktop**: Kanban horizontal com múltiplas colunas visíveis
- **Mobile**: Colunas colapsáveis, cards otimizados para toque
- **Tablet**: Layout híbrido adaptativo

## 🎨 Temas

Suporta tema claro e escuro com:
- Cores primárias personalizáveis
- Gradientes suaves
- Efeitos de glow em elementos interativos
- Backdrop blur para cards e modais

---

**Resumo**: É um Kanban inteligente que automatiza a gestão de leads usando IA para extrair dados, classificar intenções e mover cards automaticamente, integrando-se com plataformas de atendimento como Chatwoot e WhatsApp.