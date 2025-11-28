import { useEffect, useState } from 'react';
import { useConversationCard } from '@/hooks/useConversationCard';
import { ChatwootSidebarCreateCard } from '@/components/ChatwootSidebarCreateCard';
import { CardDetailContent } from '@/components/CardDetailContent';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/hooks/useWorkspace';

const ChatwootSidebar = () => {
    console.log('🎯 ChatwootSidebar: Componente renderizado!');

    const {
        card,
        loading,
        creating,
        createCard,
        refresh
    } = useConversationCard();

    const { workspace } = useWorkspace();
    const [pipelineConfig, setPipelineConfig] = useState<any>(null);

    console.log('🎯 ChatwootSidebar: Estado atual:', { card, loading, creating });

    // Tentar atualizar quando montar
    useEffect(() => {
        console.log('🎯 ChatwootSidebar: useEffect executado, chamando refresh()');
        refresh();
    }, []);

    // Buscar configuração do pipeline
    useEffect(() => {
        const fetchPipelineConfig = async () => {
            try {
                let pipelineId: string | null = null;

                // 1. Tentar pelo Workspace (se já estiver carregado)
                if (workspace?.id) {
                    const { data: pipeline } = await supabase
                        .from('pipelines')
                        .select('id')
                        .eq('workspace_id', workspace.id)
                        .maybeSingle();
                    if (pipeline) pipelineId = pipeline.id;
                }

                // 2. Se não tiver workspace ainda, mas tiver card, tentar pelo card (Fast Path)
                if (!pipelineId && card?.columnId) {
                    const { data: column } = await supabase
                        .from('columns')
                        .select('pipeline_id')
                        .eq('id', card.columnId)
                        .maybeSingle();
                    if (column) pipelineId = column.pipeline_id;
                }

                if (!pipelineId) return;

                // 3. Buscar configurações em paralelo
                const [
                    { data: customFields },
                    { data: funnelTypes },
                    { data: aiConfig },
                    { data: slaConfig }
                ] = await Promise.all([
                    supabase.from('pipeline_custom_fields').select('*').eq('pipeline_id', pipelineId).order('position'),
                    supabase.from('funnel_config').select('*').eq('pipeline_id', pipelineId).order('position'),
                    supabase.from('pipeline_ai_config').select('*').eq('pipeline_id', pipelineId).maybeSingle(),
                    supabase.from('pipeline_sla_config').select('*').eq('pipeline_id', pipelineId).maybeSingle()
                ]);

                setPipelineConfig({
                    customFields: customFields || [],
                    funnelTypes: funnelTypes || [],
                    aiConfig: aiConfig || undefined,
                    slaConfig: slaConfig || undefined
                });

                console.log('✅ Pipeline config loaded for pipeline:', pipelineId);

            } catch (error) {
                console.error('Error fetching pipeline config:', error);
            }
        };

        fetchPipelineConfig();
    }, [workspace?.id, card?.columnId]);

    if (loading) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-background p-4 space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Buscando informações...</p>
            </div>
        );
    }

    return (
        <div className="h-screen w-full bg-background flex flex-col overflow-hidden">
            <div className="flex-1 overflow-hidden">
                <style>{`
                    .sidebar-trigger, 
                    button:has(svg.lucide-users),
                    button:has(svg.lucide-user-plus) {
                        display: none !important;
                    }
                `}</style>
                {card ? (
                    <CardDetailContent
                        cardId={card.id}
                        initialCardData={card}
                        pipelineConfig={pipelineConfig}
                        showHistory={false}
                        hideHeader={true}
                    />
                ) : (
                    <div className="h-full flex flex-col justify-center space-y-6 p-4">
                        <div className="text-center space-y-2">
                            <h2 className="text-xl font-semibold tracking-tight">Flow AI Board</h2>
                            <p className="text-sm text-muted-foreground">
                                Nenhum card vinculado a esta conversa.
                            </p>
                        </div>

                        <ChatwootSidebarCreateCard
                            onCreate={createCard}
                            loading={creating}
                        />

                        <div className="pt-4 text-center">
                            <Button variant="link" size="sm" onClick={refresh} className="text-xs text-muted-foreground">
                                Tentar atualizar novamente
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatwootSidebar;
