import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/hooks/useKanbanData';
import { useChatwootContext } from '@/hooks/useChatwootContext';
import { useWorkspace } from '@/hooks/useWorkspace';

export const useConversationCard = () => {
    const {
        conversationId,
        contactId,
        contactEmail,
        contactPhone,
        contactName,
        isChatwootFrame,
        requestConversationUpdate
    } = useChatwootContext();

    const { workspace } = useWorkspace();
    const { toast } = useToast();

    const [card, setCard] = useState<Card | null>(null);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);

    // Buscar card quando o contexto do Chatwoot mudar
    const fetchCard = useCallback(async () => {
        console.log('🔄 fetchCard called. Context:', {
            isChatwootFrame,
            conversationId,
            contactId,
            workspaceId: workspace?.id
        });

        if (!isChatwootFrame) {
            console.log('⚠️ fetchCard: Not in Chatwoot frame');
            return;
        }

        // Se não tiver IDs, não dá pra buscar
        if (!conversationId && !contactId && !contactEmail && !contactPhone) {
            console.log('⚠️ fetchCard: No context IDs available');
            return;
        }

        setLoading(true);
        try {
            // Se não tiver workspace, não buscar
            if (!workspace?.id) {
                console.log('⚠️ fetchCard: Workspace ID missing', workspace);
                setCard(null);
                setLoading(false);
                return;
            }

            console.log('🔍 fetchCard: Searching with', {
                workspaceId: workspace.id,
                conversationId,
                contactId
            });

            // Buscar pipeline e colunas do workspace
            const { data: pipelineData } = await supabase
                .from('pipelines')
                .select('id, columns(id)')
                .eq('workspace_id', workspace.id)
                .single();

            if (!pipelineData?.columns || !Array.isArray(pipelineData.columns)) {
                console.log('⚠️ fetchCard: No pipeline or columns found for workspace');
                setCard(null);
                setLoading(false);
                return;
            }

            const columnIds = (pipelineData.columns as any[]).map(c => c.id);
            console.log('🔍 fetchCard: Found column IDs:', columnIds);

            // Prioridade 1: Buscar por Conversation ID
            if (conversationId) {
                const { data, error } = await supabase
                    .from('cards')
                    .select('*')
                    .is('deleted_at', null)
                    .in('column_id', columnIds)
                    .eq('chatwoot_conversation_id', conversationId.toString())
                    .maybeSingle();

                console.log('🔍 Search by ConversationID result:', { data, error });

                if (!error && data) {
                    setCard(formatCardData(data));
                    setLoading(false);
                    return;
                }
            }

            // Prioridade 2: Buscar por Customer Profile ID (Contact ID)
            if (contactId) {
                const { data, error } = await supabase
                    .from('cards')
                    .select('*')
                    .is('deleted_at', null)
                    .in('column_id', columnIds)
                    .eq('customer_profile_id', contactId.toString())
                    .maybeSingle();

                if (!error && data) {
                    setCard(formatCardData(data));
                    setLoading(false);
                    return;
                }
            }

            console.log('⚠️ fetchCard: No card found');
            setCard(null);
        } catch (error) {
            console.error('Error fetching conversation card:', error);
        } finally {
            setLoading(false);
        }
    }, [conversationId, contactId, contactEmail, contactPhone, isChatwootFrame, workspace?.id]);

    useEffect(() => {
        fetchCard();
    }, [fetchCard]);

    // Subscribe to realtime changes for this specific card (if it exists)
    useEffect(() => {
        let channel: any;
        if (card?.id) {
            channel = supabase
                .channel(`card-${card.id}`)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'cards', filter: `id=eq.${card.id}` },
                    (payload) => {
                        if (payload.eventType === 'DELETE') {
                            setCard(null);
                        } else {
                            fetchCard(); // Refetch to get full data
                        }
                    }
                )
                .subscribe();
        }

        return () => {
            if (channel) supabase.removeChannel(channel);
        };
    }, [card?.id, fetchCard]);

    const formatCardData = (data: any): Card => {
        return {
            id: data.id,
            title: data.title,
            description: data.description || '',
            priority: data.priority,
            assignee: data.assignee,
            ai_suggested: data.ai_suggested,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            columnId: data.column_id,
            chatwootContactName: data.chatwoot_contact_name,
            chatwootAgentName: data.chatwoot_agent_name,
            chatwootConversationId: data.chatwoot_conversation_id,
            chatwootUrl: data.chatwoot_url, // Note: might need to fetch from integration
            chatwootAccountId: data.chatwoot_account_id, // Note: might need to fetch from integration
            inboxName: data.inbox_name,
            funnelScore: data.funnel_score,
            serviceQualityScore: data.service_quality_score,
            value: data.value,
            productItem: data.product_item,
            subject: data.subject,
            funnelType: data.funnel_type,
            conversationStatus: data.conversation_status || 'open',
            winConfirmation: data.win_confirmation,
            lossReason: data.loss_reason,
            customFieldsData: data.custom_fields_data || {},
            completionType: data.completion_type,
            completionReason: data.completion_reason,
            completedAt: data.completed_at,
            completedBy: data.completed_by,
            customerProfileId: data.customer_profile_id,
            currentLifecycleStage: data.current_lifecycle_stage,
            lifecycleProgressPercent: data.lifecycle_progress_percent,
            resolutionStatus: data.resolution_status,
            isMonetaryLocked: data.is_monetary_locked,
            lastActivityAt: data.last_activity_at,
            ticketNumber: data.ticket_number,
        };
    };

    const createCard = async (columnId: string, title: string) => {
        if (!workspace) {
            toast({
                title: "Erro ao criar card",
                description: "Workspace não encontrado.",
                variant: "destructive"
            });
            return null;
        }

        setCreating(true);
        try {
            // 1. Buscar pipeline padrão do workspace
            const { data: pipeline, error: pipelineError } = await supabase
                .from('pipelines')
                .select('id')
                .eq('workspace_id', workspace.id)
                .single();

            if (pipelineError || !pipeline) throw new Error('Pipeline não encontrado');

            // 2. Preparar dados do card
            const newCardData = {
                title: title || contactName || contactEmail || 'Novo Lead',
                description: `Card criado via Chatwoot Sidebar.\nConversa #${conversationId}`,
                column_id: columnId,
                workspace_id: workspace.id,
                chatwoot_conversation_id: conversationId?.toString(),
                customer_profile_id: contactId?.toString(),
                chatwoot_contact_name: contactName,
                chatwoot_contact_email: contactEmail,
                // chatwoot_contact_phone: contactPhone, // Se tiver coluna no banco
                priority: 'medium',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };

            // 3. Inserir card
            const { data, error } = await supabase
                .from('cards')
                .insert(newCardData)
                .select()
                .single();

            if (error) throw error;

            // 4. Inserir dados do lead (opcional, mas bom pra consistência)
            if (data) {
                await supabase.from('lead_data').insert({
                    card_id: data.id,
                    full_name: contactName,
                    email: contactEmail,
                    phone: contactPhone,
                    workspace_id: workspace.id
                });
            }

            toast({
                title: "Card criado com sucesso!",
                description: "O card foi vinculado a esta conversa."
            });

            setCard(formatCardData(data));
            return data;

        } catch (error: any) {
            console.error('Erro ao criar card:', error);
            toast({
                title: "Erro ao criar card",
                description: error.message,
                variant: "destructive"
            });
            return null;
        } finally {
            setCreating(false);
        }
    };

    const updateCard = async (updates: Partial<Card>) => {
        if (!card) return;

        try {
            // Mapear campos do frontend para o banco
            const dbUpdates: any = {};
            if (updates.title) dbUpdates.title = updates.title;
            if (updates.description) dbUpdates.description = updates.description;
            if (updates.priority) dbUpdates.priority = updates.priority;
            if (updates.value) dbUpdates.value = updates.value;
            if (updates.customFieldsData) dbUpdates.custom_fields_data = updates.customFieldsData;

            // Adicionar updated_at
            dbUpdates.updated_at = new Date().toISOString();

            const { error } = await supabase
                .from('cards')
                .update(dbUpdates)
                .eq('id', card.id);

            if (error) throw error;

            // Atualizar estado local
            setCard(prev => prev ? { ...prev, ...updates } : null);

            toast({
                title: "Card atualizado",
                description: "As alterações foram salvas."
            });

        } catch (error: any) {
            console.error('Erro ao atualizar card:', error);
            toast({
                title: "Erro ao atualizar",
                description: error.message,
                variant: "destructive"
            });
        }
    };

    return {
        card,
        loading,
        creating,
        createCard,
        updateCard,
        refresh: fetchCard
    };
};
