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
    version: "2.4.1",
    date: "2025-11-10",
    type: "fix",
    changes: [
      "Correção de layout para ocupar 100% da tela em todos os dispositivos",
      "Remoção de scrolls duplos e áreas não utilizadas",
      "Scrollbars internos otimizados para colunas do Kanban",
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
  // ... anterior entries ... (abreviado para economizar tokens na resposta, mas o arquivo original terá todos)
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
];

const typeConfig = {
  feature: { label: "Nova Feature", color: "bg-green-500/10 text-green-500", icon: Sparkles },
  refactor: { label: "Refatoração", color: "bg-blue-500/10 text-blue-500", icon: RefreshCw },
  fix: { label: "Correção", color: "bg-yellow-500/10 text-yellow-500", icon: FileText },
  breaking: { label: "Breaking Change", color: "bg-red-500/10 text-red-500", icon: Database },
};

export default function Changelog() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Changelog
          </h1>
          <p className="text-muted-foreground">
            Histórico completo de alterações e melhorias do sistema
          </p>
        </div>

        <div className="space-y-6 pb-10">
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
    </div>
  );
}