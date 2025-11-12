"use client";

import React from "react";
import { KanbanCard } from "./KanbanCard";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface CardData {
  id: string;
  title: string;
  description?: string;
  priority?: string;
  assignee?: string;
  column_id: string;
  position: number;
  created_at: string;
  updated_at: string;
  funnel_score?: number;
  service_quality_score?: number;
  lifecycle_progress_percent?: number;
  value?: number;
  conversation_status?: string;
  subject?: string;
  product_item?: string;
  chatwoot_contact_name?: string;
  chatwoot_contact_email?: string;
  chatwoot_agent_name?: string;
}

interface Column {
  id: string;
  name: string;
  position: number;
}

interface KanbanColumnProps {
  column: Column;
  cards: CardData[];
  onCardClick: (card: CardData) => void;
  onCardCompletion: (card: CardData) => void;
  isDraggingOver: boolean;
  pipelineConfig?: any;
  selectionMode?: boolean;
  onSelectToggle?: (cardId: string) => void;
  selectedCards?: string[];
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  cards,
  onCardClick,
  onCardCompletion,
  isDraggingOver,
  pipelineConfig,
  selectionMode,
  onSelectToggle,
  selectedCards,
}) => {
  return (
    <div className="bg-muted/30 rounded-lg p-3 min-h-[600px] w-80">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">{column.name}</h3>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
          {cards.length}
        </span>
      </div>

      <div className="space-y-2 min-h-[500px]">
        {cards.map((card) => (
          <KanbanCard
            key={card.id}
            {...card}
            onClick={() => onCardClick(card)}
            onComplete={() => onCardCompletion(card)}
            pipelineConfig={pipelineConfig}
            selectionMode={selectionMode}
            isSelected={selectedCards?.includes(card.id)}
            onSelectToggle={() => onSelectToggle?.(card.id)}
            onCardClick={() => onCardClick(card)}
          />
        ))}
        
        {cards.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Plus className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Arraste cards aqui</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;