"use client";

import React from "react";
import { Droppable, Draggable } from "react-beautiful-dnd";
import { KanbanCard } from "./KanbanCard";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Column {
  id: string;
  name: string;
  position: number;
}

interface ColumnProps {
  column: Column;
  cards: KanbanCard[];
  onCardClick: (card: KanbanCard) => void;
  onCardCompletion: (card: KanbanCard) => void;
  isDraggingOver: boolean;
}

export const Column: React.FC<ColumnProps> = ({
  column,
  cards,
  onCardClick,
  onCardCompletion,
  isDraggingOver,
}) => {
  return (
    <div className="bg-muted/30 rounded-lg p-3 min-h-[600px] w-80">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">{column.name}</h3>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
          {cards.length}
        </span>
      </div>

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "space-y-2 min-h-[500px] transition-colors rounded",
              snapshot.isDraggingOver && "bg-primary/10"
            )}
          >
            {cards.map((card, index) => (
              <Draggable key={card.id} draggableId={card.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={cn(
                      "transition-transform",
                      snapshot.isDragging && "rotate-2 shadow-lg"
                    )}
                  >
                    <KanbanCard
                      card={card}
                      onClick={() => onCardClick(card)}
                      onComplete={() => onCardCompletion(card)}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            
            {cards.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Plus className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Arraste cards aqui</p>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
};

export default Column;