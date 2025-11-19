import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanCard } from './KanbanCard';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';
import { MoreHorizontal, Plus, CheckSquare } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { useIsMobile } from '@/hooks/use-mobile';

interface KanbanColumnProps {
  id: string;
  title: string;
  cards: any[];
  count: number;
  totalValue: number;
  onCardClick: (id: string) => void;
  pipelineConfig: any;
  selectionMode?: boolean;
  selectedCardIds?: Set<string>;
  onSelectCard?: (id: string) => void;
  onSelectAllColumn?: (columnId: string) => void;
}

export function KanbanColumn({
  id,
  title,
  cards,
  count,
  totalValue,
  onCardClick,
  pipelineConfig,
  selectionMode,
  selectedCardIds,
  onSelectCard,
  onSelectAllColumn,
}: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id });
  const isMobile = useIsMobile();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className={cn(
      "flex flex-col bg-card/40 rounded-xl border border-border/50 backdrop-blur-sm shadow-sm shrink-0",
      isMobile ? "h-auto w-full" : "h-full w-[320px] max-w-[320px]" // Largura fixa e altura total no desktop
    )}>
      {/* Column Header */}
      <div className="p-3 border-b border-border/50 bg-card/20 shrink-0 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <span className="truncate max-w-[180px]">{title}</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 h-5 min-w-[20px] justify-center">
              {count}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
             {selectionMode && onSelectAllColumn && (
               <Button
                 variant="ghost"
                 size="icon"
                 className="h-6 w-6"
                 onClick={() => onSelectAllColumn(id)}
                 title="Selecionar todos desta coluna"
               >
                 <CheckSquare className="w-3.5 h-3.5" />
               </Button>
             )}
             <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground">
               <MoreHorizontal className="w-3.5 h-3.5" />
             </Button>
          </div>
        </div>
        
        {totalValue > 0 && (
          <div className="text-xs font-medium text-muted-foreground px-1">
            Total: <span className="text-primary">{formatCurrency(totalValue)}</span>
          </div>
        )}
      </div>

      {/* Column Content - Scrollable Area */}
      <div ref={setNodeRef} className="flex-1 min-h-0 relative"> {/* min-h-0 is critical for nested flex scroll */}
        <div className={cn(
          "absolute inset-0 overflow-y-auto overflow-x-hidden p-2", // Scroll apenas vertical
          // Estilização da barra de rolagem
          "scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/50"
        )}>
          <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2 pb-2">
              {cards.map((card) => (
                <KanbanCard
                  key={card.id}
                  {...card}
                  onClick={() => onCardClick(card.id)}
                  pipelineConfig={pipelineConfig}
                  selectionMode={selectionMode}
                  isSelected={selectedCardIds?.has(card.id)}
                  onSelect={() => onSelectCard?.(card.id)}
                />
              ))}
              {cards.length === 0 && (
                <div className="h-24 flex items-center justify-center border-2 border-dashed border-border/30 rounded-lg">
                  <span className="text-xs text-muted-foreground/50">Vazio</span>
                </div>
              )}
            </div>
          </SortableContext>
        </div>
      </div>
    </div>
  );
}