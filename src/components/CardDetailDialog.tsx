import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ConversationSummary } from './ConversationSummary';
import { DynamicLeadDataForm } from './DynamicLeadDataForm';
import { FunnelMeter } from './FunnelMeter';
import { ServiceQualityMeter } from './ServiceQualityMeter';
import { CardAnalysisTimeline } from './CardAnalysisTimeline';
import { LifecycleProgressCard } from './LifecycleProgressCard';
import { FunnelFieldsCard } from './FunnelFieldsCard';
import { SendWhatsAppMessageDialog } from './SendWhatsAppMessageDialog';
import { MessageCircle } from 'lucide-react';

interface PipelineConfig {
  customFields: any[];
  funnelTypes: any[];
  aiConfig?: any;
}

interface CardDetailDialogProps {
  cardId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelineConfig?: PipelineConfig | null;
}

export const CardDetailDialog = ({ cardId, open, onOpenChange, pipelineConfig }: CardDetailDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [card, setCard] = useState<any>(null);
  const [leadData, setLeadData] = useState<any>(null);
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && cardId) {
      fetchCardDetails();
    }
  }, [open, cardId]);

  const fetchCardDetails = async () => {
    if (!cardId) return;

    setLoading(true);
    try {
      // Buscar dados do card
      const { data: cardData, error: cardError } = await supabase
        .from('cards')
        .select('*')
        .eq('id', cardId)
        .single();

      if (cardError) throw cardError;

      // Buscar dados do lead
      const { data: leadDataResult, error: leadError } = await supabase
        .from('lead_data')
        .select('*')
        .eq('card_id', cardId)
        .maybeSingle();

      if (leadError && leadError.code !== 'PGRST116') throw leadError;

      // Buscar configuração do funil para exibir ciclo de vida
      let funnelConfig = null;
      if (cardData.funnel_type && pipelineConfig?.funnelTypes) {
        funnelConfig = pipelineConfig.funnelTypes.find(
          (ft: any) => ft.funnel_type === cardData.funnel_type
        );
      }

      setCard({ ...cardData, funnelConfig });
      setLeadData(leadDataResult);
    } catch (error) {
      console.error('Error fetching card details:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os detalhes do card',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!cardId) return;

    setAnalyzing(true);
    try {
      const { error } = await supabase.functions.invoke('analyze-conversation', {
        body: { cardId },
      });

      if (error) throw error;

      toast({
        title: 'Análise concluída',
        description: 'A conversa foi analisada com sucesso',
      });

      // Recarregar dados
      await fetchCardDetails();
    } catch (error) {
      console.error('Error analyzing conversation:', error);
      toast({
        title: 'Erro na análise',
        description: 'Não foi possível analisar a conversa',
        variant: 'destructive',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleLeadDataUpdate = async (data: { leadData: any; customFieldsData: Record<string, any> }) => {
    if (!cardId) return;

    try {
      // Atualizar lead_data (campos padrão)
      const { data: existing } = await supabase
        .from('lead_data')
        .select('id')
        .eq('card_id', cardId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('lead_data')
          .update(data.leadData)
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('lead_data')
          .insert({ card_id: cardId, ...data.leadData });

        if (error) throw error;
      }

      // Atualizar custom_fields_data no card
      const { error: cardError } = await supabase
        .from('cards')
        .update({ custom_fields_data: data.customFieldsData })
        .eq('id', cardId);

      if (cardError) throw cardError;

      toast({
        title: 'Dados atualizados',
        description: 'As informações do lead foram salvas',
      });

      await fetchCardDetails();
    } catch (error) {
      console.error('Error updating lead data:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar os dados',
        variant: 'destructive',
      });
    }
  };

  const handleStageChange = async (newStage: string) => {
    if (!cardId || !card?.funnelConfig) return;

    try {
      const stageConfig = card.funnelConfig.lifecycle_stages?.find(
        (s: any) => s.stage_name === newStage
      );

      if (!stageConfig) return;

      const updateData: any = {
        current_lifecycle_stage: stageConfig.stage_name,
        lifecycle_progress_percent: stageConfig.progress_percent,
        updated_at: new Date().toISOString()
      };

      // Se estágio terminal, definir resolution_status
      if (stageConfig.is_terminal && stageConfig.resolution_status) {
        updateData.resolution_status = stageConfig.resolution_status;
      }

      const { error } = await supabase
        .from('cards')
        .update(updateData)
        .eq('id', cardId);

      if (error) throw error;

      toast({
        title: 'Etapa atualizada',
        description: `Card movido para "${newStage}"`,
      });

      await fetchCardDetails();
    } catch (error) {
      console.error('Error updating stage:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a etapa',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Carregando...</DialogTitle>
            <DialogDescription>Buscando detalhes do card</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">
              {card?.chatwoot_contact_name || card?.title || 'Card Details'}
            </DialogTitle>
            <div className="flex gap-2">
              {card?.whatsapp_instance_id && (
                <Button
                  onClick={() => setShowWhatsAppDialog(true)}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </Button>
              )}
              <Button
                onClick={handleAnalyze}
                disabled={analyzing}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                {analyzing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {analyzing ? 'Analisando...' : 'Analisar com IA'}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Informações do Card */}
          {(card?.subject || card?.product_item || card?.value || card?.conversation_status) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
              {card?.chatwoot_agent_name && (
                <div>
                  <p className="text-sm text-muted-foreground">Atendente</p>
                  <p className="font-medium">{card.chatwoot_agent_name}</p>
                </div>
              )}
              {card?.subject && (
                <div>
                  <p className="text-sm text-muted-foreground">Assunto</p>
                  <p className="font-medium">{card.subject}</p>
                </div>
              )}
              {card?.product_item && (
                <div>
                  <p className="text-sm text-muted-foreground">Produto/Serviço</p>
                  <p className="font-medium">{card.product_item}</p>
                </div>
              )}
              {card?.value && (
                <div>
                  <p className="text-sm text-muted-foreground">Valor do Negócio</p>
                  <p className="font-medium text-primary text-lg">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(card.value)}
                  </p>
                </div>
              )}
              {card?.conversation_status && (
                <div>
                  <p className="text-sm text-muted-foreground">Status da Conversa</p>
                  <Badge variant={card.conversation_status === 'closed' ? 'default' : 'outline'}>
                    {card.conversation_status === 'closed' ? 'Fechada' : 'Aberta'}
                  </Badge>
                </div>
              )}
            </div>
          )}

          {/* Status de Finalização */}
          {(card?.win_confirmation || card?.loss_reason) && (
            <div className="p-4 bg-muted/30 rounded-lg border-2 border-border/30">
              {card?.win_confirmation ? (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <p className="text-sm font-semibold text-green-600">Negócio Ganho</p>
                  </div>
                  <p className="text-sm text-foreground">{card.win_confirmation}</p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <p className="text-sm font-semibold text-red-600">Negócio Perdido</p>
                  </div>
                  <p className="text-sm text-foreground">{card.loss_reason}</p>
                </div>
              )}
            </div>
          )}

          {/* Resumo da Conversa */}
          <ConversationSummary
            summary={card?.conversation_summary}
            description={card?.description}
          />

          {/* Ciclo de Vida */}
          {card?.funnelConfig?.lifecycle_stages && (
            <div className="space-y-2">
              {card.is_monetary_locked && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
                  <Lock className="h-4 w-4 text-red-600" />
                  <p className="text-sm text-red-600 dark:text-red-400">
                    <strong>Funil Monetário Travado</strong> - Este card mudou de um funil monetário
                    para não-monetário e foi travado para preservar o valor.
                  </p>
                </div>
              )}

              <LifecycleProgressCard
                funnelConfig={card.funnelConfig}
                currentStage={card.current_lifecycle_stage}
                progressPercent={card.lifecycle_progress_percent}
                isLocked={card.is_monetary_locked || false}
                onStageChange={handleStageChange}
              />

              {card?.funnelConfig && (
                <FunnelFieldsCard
                  funnelType={card.funnel_type}
                  funnelName={card.funnelConfig.funnel_name}
                  color={card.funnelConfig.color}
                  isMonetary={card.funnelConfig.is_monetary || false}
                  priority={card.funnelConfig.priority || 'medium'}
                />
              )}
            </div>
          )}

          {/* Medidores (Funil e Qualidade) - apenas se AI config existir */}
          {pipelineConfig?.aiConfig && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FunnelMeter
                score={card?.funnel_score}
                type={card?.funnel_type}
              />
              <ServiceQualityMeter
                score={card?.service_quality_score}
                suggestions={card?.ai_suggestions || []}
              />
            </div>
          )}

          {/* Timeline de Análises */}
          {cardId && <CardAnalysisTimeline cardId={cardId} />}

          {/* Dados do Lead */}
          <DynamicLeadDataForm
            customFields={pipelineConfig?.customFields || []}
            customFieldsData={card?.custom_fields_data || {}}
            leadData={leadData}
            onUpdate={handleLeadDataUpdate}
          />
        </div>

        {card?.whatsapp_instance_id && card?.whatsapp_chat_id && (
          <SendWhatsAppMessageDialog
            open={showWhatsAppDialog}
            onClose={() => setShowWhatsAppDialog(false)}
            instanceId={card.whatsapp_instance_id}
            chatId={card.whatsapp_chat_id}
            contactName={card.whatsapp_contact_name}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};