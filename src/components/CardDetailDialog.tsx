"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, MessageSquare, Edit3, Save, X, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import ConversationSummary from "./ConversationSummary";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "react-hot-toast";

interface KanbanCard {
  id: string;
  title: string;
  description?: string;
  priority?: string;
  assignee?: string;
  column_id: string;
  position: number;
  created_at: string;
  updated_at: string;
  funnel_score?: number;
  service_quality_score?: number;
  lifecycle_progress_percent?: number;
  value?: number;
  conversation_status?: string;
  subject?: string;
  product_item?: string;
  chatwoot_contact_name?: string;
  chatwoot_contact_email?: string;
  chatwoot_agent_name?: string;
}

interface CardDetailDialogProps {
  card: KanbanCard | null;
  onCardUpdate?: (card: KanbanCard | null) => void;
}

export default function CardDetailDialog({ card, onCardUpdate }: CardDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(card?.title || "");
  const [description, setDescription] = useState(card?.description || "");
  const [isSaving, setIsSaving] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);

  const handleSave = async () => {
    if (!card) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("cards")
        .update({
          title,
          description,
          updated_at: new Date().toISOString(),
        })
        .eq("id", card.id);

      if (error) throw error;

      toast.success("Card atualizado com sucesso!");
      setIsEditing(false);
      onCardUpdate?.(null);
    } catch (error: any) {
      toast.error(`Erro ao salvar: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const formatDateTime = (dateString: string | null): string => {
    if (!dateString) return "Não disponível";
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", {
        locale: ptBR,
      });
    } catch {
      return "Data inválida";
    }
  };

  const getStatusColor = (status: string | null): string => {
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

  const loadAnalysisData = async () => {
    if (!card?.id) return;
    
    try {
      const { data, error } = await supabase
        .from("card_analysis_history")
        .select("*")
        .eq("card_id", card.id)
        .order("analyzed_at", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error("Erro ao carregar dados da análise:", error);
        return;
      }

      setAnalysisData(data);
    } catch (error) {
      console.error("Erro ao carregar análise:", error);
    }
  };

  const loadMessages = async () => {
    if (!card?.id) return;
    
    try {
      const { data, error } = await supabase
        .from("lead_data")
        .select("name, email, phone, notes, updated_at")
        .eq("card_id", card.id)
        .single();

      if (error) {
        console.error("Erro ao carregar mensagens:", error);
        return;
      }

      // Convert lead_data to Message format
      const messageData = data?.notes ? [{
        timestamp: data.updated_at || new Date().toISOString(),
        sender: card?.chatwoot_contact_name || "Cliente",
        text: data.notes
      }] : [];

      setMessages(messageData);
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error);
    }
  };

  // Load data when dialog opens
  React.useEffect(() => {
    if (card?.id) {
      loadAnalysisData();
      loadMessages();
    }
  }, [card?.id]);

  if (!card) return null;

  // Convert analysis data to ConversationData format
  const conversationData = {
    summary: analysisData?.summary || "Análise não disponível",
    winConfirmation: analysisData?.win_confirmation || null,
    lossReason: analysisData?.loss_reason || null,
    suggestions: analysisData?.suggestions || [],
    successRate: analysisData?.success_rate || 0,
    score: analysisData?.score || 0,
    funnelScore: analysisData?.funnel_score || 0,
    lifecycleProgressPercent: analysisData?.lifecycle_progress_percent || 0,
    lifecycleStageAtAnalysis: analysisData?.lifecycle_stage_at_analysis || "",
    serviceQualityScore: analysisData?.service_quality_score || 0,
    subject: analysisData?.subject || card?.subject || null,
    value: analysisData?.value || card?.value || null,
    productItem: analysisData?.product_item || card?.product_item || null,
    conversationLength: analysisData?.conversation_length || 0,
    conversationStatus: analysisData?.conversation_status || card?.conversation_status || null,
    conversationSummary: analysisData?.conversation_summary || null,
    modelUsed: analysisData?.model_used || null,
    modelName: analysisData?.model_name || null,
    triggerSource: analysisData?.trigger_source || null,
    lastActivityAt: analysisData?.last_analyzed_at || card?.updated_at || null,
    resolutionStatus: analysisData?.resolution_status || null,
    completionType: analysisData?.completion_type || null,
    completionReason: analysisData?.completion_reason || null,
    completedAt: analysisData?.completed_at || null,
    completedBy: analysisData?.completed_by || null,
    isMonetaryLocked: analysisData?.is_monetary_locked || null,
    currentLifecycleStage: analysisData?.current_lifecycle_stage || null,
    customerProfileId: analysisData?.customer_profile_id || null,
  };

  return (
    <Dialog open={!!card} onOpenChange={() => onCardUpdate?.(null)}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              Detalhes do Card
            </DialogTitle>
            <div className="flex items-center gap-2">
              {!isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit3 className="w-4 h-4 mr-1" />
                  Editar
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    <Save className="w-4 h-4 mr-1" />
                    {isSaving ? "Salvando..." : "Salvar"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false);
                      setTitle(card?.title || "");
                      setDescription(card?.description || "");
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="p-6 pt-4 space-y-6">
            {/* Card Header */}
            <div className="space-y-2">
              {isEditing ? (
                <div className="space-y-2">
                  <div>
                    <Label htmlFor="title">Título</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Digite o título do card"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Digite a descrição do card"
                      rows={4}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold">{card?.title}</h2>
                  <p className="text-muted-foreground">
                    {card?.description || "Sem descrição"}
                  </p>
                </>
              )}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {card?.priority && (
                <Badge variant="outline">
                  Prioridade: {card.priority}
                </Badge>
              )}
              {card?.assignee && (
                <Badge variant="outline">
                  Responsável: {card.assignee}
                </Badge>
              )}
              {card?.conversation_status && (
                <Badge className={getStatusColor(card.conversation_status)}>
                  {card.conversation_status}
                </Badge>
              )}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="w-4 h-4" />
                <span>Criado: {formatDateTime(card?.created_at)}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="w-4 h-4" />
                <span>Atualizado: {formatDateTime(card?.updated_at)}</span>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {card?.funnel_score && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-lg font-semibold text-primary">
                    {card.funnel_score}
                  </div>
                  <div className="text-xs text-muted-foreground">Score Funil</div>
                </div>
              )}
              {card?.service_quality_score && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-lg font-semibold text-blue-600">
                    {card.service_quality_score}
                  </div>
                  <div className="text-xs text-muted-foreground">Qualidade Serviço</div>
                </div>
              )}
              {card?.lifecycle_progress_percent && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-lg font-semibold text-green-600">
                    {card.lifecycle_progress_percent}%
                  </div>
                  <div className="text-xs text-muted-foreground">Progresso</div>
                </div>
              )}
              {card?.value && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-lg font-semibold text-amber-600">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(card.value)}
                  </div>
                  <div className="text-xs text-muted-foreground">Valor</div>
                </div>
              )}
            </div>

            {/* Conversation Summary */}
            <div className="mt-6">
              <ConversationSummary
                data={conversationData}
                messages={messages}
              />
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}