import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, RefreshCw, Database, Sparkles } from "lucide-react";

interface ChangelogEntry {
  version: string;
  date: string;
  type: "feature" | "refactor" | "fix" | "breaking";
  changes: string[];
}

const changelog: ChangelogEntry[] = [
  {
    version: "2.6.0",
    date: "2025-11-26",
    type: "feature",
    changes: [
      "Migração completa de OpenAI para OpenRouter - suporte a múltiplos provedores de IA",
      "Campo de configuração de API Key do OpenRouter por workspace (obrigatório)",
      "Modelos de IA agora são configuráveis via input de texto livre",
      "Suporte a modelos de múltiplos provedores: OpenAI, Anthropic, Google, Meta, Mistral",
      "Modelo de transcrição de áudio configurável (padrão: openai/whisper-1)",
      "Removida dependência de chave API global - cada workspace configura sua própria chave",
      "Edge Functions atualizadas: analyze-conversation e audio-transcribe",
      "Novas colunas no banco: transcription_model e openrouter_api_key",
      "Documentação completa em OPENROUTER_SETUP.md com guia de configuração",
      "Validação de API key obrigatória antes de salvar configurações",
      "Interface melhorada com campos de input para modelos e exemplos inline",
    ],
  },
  {
    version: "2.5.0",
    date: "2025-11-26",
    type: "fix",
    changes: [
      "Corrigido carregamento automático do card no Chatwoot Sidebar",
      "Implementado estado compartilhado para sobreviver ao React StrictMode",
      "Corrigida query de cards para usar column_id ao invés de workspace_id inexistente",
      "Adicionado import de useCallback faltante em useConversationCard",
      "Corrigido erro de sintaxe em ChatwootSidebar.tsx",
      "Corrigida query de funnel_config para usar pipeline_id",
      "Implementada solicitação explícita de contexto ao Chatwoot no mount",
      "Corrigido problema de package.json corrompido usando script Node.js",
      "Adicionada lógica de busca de pipeline e colunas antes de buscar cards",
      "Melhorados logs de debug para rastreamento de contexto e queries",
    ],
  },
  {
    version: "2.4.0",
    date: "2025-11-10",
    type: "fix",
    changes: [
      "Corrigida detecção de agente vs cliente nas mensagens do Chatwoot",
      "Removida duplicação de nomes nas mensagens (formato agora: [HH:MM] 🧑‍💼 Atendente Nome: mensagem)",
      "Melhorada detecção de eventos duplicados do webhook (janela aumentada de 2s para 5s)",
      "Adicionado campo chatwoot_agent_name para armazenar nome do atendente",
      "Melhorado prompt de IA para entender formato correto das mensagens",
      "Interface de conversa agora destaca visualmente mensagens de agente vs cliente",
      "Exibição do nome do atendente nos detalhes do card",
      "Análise de IA agora identifica corretamente quem é cliente e quem é agente",
    ],
  },
  {
    version: "2.3.1",
    date: "2025-11-09",
    type: "refactor",
    changes: [
      "Todos os cards do Kanban atualizados com informações mais recentes",
      "Valores de scores, lifecycle_progress e campos personalizados sincronizados com última análise",
      "Summaries de conversação atualizados refletindo estado atual de cada negociação",
      "Valores monetários ajustados conforme evolução das negociações",
      "Custom fields enriquecidos com informações detalhadas de cada etapa",
      "Cards agora refletem fielmente o estado final de suas respectivas timelines",
    ],
  },
  {
    version: "2.3.0",
    date: "2025-11-09",
    type: "feature",
    changes: [
      "Implementado sistema completo de histórico de análises com timeline detalhada",
      "Cada card agora possui múltiplas entradas de análise ao longo do tempo",
      "Timeline mostra evolução de scores (funil e qualidade), mudanças em campos e progresso do ciclo de vida",
      "Dados mock realistas com 3-4 análises por card cobrindo vários dias",
      "Histórico inclui sugestões de IA, snapshots de custom fields e informações de trigger",
      "Visualização de tendências com indicadores de aumento/redução nos scores",
      "Comparação entre análises sucessivas destacando campos que mudaram",
    ],
  },
  {
    version: "2.2.0",
    date: "2025-11-09",
    type: "refactor",
    changes: [
      "Melhorias na visualização de informações dos cards do Kanban",
      "Exibição apenas do 'funnel_type' no contexto do card (removido 'subject')",
      "Adicionado indicador visual da etapa do ciclo de vida ao lado do tipo de funil no topo do card",
      "Ícone de seta (→) entre tipo de funil e etapa atual para melhor legibilidade",
      "Justificativa de conclusão agora exibida para todos os tipos de finalização (win/loss/completed)",
      "Labels mais claros: 'Criado há' antes do tempo e 'SLA:' antes do indicador de SLA",
      "Badge secundário para destacar a etapa atual do ciclo de vida",
    ],
  },
  {
    version: "2.1.0",
    date: "2025-11-09",
    type: "feature",
    changes: [
      "Nova aba 'Integrações' na página Brain para gerenciar conexões externas",
      "Componente IntegrationStatusBadge criado para exibir status de integrações",
      "ChatwootSettings refatorado: removido Dialog wrapper para uso direto em abas",
      "Botão visual de Pausar/Retomar Sincronia do Chatwoot com confirmação",
      "Card de status da integração Chatwoot adicionado ao dashboard do Brain",
      "Exibição de última atualização e status visual (Sincronizando/Pausado/Não Configurado)",
      "Controle centralizado da integração Chatwoot com feedback visual em tempo real",
    ],
  },
  {
    version: "2.0.0",
    date: "2025-11-09",
    type: "breaking",
    changes: [
      "Refatoração completa: 'Intenção' → 'Funil' em todo o sistema",
      "Banco de dados: Renomeada tabela 'intention_config' → 'funnel_config'",
      "Banco de dados: Campos 'intention_type', 'intention_label', 'intention_score' → 'funnel_type', 'funnel_name', 'funnel_score'",
      "Componentes: IntentionTypesManager → FunnelTypesManager",
      "Componentes: IntentionLifecycleManager → FunnelLifecycleManager",
      "Componentes: IntentionFieldsCard → FunnelFieldsCard (deletado antigo)",
      "Componentes: IntentionMeter → FunnelMeter (deletado antigo)",
      "Prompt Builder: Schema atualizado com 'funnel_type' e 'funnel_score'",
      "Prompt Templates: Objetivo 'detect_intention' → 'detect_funnel'",
      "Templates: 'intention_types' → 'funnel_types' em todo sistema de templates",
      "Kanban: KanbanCard, KanbanColumn e KanbanFilters atualizados",
      "Movement Rules: CardMovementRulesManager atualizado para 'funnel_score'",
      "Edge Function: apply-behavior-template atualizado para suportar novos campos",
      "Brain Pages: Tabs e componentes atualizados para terminologia 'Funil'",
      "Custom Fields: pipeline_custom_fields suporta novos tipos (email, phone, url, number, currency)",
      "Lifecycle: Suporte completo a estágios de ciclo de vida por tipo de funil",
      "Movement Rules: Sistema de movimentação automática baseado em lifecycle_stage",
      "Inactivity Rules: Regras de inatividade configuráveis por funil",
      "Campos Monetários: Suporte a 'is_monetary' e 'can_change_from_monetary'",
    ],
  },
  {
    version: "1.5.0",
    date: "2025-11-08",
    type: "feature",
    changes: [
      "Adicionado sistema de templates de comportamento",
      "BehaviorTemplatePreview e BehaviorTemplateSelector criados",
      "Suporte a aplicação de templates via edge function",
      "Pipeline AI Config com múltiplos objetivos de análise",
      "Configuração de análise on_close e on_message",
    ],
  },
];

