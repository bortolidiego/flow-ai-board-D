import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Card {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  assignee?: string;
  ai_suggested?: boolean;
  createdAt: string;
  updatedAt?: string;
  columnId: string;
  chatwootContactName?: string;
  chatwootAgentName?: string;
  chatwootConversationId?: string;
  chatwootUrl?: string;
  chatwootAccountId?: string;
  inboxName?: string;
  funnelScore?: number;
  serviceQualityScore?: number;
  aiSuggestions?: string[];
  value?: number;
  productItem?: string;
  subject?: string;
  funnelType?: string;
  conversationStatus?: 'open' | 'closed';
  winConfirmation?: string;
  lossReason?: string;
  customFieldsData?: Record<string, any>;
  completionType?: 'won' | 'lost' | 'completed' | null;
  completionReason?: string | null;
  completedAt?: string | null;
  completedBy?: string | null;
  customerProfileId?: string | null;
  currentLifecycleStage?: string | null;
  lifecycleProgressPercent?: number;
  resolutionStatus?: string | null;
  isMonetaryLocked?: boolean;
  lastActivityAt?: string | null;
  ticketNumber?: number;
}

export interface Column {
  id: string;
  name: string;
  position: number;
}

export interface CustomField {
  id: string;
  field_name: string;
  field_label: string;
  field_type: string;
  field_options?: any;
  is_required: boolean;
  position: number;
}

export interface FunnelType {
  id: string;
  funnel_type: string;
  funnel_name: string;
  color?: string;
  is_monetary?: boolean;
  priority?: number;
  lifecycle_stages?: any[];
  inactivity_days?: number;
}

export interface AIConfig {
  id: string;
  generated_prompt: string;
  custom_prompt?: string;
  use_custom_prompt: boolean;
  model_name: string;
  analyze_on_message: boolean;
  analyze_on_close: boolean;
}

export interface SLAConfig {
  id: string;
  first_response_minutes: number;
  ongoing_response_minutes: number;
  warning_threshold_percent: number;
  sla_strategy: string;
}

export interface PipelineConfig {
  customFields: CustomField[];
  funnelTypes: FunnelType[];
  aiConfig?: AIConfig;
  slaConfig?: SLAConfig;
}

export interface Pipeline {
  id: string;
  columns: Column[];
}

