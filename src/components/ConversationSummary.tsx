"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronDown, ChevronUp, Clock, User, MessageSquare, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import ChatMessageBubble from "./ChatMessageBubble";

interface ConversationData {
  summary: string;
  winConfirmation: string | null;
  lossReason: string | null;
  suggestions: string[];
  successRate: number;
  score: number;
  funnelScore: number;
  lifecycleProgressPercent: number;
  lifecycleStageAtAnalysis: string;
  serviceQualityScore: number;
  subject: string | null;
  value: number | null;
  productItem: string | null;
  conversationLength: number;
  conversationStatus: string | null;
  conversationSummary: string | null;
  modelUsed: string | null;
  modelName: string | null;
  triggerSource: string | null;
  lastActivityAt: string | null;
  resolutionStatus: string | null;
  completionType: string | null;
  completionReason: string | null;
  completedAt: string | null;
  completedBy: string | null;
  isMonetaryLocked: boolean | null;
  currentLifecycleStage: string | null;
  customerProfileId: string | null;
}

interface Message {
  timestamp: string;
  sender: string;
  text: string;
}

interface ConversationSummaryProps {
  data: ConversationData;
  messages: Message[];
}

function getMessageDisplayName(sender: string): string {
  const name = sender
    .replace(/🧑‍💼|👤/g, "")
    .replace(/\b(Atendente|Cliente)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return name || sender;
}

function formatMessage(sender: string, text: string, timestamp: string) {
  const displayName = getMessageDisplayName(sender);
  const role = displayName.toLowerCase().includes('atendente') ? 'agent' : 'client';
  const time = format(new Date(timestamp), 'HH:mm', { locale: ptBR });
  
  return `[${time}] - ${displayName}: ${text}`;
}

function ArrowMessageDisplay({ messages }: { messages: Message[] }) {
  return (
    <div className="space-y-1">
      {messages.map((message, index) => (
        <div
          key={index}
          className="text-sm text-muted-foreground break-words"
        >
          {formatMessage(message.sender, message.text, message.timestamp)}
        </div>
      ))}
    </div>
  );
}

export const ConversationSummary: React.FC<ConversationSummaryProps> = ({
  data,
  messages,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("analysis");

  const getStatusColor = (status: string | null) => {
    if (!status) return "bg-gray-100 text-gray-800";
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes("won") || lowerStatus.includes("ganho")) {
      return "bg-green-100 text-green-800";
    }
    if (lowerStatus.includes("lost") || lowerStatus.includes("perdido")) {
      return "bg-red-100 text-red-800";
    }
    if (lowerStatus.includes("pending") || lowerStatus.includes("pendente")) {
      return "bg-yellow-100 text-yellow-800";
    }
    return "bg-blue-100 text-blue-800";
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "Não disponível";
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", {
        locale: ptBR,
      });
    } catch {
      return "Data inválida";
    }
  };

  const formatValue = (value: number | null) => {
    if (!value) return "Não informado";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getRoleFromSender = (sender: string): "agent" | "client" => {
    const displayName = getMessageDisplayName(sender);
    return displayName.toLowerCase().includes("atendente") ? "agent" : "client";
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Resumo da Conversa
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(data.conversationStatus)}>
              {data.conversationStatus || "Status não informado"}
            </Badge>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isExpanded && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="analysis">Análise</TabsTrigger>
              <TabsTrigger value="messages">Mensagens</TabsTrigger>
              <TabsTrigger value="details">Detalhes</TabsTrigger>
            </TabsList>

            <TabsContent value="analysis" className="space-y-4 mt-4">
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">
                    Resumo
                  </h4>
                  <p className="text-sm leading-relaxed">{data.summary}</p>
                </div>

                {data.conversationSummary && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">
                      Resumo da Conversa
                    </h4>
                    <p className="text-sm leading-relaxed">
                      {data.conversationSummary}
                    </p>
                  </div>
                )}

                {data.winConfirmation && (
                  <div>
                    <h4 className="font-medium text-sm text-green-700 mb-1">
                      Confirmação de Ganho
                    </h4>
                    <p className="text-sm text-green-600">{data.winConfirmation}</p>
                  </div>
                )}

                {data.lossReason && (
                  <div>
                    <h4 className="font-medium text-sm text-red-700 mb-1">
                      Motivo da Perda
                    </h4>
                    <p className="text-sm text-red-600">{data.lossReason}</p>
                  </div>
                )}

                {data.suggestions && data.suggestions.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">
                      Sugestões
                    </h4>
                    <ul className="space-y-1">
                      {data.suggestions.map((suggestion, index) => (
                        <li
                          key={index}
                          className="text-sm text-muted-frontend flex items-start gap-2"
                        >
                          <span className="text-primary mt-1">•</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="w-full flex justify-center">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl">
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <div className="text-lg font-semibild text-primary">
                        {data.score}/100
                      </div>
                      <div className="text-xs text-muted-frontend">Score</div>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <div className="text-lg font-semibold text-green-600">
                        {data.funnelScore}/100
                      </div>
                      <div className="text-xs text-muted-frontend">Funil</div>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <div className="text-lg font-semibold text-blue-600">
                        {data.lifecycleProgressPercent}%
                      </div>
                      <div className="text-xs text-muted-frontend">Progresso</div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="messages" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Mensagens</h3>
                  <div className="space-y-2">
                    {messages.map((message, index) => {
                      const role = getRoleFromSender(message.sender);
                      return (
                        <ChatMessageBubble
                          key={index}
                          role={role}
                          time={format(
                            new Date(message.timestamp),
                            "HH:mm",
                            { locale: ptBR }
                          )}
                          name={getMessageDisplayName(message.sender)}
                          message={message.text}
                        />
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Mensagens (Setas)</h3>
                  <ArrowMessageDisplay messages={messages} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">
                      Score
                    </h4>
                    <p className="text-sm">{data.score}/100</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">
                      Score do Funil
                    </h4>
                    <p className="text-sm">{data.funnelScore}/100</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">
                      Progresso do Ciclo de Vida
                    </h4>
                    <p className="text-sm">{data.lifecycleProgressPercent}%</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">
                      Estágio do Ciclo de Vida na Análise
                    </h4>
                    <p className="text-sm">{data.lifecycleStageAtAnalysis}</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">
                      Score de Qualidade do Serviço
                    </h4>
                    <p className="text-sm">{data.serviceQualityScore}/100</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">
                      Assunto
                    </h4>
                    <p className="text-sm">{data.subject || "Não informado"}</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">
                      Valor
                    </h4>
                    <p className="text-sm">{formatValue(data.value)}</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">
                      Item do Produto
                    </h4>
                    <p className="text-sm">{data.productItem || "Não informado"}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">
                      Taxa de Sucesso
                    </h4>
                    <p className="text-sm">{data.successRate.toFixed(1)}%</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">
                      Comprimento da Conversa
                    </h4>
                    <p className="text-sm">{data.conversationLength} mensagens</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">
                      Status da Conversa
                    </h4>
                    <p className="text-sm">{data.conversationStatus || "Não informado"}</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">
                      Modelo Usado
                    </h4>
                    <p className="text-sm">{data.modelUsed || data.modelName || "Não informado"}</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">
                      Fonte do Gatilho
                    </h4>
                    <p className="text-sm">{data.triggerSource || "Não informado"}</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">
                      Última Atividade
                    </h4>
                    <p className="text-sm">{formatDateTime(data.lastActivityAt)}</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">
                      Status de Resolução
                    </h4>
                    <p className="text-sm">{data.resolutionStatus || "Não informado"}</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">
                      Tipo de Conclusão
                    </h4>
                    <p className="text-sm">{data.completionType || "Não informado"}</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">
                      Razão da Conclusão
                    </h4>
                    <p className="text-sm">{data.completionReason || "Não informado"}</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">
                      Concluído em
                    </h4>
                    <p className="text-sm">{formatDateTime(data.completedAt)}</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">
                      Concluído por
                    </h4>
                    <p className="text-sm">{data.completedBy || "Não informado"}</p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {!isExpanded && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Última atividade: {formatDateTime(data.lastActivityAt)}</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-sm">Score: {data.score}/100</span>
              <span className="text-sm text-muted-foreground">•</span>
              <span className="text-sm">Funil: {data.funnelScore}/100</span>
              <span className="text-sm text-muted-foreground">•</span>
              <span className="text-sm">Progresso: {data.lifecycleProgressPercent}%</span>
            </div>
          </div>
        )}

        {isExpanded && (
          <div className="mt-6 pt-4 border-t">
            <h3 className="font-semibold mb-3">Mensagens da Conversa</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {messages.map((message, index) => {
                const role = getRoleFromSender(message.sender);
                return (
                  <div
                    key={index}
                    className={cn(
                      "flex",
                      role === "agent" ? "justify-end" : "justify-start"
                    )}
                  >
                    <ChatMessageBubble
                      role={role}
                      time={format(
                        new Date(message.timestamp),
                        "HH:mm",
                        { locale: ptBR }
                      )}
                      name={getMessageDisplayName(message.sender)}
                      message={message.text}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ConversationSummary;