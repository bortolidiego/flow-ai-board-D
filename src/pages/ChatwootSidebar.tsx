import { useEffect } from 'react';
import { useConversationCard } from '@/hooks/useConversationCard';
import { ChatwootSidebarCreateCard } from '@/components/ChatwootSidebarCreateCard';
import { ChatwootSidebarCardView } from '@/components/ChatwootSidebarCardView';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

const ChatwootSidebar = () => {
    console.log('🎯 ChatwootSidebar: Componente renderizado!');

    const {
        card,
        loading,
        creating,
        createCard,
        updateCard,
        refresh
    } = useConversationCard();

    console.log('🎯 ChatwootSidebar: Estado atual:', { card, loading, creating });

    // Tentar atualizar quando montar
    useEffect(() => {
        console.log('🎯 ChatwootSidebar: useEffect executado, chamando refresh()');
        refresh();
    }, []);

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
            <div className="flex-1 p-4 overflow-hidden">
                {card ? (
                    <ChatwootSidebarCardView
                        card={card}
                        onUpdate={updateCard}
                        autoEdit={true}
                    />
                ) : (
                    <div className="h-full flex flex-col justify-center space-y-6">
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