export const useKanbanData = (workspaceId?: string) => {
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [pipelineConfig, setPipelineConfig] = useState<PipelineConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPipeline = async (wsId: string) => {
    const { data, error } = await supabase
      .from('pipelines')
      .select(`
        id,
        workspace_id,
        columns (
          id,
          name,
          position
        )
      `)
      .eq('workspace_id', wsId)
      .single();

    if (error) {
      toast({
        title: 'Erro ao carregar pipeline',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    if (data) {
      const formattedPipeline = {
        id: data.id,
        columns: data.columns.sort((a: any, b: any) => a.position - b.position),
      };
      setPipeline(formattedPipeline);
    }
  };

  const fetchPipelineConfig = async (pipelineId: string) => {
    try {
      const { data: customFieldsData, error: customFieldsError } = await supabase
        .from('pipeline_custom_fields')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .order('position');

      if (customFieldsError) throw customFieldsError;

      const { data: funnelTypesData, error: funnelTypesError } = await supabase
        .from('funnel_config')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .order('position');

      if (funnelTypesError) throw funnelTypesError;

      const { data: aiConfigData, error: aiConfigError } = await supabase
        .from('pipeline_ai_config')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .maybeSingle();

      if (aiConfigError && aiConfigError.code !== 'PGRST116') throw aiConfigError;

      const { data: slaConfigData, error: slaConfigError } = await supabase
        .from('pipeline_sla_config')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .maybeSingle();

      if (slaConfigError && slaConfigError.code !== 'PGRST116') throw slaConfigError;

      const typedFunnelTypes = (funnelTypesData || []).map(d => ({
        ...d,
        lifecycle_stages: (d.lifecycle_stages as any) || []
      })) as FunnelType[];

      setPipelineConfig({
        customFields: customFieldsData || [],
        funnelTypes: typedFunnelTypes,
        aiConfig: aiConfigData || undefined,
        slaConfig: slaConfigData || undefined,
      });
    } catch (error) {
      console.error('Error fetching pipeline config:', error);
      setPipelineConfig(null);
    }
  };

  const fetchCards = async (pipelineId: string) => {
    console.log('🔄 fetchCards called for pipeline:', pipelineId);

    const { data: pipelineData, error: pipelineError } = await supabase
      .from('pipelines')
      .select('columns(id)')
      .eq('id', pipelineId)
      .single();

    if (pipelineError) {
      console.error('❌ Error fetching pipeline:', pipelineError);
      return;
    }

    if (!pipelineData?.columns) {
      console.warn('⚠️ No columns found for pipeline:', pipelineId);
      return;
    }

    const columnIds = (pipelineData.columns as any[]).map(c => c.id);
    console.log('📋 Column IDs:', columnIds);

    const { data: chatwootIntegration } = await supabase
      .from('chatwoot_integrations')
      .select('chatwoot_url, account_id')
      .eq('pipeline_id', pipelineId)
      .maybeSingle();

    const chatwootUrl = chatwootIntegration?.chatwoot_url;
    const chatwootAccountId = chatwootIntegration?.account_id;

    console.log('🔍 Querying cards with column_ids:', columnIds);
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .in('column_id', columnIds)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(5000);

    if (error) {
      console.error('❌ Error fetching cards:', error);
      toast({
        title: 'Erro ao carregar cards',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    console.log(`✅ Fetched ${data?.length || 0} cards`);
    if (data && data.length > 0) {
      console.log('📦 Sample card:', data[0]);
    }

    if (data) {
      const formattedCards = data.map(card => ({
        id: card.id,
        title: card.title,
        description: card.description || '',
        priority: card.priority as 'low' | 'medium' | 'high',
        assignee: card.assignee,
        ai_suggested: card.ai_suggested,
        createdAt: card.created_at,
        updatedAt: card.updated_at,
        columnId: card.column_id,
        chatwootContactName: card.chatwoot_contact_name,
        chatwootAgentName: card.chatwoot_agent_name,
        chatwootConversationId: card.chatwoot_conversation_id,
        chatwootUrl: chatwootUrl,
        chatwootAccountId: chatwootAccountId,
        inboxName: card.inbox_name,
        funnelScore: card.funnel_score,
        serviceQualityScore: card.service_quality_score,
        aiSuggestions: (card.ai_suggestions as string[]) || [],
        value: card.value,
        productItem: card.product_item,
        subject: card.subject,
        funnelType: card.funnel_type,
        conversationStatus: (card.conversation_status || 'open') as 'open' | 'closed',
        winConfirmation: card.win_confirmation,
        lossReason: card.loss_reason,
        customFieldsData: (card.custom_fields_data as Record<string, any>) || {},
        completionType: card.completion_type as 'won' | 'lost' | 'completed' | null,
        completionReason: card.completion_reason,
        completedAt: card.completed_at,
        completedBy: card.completed_by,
        customerProfileId: card.customer_profile_id,
        currentLifecycleStage: card.current_lifecycle_stage,
        lifecycleProgressPercent: card.lifecycle_progress_percent,
        resolutionStatus: card.resolution_status,
        isMonetaryLocked: card.is_monetary_locked,
        lastActivityAt: card.last_activity_at,
        ticketNumber: (card as any).ticket_number,
      }));
      console.log(`🎯 Setting ${formattedCards.length} formatted cards to state`);
      setCards(formattedCards);
    }
  };

  const updateCardColumn = async (cardId: string, newColumnId: string) => {
    const { error } = await supabase
      .from('cards')
      .update({
        column_id: newColumnId,
        updated_at: new Date().toISOString()
      })
      .eq('id', cardId);

    if (error) {
      toast({
        title: 'Erro ao mover card',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const deleteCards = async (cardIds: string[]) => {
    const { error } = await supabase.rpc('delete_cards_bulk', {
      card_ids: cardIds
    });

    if (error) {
      toast({
        title: 'Erro ao excluir cards',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const restoreCards = async (cardIds: string[]) => {
    const { error } = await supabase.rpc('restore_cards_bulk', {
      card_ids: cardIds
    });

    if (error) {
      toast({
        title: 'Erro ao restaurar cards',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const bulkUpdateCardColumn = async (cardIds: string[], newColumnId: string) => {
    const { error } = await supabase.rpc('update_cards_column_bulk', {
      card_ids: cardIds,
      new_column_id: newColumnId
    });

    if (error) {
      toast({
        title: 'Erro ao transferir cards',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Cards transferidos',
      description: `${cardIds.length} ${cardIds.length === 1 ? 'card transferido' : 'cards transferidos'} com sucesso.`,
    });

    return true;
  };

  useEffect(() => {
    const init = async () => {
      if (!workspaceId) return;

      setLoading(true);
      await fetchPipeline(workspaceId);
      setLoading(false);
    };
    init();
  }, [workspaceId]);

  useEffect(() => {
    if (!pipeline?.id) return;

    const channel = supabase
      .channel('kanban-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cards' },
        (payload) => {
          console.log('Realtime update received:', payload);
          fetchCards(pipeline.id);
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pipeline?.id]);

  useEffect(() => {
    if (pipeline) {
      fetchCards(pipeline.id);
      fetchPipelineConfig(pipeline.id);
    }
  }, [pipeline]);

  return {
    pipeline,
    cards,
    pipelineConfig,
    loading,
    updateCardColumn,
    deleteCards,
    restoreCards,
    bulkUpdateCardColumn,
    refreshCards: () => pipeline && fetchCards(pipeline.id),
    fetchPipeline: () => workspaceId && fetchPipeline(workspaceId),
  };
};