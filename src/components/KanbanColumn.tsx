"use client";

import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanCard } from './KanbanCard';
import { Plus, ChevronDown, ChevronUp, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface Card {
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
  customFieldsData?: Record<string, any>;
}

interface PipelineConfig {
  customFields: any[];
  aiConfig?: any;
}

interface KanbanColumnProps {
  id: string;
  title: string;
  cards: Card[];
  count: number;
  onCardClick?: (cardId: string) => void;
  pipelineConfig?: PipelineConfig | null;
  selectionMode?: boolean;
  selectedCardIds?: Set<string>;
  onSelectCard?: (cardId: string) => void;
  onSelectAllColumn?: (columnId: string) => void;
}

export const KanbanColumn = ({ 
  id, 
  title, 
  cards, 
  count, 
  onCardClick, 
  pipelineConfig,
  selectionMode = false,
  selectedCardIds = new Set(),
  onSelectCard,
  onSelectAllColumn,
}: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(true); // Always open on desktop, collapsible on mobile

  const allColumnCardsSelected = cards.length > 0 && cards.every(card => selectedCardIds.has(card.id));
  const someColumnCardsSelected = cards.some(card => selectedCardIds.has(card.id)) && !allColumnCardsSelected;
  const selectedInColumnCount = cards.filter(card => selectedCardIds.has(card.id)).length;

  const handleSelectAll = () => {
    onSelectAllColumn?.(id);
  };

  // Calculate column total value
  const columnTotal = cards.reduce((sum, card) => {
    return sum + (card.value || 0);
  }, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className={cn(
      "flex flex-col h-full min-h-0", // Full height flex container
      isMobile ? "w-full" : "flex-1 min-w-[280px] max-w-[420px]"
    )}>
      {/* Column Header - Fixed minimal height */}
      <Collapsible 
        open={isOpen} 
        onOpenChange={setIsOpen}
        className="flex flex-col flex-0"
      >
        <CollapsibleTrigger asChild>
          <div 
            className={cn(
              "flex items-center justify-between p-3 rounded-t-lg border-b border-border/50 cursor-pointer transition-all group",
              isMobile 
                ? "bg-card hover:bg-muted/50" 
                : "bg-card/80 backdrop-blur-sm hover:bg-card"
            )}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {selectionMode && (
                <Checkbox
                  checked={allColumnCardsSelected}
                  onCheckedChange={handleSelectAll}
                  className="h-4 w-4 flex-shrink-0"
                  data-state={someColumnCardsSelected ? 'indeterminate' : undefined}
                />
              )}
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <h2 className="font-semibold text-sm truncate leading-tight">{title}</h2>
                {columnTotal > 0 && (
                  <div className="flex items-center gap-1 text-xs font-medium text-green-600">
                    <DollarSign className="h-3 w-3" />
                    <span>{formatCurrency(columnTotal)}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 ml-2 flex-shrink-0">
              <span className={cn(
                "px-2 py-0.5 font-medium rounded-full text-xs bg-muted/80",
                selectedInColumnCount > 0 && "bg-primary text-primary-foreground"
              )}>
                {selectedInColumnCount || count}
              </span>
              {isMobile && (
                <div className={cn(
                  "p-1 rounded-full transition-transform",
                  isOpen ? "rotate-180" : ""
                )}>
                  <ChevronDown className="h-4 w-4" />
                </div>
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        {/* Header Add Button - Desktop only */}
        {!isMobile && !selectionMode && (
          <div className="p-2 bg-muted/50 border-t border-border/30">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-full text-xs justify-center hover:bg-primary/10"
            >
              <Plus className="h-3 w-3 mr-1.5" />
              Novo Card
            </Button>
          </div>
        )}
      </Collapsible>

      {/* Cards Container - Takes all remaining space */}
      <CollapsibleContent className="flex-1 min-h-0 overflow-hidden">
        <div
          ref={setNodeRef}
          className={cn(
            "flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent p-2 space-y-2",
            isOver && "bg-primary/10 ring-2 ring-primary/20",
            isMobile ? "pb-20" : "pb-4" // Extra padding on mobile for FAB
          )}
        >
          <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
            {cards.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-8 text-muted-foreground">
                <div className="w-12 h-12 mb-3 rounded-xl bg-muted flex items-center justify-center">
                  <Plus className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium mb-1">Nenhum card</p>
                <p className="text-xs">Adicione o primeiro card aqui</p>
              </div>
            ) : (
              cards.map((card) => (
                <KanbanCard
                  key={card.id}
                  {...card}
                  onCardClick={() => onCardClick?.(card.id)}
                  pipelineConfig={pipelineConfig}
                  selectionMode={selectionMode}
                  isSelected={selectedCardIds.has(card.id)}
                  onSelectToggle={() => onSelectCard?.(card.id)}
                />
              ))
            )}
          </SortableContext>
          
          {/* Empty space filler for smooth scrolling */}
          <div className="h-8" />
        </div>
      </CollapsibleContent>
    </div>
  );
};