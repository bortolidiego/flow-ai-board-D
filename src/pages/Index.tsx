import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { KanbanColumn } from '@/components/KanbanColumn';
import { KanbanCard } from '@/components/KanbanCard';
import { CardDetailDialog } from '@/components/CardDetailDialog';
import { useKanbanData } from '@/hooks/useKanbanData';
import { useWorkspace } from '@/hooks/useWorkspace';
import { Bot, Sparkles, Loader2, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

const Index = () => {
  const { workspace, loading: workspaceLoading } = useWorkspace();
  const {
    pipeline,
    cards,
    pipelineConfig,
    loading,
    updateCardColumn,
  } = useKanbanData(workspace?.id);

  const [activeCard, setActiveCard] = useState<any>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const card = cards.find((c) => c.id === active.id);
    setActiveCard(card || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) return;

    const activeCardData = cards.find((c) => c.id === active.id);
    if (!activeCardData) return;

    const overColumnId = over.id as string;
    
    if (activeCardData.columnId !== overColumnId) {
      await updateCardColumn(active.id as string, overColumnId);
    }
  };

  const getColumnCards = (columnId: string) => {
    return cards.filter((card) => card.columnId === columnId);
  };

  if (workspaceLoading || loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-background via-background to-primary/5 overflow-hidden">
      {/* Header - Fixo */}
      <header className="shrink-0 border-b border-border/50 bg-card/30 backdrop-blur-xl z-20">
        <div className={cn("w-full py-4", isMobile ? "px-4" : "px-6")}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Bot className="w-8 h-8 text-primary" />
                <Sparkles className="w-4 h-4 text-secondary absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  Smart Kanban
                </h1>
                <p className="text-xs text-muted-foreground">Powered by AI + Chatwoot</p>
              </div>
            </div>
            {workspace && !isMobile && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {workspace.name}
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Main Area - Flexível e sem scroll global */}
      <main className="flex-1 w-full overflow-hidden relative">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className={cn(
            "h-full w-full",
            isMobile 
              ? "overflow-y-auto overflow-x-hidden p-3 pb-24 space-y-4" // Mobile: Scroll vertical
              : "overflow-x-auto overflow-y-hidden p-6 pb-2 flex gap-4" // Desktop: Scroll horizontal, colunas fixas
          )}>
            {pipeline?.columns.map((column) => {
              const columnCards = getColumnCards(column.id);
              const totalValue = columnCards.reduce((sum, card) => sum + (card.value || 0), 0);
              
              return (
                <KanbanColumn
                  key={column.id}
                  id={column.id}
                  title={column.name}
                  cards={columnCards}
                  count={columnCards.length}
                  totalValue={totalValue}
                  onCardClick={(cardId) => setSelectedCardId(cardId)}
                  pipelineConfig={pipelineConfig}
                />
              );
            })}
          </div>

          <DragOverlay>
            {activeCard ? <KanbanCard {...activeCard} /> : null}
          </DragOverlay>
        </DndContext>

        <CardDetailDialog
          cardId={selectedCardId}
          open={selectedCardId !== null}
          onOpenChange={(open) => !open && setSelectedCardId(null)}
          pipelineConfig={pipelineConfig}
        />
      </main>
    </div>
  );
};

export default Index;