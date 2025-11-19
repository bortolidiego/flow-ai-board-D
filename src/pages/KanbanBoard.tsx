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
import { CardCompletionDialog } from '@/components/CardCompletionDialog';
import { BulkActionsBar } from '@/components/BulkActionsBar';
import { KanbanFilters } from '@/components/KanbanFilters';
import { useKanbanData } from '@/hooks/useKanbanData';
import { useKanbanFilters } from '@/hooks/useKanbanFilters';
import { useWorkspace } from '@/hooks/useWorkspace';
import { Loader2, RefreshCw, CheckSquare, X, Building2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

const KanbanBoard = () => {
  const { workspace, loading: workspaceLoading } = useWorkspace();
  const {
    pipeline,
    cards,
    pipelineConfig,
    loading,
    updateCardColumn,
    deleteCards,
    bulkUpdateCardColumn,
    refreshCards,
  } = useKanbanData(workspace?.id);

  const {
    filters,
    sortBy,
    setSortBy,
    updateFilter,
    updateCustomFieldFilter,
    resetFilters,
    filteredCards,
    activeFiltersCount,
    savedViews,
    saveView,
    loadView,
    deleteView,
  } = useKanbanFilters(cards);

  const [activeCard, setActiveCard] = useState<any>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false);
  const [cardToComplete, setCardToComplete] = useState<string | null>(null);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [reanalysisProgress, setReanalysisProgress] = useState<{ current: number; total: number } | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // ... (mantendo funções auxiliares como handleReanalyzeAll, toggleSelectionMode, etc.)
  const handleReanalyzeAll = async () => {
    if (!pipeline) return;
    setReanalyzing(true);
    setReanalysisProgress({ current: 0, total: cards.length });
    toast({ title: "Reanálise iniciada", description: "Processando todos os cards..." });
    
    // Simulação de progresso para UX
    const estimatedTimePerCard = 2500;
    const interval = setInterval(() => {
      setReanalysisProgress(prev => {
        if (!prev) return null;
        const newCurrent = Math.min(prev.current + 1, prev.total);
        if (newCurrent >= prev.total) clearInterval(interval);
        return { current: newCurrent, total: prev.total };
      });
    }, estimatedTimePerCard);

    try {
      const { data, error } = await supabase.functions.invoke('reanalyze-all-cards', {
        body: { pipelineId: pipeline.id }
      });
      clearInterval(interval);
      if (error) throw error;
      setReanalysisProgress({ current: data.total, total: data.total });
      toast({ title: "Reanálise concluída!", description: `${data.successful} cards analisados.` });
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      clearInterval(interval);
      toast({ title: "Erro na reanálise", variant: "destructive" });
      setReanalysisProgress(null);
    } finally {
      setReanalyzing(false);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) setSelectedCardIds(new Set());
  };

  const toggleCardSelection = (cardId: string) => {
    setSelectedCardIds(prev => {
      const newSet = new Set(prev);
      newSet.has(cardId) ? newSet.delete(cardId) : newSet.add(cardId);
      return newSet;
    });
  };

  const selectAllCards = () => setSelectedCardIds(new Set(cards.map(c => c.id)));

  const selectColumnCards = (columnId: string) => {
    const columnCards = cards.filter(c => c.columnId === columnId);
    setSelectedCardIds(prev => {
      const newSet = new Set(prev);
      const allSelected = columnCards.every(card => newSet.has(card.id));
      allSelected ? columnCards.forEach(card => newSet.delete(card.id)) : columnCards.forEach(card => newSet.add(card.id));
      return newSet;
    });
  };

  const handleBulkDelete = async () => {
    const success = await deleteCards(Array.from(selectedCardIds));
    if (success) { setSelectedCardIds(new Set()); setSelectionMode(false); refreshCards(); }
  };

  const handleBulkTransfer = async (columnId: string) => {
    const success = await bulkUpdateCardColumn(Array.from(selectedCardIds), columnId);
    if (success) { setSelectedCardIds(new Set()); setSelectionMode(false); refreshCards(); }
  };

  const handleDragStart = (event: DragStartEvent) => {
    if (selectionMode) return;
    const { active } = event;
    setActiveCard(cards.find((c) => c.id === active.id) || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);
    if (!over) return;
    const activeCardData = cards.find((c) => c.id === active.id);
    if (!activeCardData) return;

    const overColumnId = over.id as string;
    const targetColumn = pipeline?.columns.find(col => col.id === overColumnId);
    
    if (targetColumn?.name === 'Finalizados') {
      setCardToComplete(active.id as string);
      setCompletionDialogOpen(true);
      return;
    }
    
    if (activeCardData.columnId !== overColumnId) {
      await updateCardColumn(active.id as string, overColumnId);
    }
  };

  const getColumnCards = (columnId: string) => filteredCards.filter((card) => card.columnId === columnId);

  if (workspaceLoading || loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-background via-background to-primary/5 overflow-hidden">
      {/* Header - Fixo no topo */}
      <div className="border-b border-border/50 bg-card/30 backdrop-blur-xl shrink-0 z-20">
        <div className={cn("w-full py-3", isMobile ? "px-3 pl-12" : "px-6")}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent truncate">
                  Kanban Board
                </h1>
                {workspace && !isMobile && (
                  <Badge variant="outline" className="flex items-center gap-1 shrink-0">
                    <Building2 className="w-3 h-3" />
                    {workspace.name}
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Actions Toolbar */}
            <div className="flex items-center gap-2 shrink-0">
              {!selectionMode ? (
                <>
                  <Button onClick={toggleSelectionMode} variant="outline" size="sm" className="gap-2">
                    <CheckSquare className="w-4 h-4" />
                    {!isMobile && "Seleção"}
                  </Button>
                  <Button onClick={handleReanalyzeAll} disabled={reanalyzing || !pipeline} variant="outline" size="sm" className="gap-2">
                    <RefreshCw className={cn("w-4 h-4", reanalyzing && 'animate-spin')} />
                    {!isMobile && (reanalyzing ? 'Processando...' : 'Reanalisar')}
                  </Button>
                </>
              ) : (
                <div className="flex items-center gap-2 bg-muted/30 border rounded-lg p-1">
                   <Badge variant="secondary" className="mx-1">{selectedCardIds.size}</Badge>
                   {!isMobile && <Button onClick={selectAllCards} variant="ghost" size="sm" className="h-7 text-xs">Todos</Button>}
                   <Button onClick={toggleSelectionMode} variant="ghost" size="sm" className="h-7 w-7 p-0"><X className="w-4 h-4" /></Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar - Fixa abaixo do Header */}
      <div className="shrink-0 z-10 bg-background/50 backdrop-blur-sm border-b border-border/10 px-6 py-2">
        <KanbanFilters
          filters={filters}
          sortBy={sortBy}
          setSortBy={setSortBy}
          updateFilter={updateFilter}
          updateCustomFieldFilter={updateCustomFieldFilter}
          resetFilters={resetFilters}
          activeFiltersCount={activeFiltersCount}
          totalCards={cards.length}
          filteredCount={filteredCards.length}
          cards={cards}
          savedViews={savedViews}
          saveView={saveView}
          loadView={loadView}
          deleteView={deleteView}
        />
        {selectionMode && selectedCardIds.size > 0 && (
          <div className="mt-2">
            <BulkActionsBar
              selectedCount={selectedCardIds.size}
              onCancel={() => { setSelectedCardIds(new Set()); setSelectionMode(false); }}
              onDelete={handleBulkDelete}
              onTransfer={handleBulkTransfer}
              columns={pipeline?.columns || []}
            />
          </div>
        )}
      </div>

      {/* Main Board Area - Ocupa o restante da altura, scroll horizontal aqui */}
      <main className="flex-1 w-full overflow-hidden relative">
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className={cn(
            "h-full w-full",
            isMobile 
              ? "overflow-y-auto overflow-x-hidden p-3 pb-24 space-y-4" // Mobile: Scroll vertical
              : "overflow-x-auto overflow-y-hidden p-6 pb-2 flex gap-4" // Desktop: Scroll horizontal, colunas lado a lado
          )}>
             {pipeline?.columns.map((column) => {
                const columnCards = getColumnCards(column.id);
                const total = columnCards.reduce((sum, c) => sum + (c.value || 0), 0);
                return (
                  <KanbanColumn
                    key={column.id}
                    id={column.id}
                    title={column.name}
                    cards={columnCards}
                    count={columnCards.length}
                    totalValue={total}
                    onCardClick={(id) => !selectionMode && setSelectedCardId(id)}
                    pipelineConfig={pipelineConfig}
                    selectionMode={selectionMode}
                    selectedCardIds={selectedCardIds}
                    onSelectCard={toggleCardSelection}
                    onSelectAllColumn={selectColumnCards}
                  />
                );
             })}
          </div>
          <DragOverlay>
            {activeCard && !selectionMode ? <KanbanCard {...activeCard} /> : null}
          </DragOverlay>
        </DndContext>
      </main>

      <CardDetailDialog
        cardId={selectedCardId}
        open={!!selectedCardId}
        onOpenChange={(open) => !open && setSelectedCardId(null)}
        pipelineConfig={pipelineConfig}
      />

      {completionDialogOpen && cardToComplete && pipeline && (
        <CardCompletionDialog
          cardId={cardToComplete}
          pipelineId={pipeline.id}
          open={completionDialogOpen}
          onOpenChange={setCompletionDialogOpen}
          onCompleted={() => { refreshCards(); setCardToComplete(null); }}
        />
      )}
    </div>
  );
};

export default KanbanBoard;