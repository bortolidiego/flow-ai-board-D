import { useState, useEffect, useMemo } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useKanbanData, Card } from '@/hooks/useKanbanData';
import { KanbanColumn } from '@/components/KanbanColumn';
import { KanbanFilters } from '@/components/KanbanFilters';
import { BulkActionsBar } from '@/components/BulkActionsBar';
import { CardDetailDialog } from '@/components/CardDetailDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

export default function KanbanBoard() {
  const { workspace } = useWorkspace();
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

  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [cardDetailOpen, setCardDetailOpen] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [savedViews, setSavedViews] = useState<any[]>([]);
  const isMobile = useIsMobile();

  // Group cards by column
  const cardsByColumn = useMemo(() => {
    const grouped: Record<string, Card[]> = {};
    cards.forEach(card => {
      if (!grouped[card.columnId]) {
        grouped[card.columnId] = [];
      }
      grouped[card.columnId].push(card);
    });
    return grouped;
  }, [cards]);

  const handleCardClick = (cardId: string) => {
    setSelectedCardId(cardId);
    setCardDetailOpen(true);
  };

  const handleSelectCard = (cardId: string) => {
    setSelectedCardIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  const handleSelectAllColumn = (columnId: string) => {
    const columnCards = cards.filter(card => card.columnId === columnId);
    const allSelected = columnCards.every(card => selectedCardIds.has(card.id));

    setSelectedCardIds(prev => {
      const newSet = new Set(prev);
      columnCards.forEach(card => {
        if (allSelected) {
          newSet.delete(card.id);
        } else {
          newSet.add(card.id);
        }
      });
      return newSet;
    });
  };

  const handleDeleteSelected = async () => {
    await deleteCards(Array.from(selectedCardIds));
    setSelectedCardIds(new Set());
  };

  const handleTransferSelected = async (columnId: string) => {
    await bulkUpdateCardColumn(Array.from(selectedCardIds), columnId);
    setSelectedCardIds(new Set());
  };

  const getColumnCards = (columnId: string) => {
    return cards.filter((card) => card.columnId === columnId);
  };

  const saveView = (name: string) => {
    // Implementation for saving views
    console.log('Saving view:', name);
  };

  const loadView = (id: string) => {
    // Implementation for loading views
    console.log('Loading view:', id);
  };

  const deleteView = (id: string) => {
    // Implementation for deleting views
    console.log('Deleting view:', id);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Selecione um workspace primeiro</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <KanbanFilters
        filters={{}}
        sortBy="createdAt-desc"
        setSortBy={() => {}}
        updateFilter={() => {}}
        resetFilters={() => {}}
        activeFiltersCount={0}
        totalCards={cards.length}
        filteredCount={cards.length}
        cards={cards}
        savedViews={savedViews}
        saveView={saveView}
        loadView={loadView}
        deleteView={deleteView}
      />

      {/* Bulk Actions Bar */}
      {selectedCardIds.size > 0 && (
        <BulkActionsBar
          selectedCount={selectedCardIds.size}
          onCancel={() => setSelectedCardIds(new Set())}
          onDelete={handleDeleteSelected}
          onTransfer={handleTransferSelected}
          columns={[]} // TODO: Pass actual columns
        />
      )}

      {/* Kanban Board */}
      <div className={cn(
        "flex gap-6 overflow-x-auto pb-6",
        isMobile ? "flex-col" : "flex-row"
      )}>
        {/* TODO: Render columns here */}
        <div className="text-center py-12 text-muted-foreground">
          Kanban columns will be rendered here
        </div>
      </div>

      {/* Card Detail Dialog */}
      <CardDetailDialog
        cardId={selectedCardId}
        open={cardDetailOpen}
        onOpenChange={setCardDetailOpen}
        pipelineConfig={pipelineConfig}
      />
    </div>
  );
}