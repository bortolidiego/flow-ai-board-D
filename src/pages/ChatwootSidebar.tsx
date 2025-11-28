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
            if (!workspace) return;

            try {
                // 1. Buscar pipeline do workspace
                const { data: pipeline, error: pipelineError } = await supabase
                    .from('pipelines')
                    .select('id')
                    .eq('workspace_id', workspace.id)
                    .single();

                if (pipelineError || !pipeline) {
                    console.error('Error fetching pipeline:', pipelineError);
                    return;
                }

                // 2. Buscar configurações em paralelo
                const [
                    { data: customFields },
                    { data: funnelTypes },
                    { data: aiConfig },
                    { data: slaConfig }
                ] = await Promise.all([
                    supabase.from('pipeline_custom_fields').select('*').eq('pipeline_id', pipeline.id).order('position'),
                    supabase.from('funnel_config').select('*').eq('pipeline_id', pipeline.id).order('position'),
                    supabase.from('pipeline_ai_config').select('*').eq('pipeline_id', pipeline.id).maybeSingle(),
                    supabase.from('pipeline_sla_config').select('*').eq('pipeline_id', pipeline.id).maybeSingle()
                ]);

                setPipelineConfig({
                    customFields: customFields || [],
                    funnelTypes: funnelTypes || [],
                    aiConfig: aiConfig || undefined,
                    slaConfig: slaConfig || undefined
                });

                console.log('✅ Pipeline config loaded:', { customFields, funnelTypes, aiConfig });

            } catch (error) {
                console.error('Error fetching pipeline config:', error);
            }
        };

        fetchPipelineConfig();
    }, [workspace]);

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
                {card ? (
                    <CardDetailContent
                        cardId={card.id}
                        initialCardData={card}
                        pipelineConfig={pipelineConfig}
                        showHistory={false}
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
