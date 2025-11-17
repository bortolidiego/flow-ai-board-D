import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/types/supabase"; // Assuming Json type is available

export interface Column {
  id: string;
  name: string;
  position: number;
}

export interface Card {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  assignee?: string;
  aiSuggested?: boolean;
  createdAt: string;
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
  customFieldsData?: Record<string, any> | null; // Corrigido: Permitir null ou Record<string, any>
  completionType?: string | null;
  completionReason?: string | null;
  completedAt?: string | null;
  completedBy?: string | null;
  customerProfileId?: string | null;
  currentLifecycleStage?: string | null;
  lifecycleProgressPercent?: number;
  resolutionStatus?: string | null;
  isMonetaryLocked?: boolean;
  lastActivityAt?: string | null;
  columnId?: string;
  position?: number;
}

export interface Pipeline {
  id: string;
  workspace_id: string;
  columns: Column[];
}

export interface PipelineConfig {
  customFields: any[];
  funnelTypes?: any[];
  aiConfig?: any;
}

/**
 * Busca o pipeline principal e suas colunas para um dado workspace.
 */
export async function fetchPipeline(workspaceId: string): Promise<Pipeline | null> {
  console.log(`[Kanban Lib] Fetching pipeline for workspace: ${workspaceId}`);
  
  // 1. Buscar a pipeline principal (assumindo que há apenas uma por workspace por enquanto)
  const { data: pipelineData, error: pipelineError } = await supabase
    .from('pipelines')
    .select('id, workspace_id')
    .eq('workspace_id', workspaceId)
    .limit(1)
    .maybeSingle();

  if (pipelineError) {
    console.error('[Kanban Lib] Error fetching pipeline:', pipelineError);
    throw pipelineError;
  }

  if (!pipelineData) {
    console.log('[Kanban Lib] No pipeline found.');
    return null;
  }

  // 2. Buscar as colunas da pipeline
  const { data: columnsData, error: columnsError } = await supabase
    .from('columns')
    .select('*')
    .eq('pipeline_id', pipelineData.id)
    .order('position', { ascending: true });

  if (columnsError) {
    console.error('[Kanban Lib] Error fetching columns:', columnsError);
    throw columnsError;
  }

  const columns: Column[] = (columnsData || []).map(col => ({
    id: col.id,
    name: col.name,
    position: col.position,
  }));

  return {
    id: pipelineData.id,
    workspace_id: pipelineData.workspace_id,
    columns,
  };
}

/**
 * Busca todos os cards para um dado pipeline.
 */
export async function fetchCards(pipelineId: string): Promise<Card[]> {
  console.log(`[Kanban Lib] Fetching cards for pipeline: ${pipelineId}`);
  
  // Buscar todas as colunas para filtrar os cards
  const { data: columnsData, error: columnsError } = await supabase
    .from('columns')
    .select('id')
    .eq('pipeline_id', pipelineId);

  if (columnsError) {
    console.error('[Kanban Lib] Error fetching column IDs for cards:', columnsError);
    throw columnsError;
  }

  const columnIds = (columnsData || []).map(col => col.id);

  if (columnIds.length === 0) {
    console.log('[Kanban Lib] No columns found, returning empty cards array.');
    return [];
  }

  const { data: cardsData, error: cardsError } = await supabase
    .from('cards')
    .select('*')
    .in('column_id', columnIds)
    .order('position', { ascending: true });

  if (cardsError) {
    console.error('[Kanban Lib] Error fetching cards:', cardsError);
    throw cardsError;
  }

  // Mapear dados para o formato Card
  const cards: Card[] = (cardsData || []).map(card => ({
    id: card.id,
    title: card.title,
    description: card.description,
    priority: card.priority as 'low' | 'medium' | 'high',
    assignee: card.assignee || undefined,
    aiSuggested: card.ai_suggested || undefined,
    createdAt: card.created_at,
    chatwootContactName: card.chatwoot_contact_name || undefined,
    chatwootConversationId: card.chatwoot_conversation_id || undefined,
    chatwootUrl: (card as any).chatwoot_url || undefined, // Corrigido Erro 2
    chatwootAccountId: (card as any).chatwoot_account_id || undefined, // Corrigido Erro 3
    inboxName: card.inbox_name || undefined,
    funnelScore: card.funnel_score || undefined,
    serviceQualityScore: card.service_quality_score || undefined,
    value: card.value || undefined,
    productItem: card.product_item || undefined,
    subject: card.subject || undefined,
    funnelType: card.funnel_type || undefined,
    conversationStatus: card.conversation_status as 'open' | 'closed' || undefined,
    winConfirmation: card.win_confirmation || undefined,
    lossReason: card.loss_reason || undefined,
    customFieldsData: (card.custom_fields_data || {}) as Record<string, any>, // Corrigido Erro 1
    completionType: card.completion_type || undefined,
    completionReason: card.completion_reason || undefined,
    completedAt: card.completed_at || undefined,
    completedBy: card.completed_by || undefined,
    customerProfileId: card.customer_profile_id || undefined,
    currentLifecycleStage: card.current_lifecycle_stage || undefined,
    lifecycleProgressPercent: card.lifecycle_progress_percent || undefined,
    resolutionStatus: card.resolution_status || undefined,
    isMonetaryLocked: card.is_monetary_locked || undefined,
    lastActivityAt: card.last_activity_at || undefined,
    columnId: card.column_id || undefined,
    position: card.position || undefined,
  }));

  return cards;
}

/**
 * Busca as configurações adicionais da pipeline (AI, Funis, Campos Customizados).
 */
export async function fetchPipelineConfig(pipelineId: string): Promise<PipelineConfig> {
  console.log(`[Kanban Lib] Fetching pipeline config for: ${pipelineId}`);
  
  const [
    customFieldsResult,
    funnelConfigResult,
    aiConfigResult,
  ] = await Promise.all([
    supabase.from('pipeline_custom_fields').select('*').eq('pipeline_id', pipelineId).order('position'),
    supabase.from('funnel_config').select('*').eq('pipeline_id', pipelineId).order('position'),
    supabase.from('pipeline_ai_config').select('*').eq('pipeline_id', pipelineId).maybeSingle(),
  ]);

  if (customFieldsResult.error) console.error('[Kanban Lib] Error fetching custom fields:', customFieldsResult.error);
  if (funnelConfigResult.error) console.error('[Kanban Lib] Error fetching funnel config:', funnelConfigResult.error);
  if (aiConfigResult.error) console.error('[Kanban Lib] Error fetching AI config:', aiConfigResult.error);

  return {
    customFields: customFieldsResult.data || [],
    funnelTypes: funnelConfigResult.data || [],
    aiConfig: aiConfigResult.data,
  };
}