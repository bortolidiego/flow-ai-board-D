import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export interface Card {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  assignee?: string;
  aiSuggested?: boolean;
  createdAt: string;
  columnId: string;
  chatwootContactName?: string;
  chatwootConversationId?: string;
  chatwootUrl?: string;
  chatwootAccountId?: string;
  inboxName?: string;
  funnelScore?: number;
  serviceQualityScore?: number;
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
}

export interface Column {
  id: string;
  name: string;
  position: number;
  cards: Card[];
}

export interface PipelineConfig {
  customFields: any[];
  funnelTypes: any[];
  aiConfig?: any;
}

export function useKanbanData(pipelineId?: string) {
  const { workspace } = useWorkspace();
  const [columns, setColumns] = useState<Column[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [pipeline, setPipeline] = useState<any>(null);
  const [pipelineConfig, setPipelineConfig] = useState<PipelineConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const currentPipelineId = pipelineId || workspace?.id;

  useEffect(() => {
    if (currentPipelineId) {
      loadData();
    }
  }, [currentPipelineId]);

  const loadData = async () => {
    if (!currentPipelineId) return;

    setLoading(true);
    try {
      // Load columns
      const { data: columnsData, error: columnsError } = await supabase
        .from('columns')
        .select('*')
        .eq('pipeline_id', currentPipelineId)
        .order('position');

      if (columnsError) throw columnsError;

      // Load cards for each column
      const columnsWithCards = await Promise.all(
        (columnsData || []).map(async (column) => {
          const { data: cardsData, error: cardsError } = await supabase
            .from('cards')
            .select('*')
            .eq('column_id', column.id)
            .order('position');

          if (cardsError) throw cardsError;

          // Transform card data to match Card interface
          const transformedCards: Card[] = (cardsData || []).map(card => ({
            id: card.id,
            title: card.title,
            description: card.description,
            priority: (card.priority as 'low' | 'medium' | 'high') || 'medium',
            assignee: card.assignee,
            aiSuggested: card.ai_suggested,
            createdAt: card.created_at,
            columnId: card.column_id,
            chatwootContactName: card.chatwoot_contact_name,
            chatwootConversationId: card.chatwoot_conversation_id,
            chatwootUrl: (card as any).chatwoot_url,
            chatwootAccountId: (card as any).chatwoot_account_id,
            inboxName: card.inbox_name,
            funnelScore: card.funnel_score,
            serviceQualityScore: card.service_quality_score,
            value: card.value,
            productItem: card.product_item,
            subject: card.subject,
            funnelType: card.funnel_type,
            conversationStatus: card.conversation_status as 'open' | 'closed',
            winConfirmation: card.win_confirmation,
            lossReason: card.loss_reason,
            customFieldsData: card.custom_fields_data as Record<string, any>,
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
          }));

          return {
            ...column,
            cards: transformedCards
          };
        })
      );

      // Load pipeline config
      const { data: customFields } = await supabase
        .from('pipeline_custom_fields')
        .select('*')
        .eq('pipeline_id', currentPipelineId)
        .order('position');

      const { data: funnelTypes } = await supabase
        .from('funnel_config')
        .select('*')
        .eq('pipeline_id', currentPipelineId)
        .order('position');

      const { data: aiConfig } = await supabase
        .from('pipeline_ai_config')
        .select('*')
        .eq('pipeline_id', currentPipelineId)
        .maybeSingle();

      const config: PipelineConfig = {
        customFields: customFields || [],
        funnelTypes: funnelTypes || [],
        aiConfig: aiConfig || undefined,
      };

      // Flatten all cards
      const allCards = columnsWithCards.flatMap(col => col.cards);

      setColumns(columnsWithCards);
      setCards(allCards);
      setPipeline({ id: currentPipelineId });
      setPipelineConfig(config);
    } catch (error) {
      console.error('Error loading kanban data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateCardColumn = async (cardId: string, newColumnId: string) => {
    try {
      const { error } = await supabase
        .from('cards')
        .update({ column_id: newColumnId })
        .eq('id', cardId);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error updating card column:', error);
    }
  };

  const deleteCards = async (cardIds: string[]) => {
    try {
      const { error } = await supabase
        .from('cards')
        .delete()
        .in('id', cardIds);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error deleting cards:', error);
    }
  };

  const bulkUpdateCardColumn = async (cardIds: string[], newColumnId: string) => {
    try {
      const { error } = await supabase
        .from('cards')
        .update({ column_id: newColumnId })
        .in('id', cardIds);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error bulk updating cards:', error);
    }
  };

  return {
    columns,
    cards,
    pipeline,
    pipelineConfig,
    loading,
    updateCardColumn,
    deleteCards,
    bulkUpdateCardColumn,
    refetch: loadData,
    fetchPipeline: loadData,
    refreshCards: loadData,
  };
}