import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanCard } from './KanbanCard';
import { Plus, ChevronDown, ChevronUp } from 'lucide-react';
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
  chatwootAgentName?: string;
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
  totalValue?: number;
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
  totalValue = 0,
  onCardClick, 
  pipelineConfig,
  selectionMode = false,
  selectedCardIds = new Set(),
  onSelectCard,
  onSelectAllColumn,
}: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(!isMobile);

  const allColumnCardsSelected = cards.length > 0 && cards.every(card => selectedCardIds.has(card.id));
  const someColumnCardsSelected = cards.some(card => selectedCardIds.has(card.id)) && !allColumnCardsSelected;
  const selectedInColumnCount = cards.filter(card => selectedCardIds.has(card.id)).length;

  const handleSelectAll = () => {
    onSelectAllColumn?.(id);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0 
    }).format(value);
  };

  return (
    <Collapsible
      open={isMobile ? isOpen : true}
      onOpenChange={isMobile ? setIsOpen : undefined}
      className={cn(
        "flex flex-col gap-3",
        // Desktop: altura fixa de 100% do pai, largura fixa.
        isMobile ? "w-full" : "w-[350px] min-w-[350px] h-full max-h-full"
      )}
    >
      <CollapsibleTrigger asChild>
        <div 
          className={cn(
            "flex items-center justify-between cursor-pointer rounded-lg transition-all shrink-0",
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
          <div className="flex items-center gap-2 overflow-hidden">
            {selectionMode && (
              <Checkbox
                checked={allColumnCardsSelected}
                onCheckedChange={handleSelectAll}
                className={cn(isMobile ? "h-5 w-5" : "h-4 w-4")}
                data-state={someColumnCardsSelected ? 'indeterminate' : undefined}
                onClick={(e) => e.stopPropagation()}
              />
            )}
            <h2 className={cn("font-semibold text-foreground truncate", isMobile && "text-base")}>{title}</h2>
            
            <span className={cn("px-2 py-0.5 font-medium rounded-full bg-muted text-muted-foreground flex-shrink-0", isMobile ? "text-sm" : "text-xs")}>
              {count}
            </span>

            {totalValue > 0 && (
              <span className={cn(
                "px-2 py-0.5 font-medium rounded-full bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 flex-shrink-0", 
                isMobile ? "text-sm" : "text-xs"
              )}>
                {formatCurrency(totalValue)}
              </span>
            )}

            {selectionMode && selectedInColumnCount > 0 && (
              <span className={cn("px-2 py-0.5 font-medium rounded-full bg-primary text-primary-foreground flex-shrink-0", isMobile ? "text-sm" : "text-xs")}>
                {selectedInColumnCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
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

      <CollapsibleContent className={cn("flex-1 min-h-0", !isMobile && "h-full")}>
        <div
          ref={setNodeRef}
          className={cn(
            "rounded-lg space-y-2 transition-colors backdrop-blur-sm border border-border/30 overflow-y-auto custom-scrollbar",
            // Desktop: Ocupa 100% da altura disponível. Mobile: Altura mínima.
            isMobile ? "p-3 min-h-[300px]" : "p-2 h-full max-h-full",
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