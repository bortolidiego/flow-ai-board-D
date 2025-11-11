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
  const [isOpen, setIsOpen] = useState(!isMobile); // Começa expandido no desktop, retraído no mobile

  const allColumnCardsSelected = cards.length > 0 && cards.every(card => selectedCardIds.has(card.id));
  const someColumnCardsSelected = cards.some(card => selectedCardIds.has(card.id)) && !allColumnCardsSelected;
  const selectedInColumnCount = cards.filter(card => selectedCardIds.has(card.id)).length;

  const handleSelectAll = () => {
    onSelectAllColumn?.(id);
  };

  // Calcular o totalizador de valores da coluna
  const columnTotal = cards.reduce((sum, card) => {
    return sum + (card.value || 0);
  }, 0);

  // Formatar o valor para exibição
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <Collapsible
      open={isMobile ? isOpen : true}
      onOpenChange={isMobile ? setIsOpen : undefined}
      className={cn(
        "flex flex-col gap-3",
        isMobile ? "w-full" : "w-[350px] min-w-[350px]"
      )}
    >
      <CollapsibleTrigger asChild>
        <div 
          className={cn(
            "flex items-center justify-between cursor-pointer rounded-lg transition-all",
            isMobile ? "px-3 py-3 bg-card/50 border border-border/50 hover:bg-card/70 active:scale-[0.98]" : "px-2 cursor-default",
            isMobile && isOpen && "bg-primary/10 border-primary/30"
          )}
          onClick={(e) => {
            if (!isMobile) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        >
          <div className="flex items-center gap-2">
            {selectionMode && (
              <Checkbox
                checked={allColumnCardsSelected}
                onCheckedChange={handleSelectAll}
                className={cn(isMobile ? "h-5 w-5" : "h-4 w-4")}
                data-state={someColumnCardsSelected ? 'indeterminate' : undefined}
                onClick={(e) => e.stopPropagation()}
              />
            )}
            <div className="flex flex-col gap-1">
              <h2 className={cn("font-semibold text-foreground", isMobile && "text-base")}>{title}</h2>
              {columnTotal > 0 && (
                <div className={cn(
                  "flex items-center gap-1 text-xs font-medium",
                  isMobile ? "text-sm" : "text-xs"
                )}>
                  <DollarSign className={cn("h-3 w-3", isMobile ? "h-4 w-4")} />
                  <span className="text-green-600 dark:text-green-400">
                    {formatCurrency(columnTotal)}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={cn("px-2 py-0.5 font-medium rounded-full bg-muted text-muted-foreground", isMobile ? "text-sm" : "text-xs")}>
                {count}
              </span>
              {selectionMode && selectedInColumnCount > 0 && (
                <span className={cn("px-2 py-0.5 font-medium rounded-full bg-primary text-primary-foreground", isMobile ? "text-sm" : "text-xs")}>
                  {selectedInColumnCount}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {!selectionMode && !isMobile && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
                <Plus className="h-4 w-4" />
              </Button>
            )}
            {isMobile && (
              <div className={cn(
                "flex items-center justify-center rounded-md transition-all",
                "bg-primary/20 text-primary",
                isMobile ? "h-8 w-8" : "h-6 w-6"
              )}>
                {isOpen ? (
                  <ChevronUp className={cn(isMobile ? "h-5 w-5" : "h-4 w-4")} />
                ) : (
                  <ChevronDown className={cn(isMobile ? "h-5 w-5" : "h-4 w-4")} />
                )}
              </div>
            )}
          </div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div
          ref={setNodeRef}
          className={cn(
            "flex-1 rounded-lg space-y-2 transition-colors backdrop-blur-sm border border-border/30",
            isMobile ? "p-3 min-h-[300px]" : "p-2 h-[calc(100vh-280px)]",
            isOver ? 'bg-primary/5 ring-2 ring-primary/30' : 'bg-card/30'
          )}
        >
          <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
            {cards.map((card) => (
              <KanbanCard
                key={card.id}
                {...card}
                onCardClick={() => onCardClick?.(card.id)}
                pipelineConfig={pipelineConfig}
                selectionMode={selectionMode}
                isSelected={selectedCardIds.has(card.id)}
                onSelectToggle={() => onSelectCard?.(card.id)}
              />
            ))}
          </SortableContext>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