const typeConfig = {
  feature: { label: "Nova Feature", color: "bg-green-500/10 text-green-500", icon: Sparkles },
  refactor: { label: "Refatoração", color: "bg-blue-500/10 text-blue-500", icon: RefreshCw },
  fix: { label: "Correção", color: "bg-yellow-500/10 text-yellow-500", icon: FileText },
  breaking: { label: "Breaking Change", color: "bg-red-500/10 text-red-500", icon: Database },
};

export default function Changelog() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Changelog
        </h1>
        <p className="text-muted-foreground">
          Histórico completo de alterações e melhorias do sistema
        </p>
      </div>

      <div className="space-y-6">
        {changelog.map((entry, idx) => {
          const config = typeConfig[entry.type];
          const Icon = config.icon;

          return (
            <Card key={idx} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-lg font-mono px-3 py-1">
                      v{entry.version}
                    </Badge>
                    <Badge className={config.color}>
                      <Icon className="w-3 h-3 mr-1" />
                      {config.label}
                    </Badge>
                  </div>
                  <time className="text-sm text-muted-foreground">{entry.date}</time>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="pt-6">
                <ul className="space-y-2">
                  {entry.changes.map((change, changeIdx) => (
                    <li key={changeIdx} className="flex items-start gap-2 text-sm">
                      <span className="text-primary mt-1">•</span>
                      <span className="text-foreground/90">{change}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
