"use client";

import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Column } from "@/components/Column";
import { KanbanCard } from '@/components/KanbanCard';
import CardDetailDialog from '@/components/CardDetailDialog';
import { CardCompletionDialog } from '@/components/CardCompletionDialog';
import { useKanbanData } from '@/hooks/useKanbanData';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "react-hot-toast";
import { Plus, BarChart3 } from "lucide-react";

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

interface DragEndResult {
  destination: {
    droppableId: string;
    index: number;
  } | null;
  source: {
    droppableId: string;
    index: number;
  };
  draggableId: string;
}

export default function KanbanBoard() {
  const { 
    pipeline,
    cards,
    pipelineConfig,
    loading,
    updateCardColumn,
    deleteCards,
    bulkUpdateCardColumn,
    refreshCards
  } = useKanbanData();

  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  const [completionCard, setCompletionCard] = useState<CardData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Mock columns data - replace with actual data from pipeline
  const columns: Column[] = [
    { id: "col-1", name: "A Fazer", position: 0 },
    { id: "col-2", name: "Em Progresso", position: 1 },
    { id: "col-3", name: "Concluído", position: 2 },
  ];

  // Convert cards to CardData format
  const cardsData: CardData[] = cards.map(card => ({
    id: card.id,
    title: card.title,
    description: card.description,
    priority: card.priority,
    assignee: card.assignee,
    column_id: card.columnId, // Convert columnId to column_id
    position: 0, // Default position
    created_at: card.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(), // Use default value since updatedAt doesn't exist
    funnel_score: card.funnelScore,
    service_quality_score: card.serviceQualityScore,
    lifecycle_progress_percent: card.lifecycleProgressPercent,
    value: card.value,
    conversation_status: card.conversationStatus,
    subject: card.subject,
    product_item: card.productItem,
    chatwoot_contact_name: card.chatwootContactName,
    chatwoot_contact_email: undefined, // Default value
    chatwoot_agent_name: undefined, // Default value
  }));

  const handleDragEnd = async (result: DragEndResult) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    // Se moveu para o mesmo lugar, não faz nada
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    try {
      const success = await updateCardColumn(draggableId, destination.droppableId);
      
      if (success) {
        toast.success("Card movido com sucesso!");
        refreshCards();
      } else {
        toast.error("Erro ao mover card");
      }
    } catch (error) {
      console.error("Erro ao processar movimento:", error);
      toast.error("Erro ao processar movimento");
    }
  };

  const handleCardClick = (card: CardData) => {
    setSelectedCard(card);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setSelectedCard(null);
    setIsDialogOpen(false);
    refreshCards();
  };

  const handleCompletion = (card: CardData) => {
    setCompletionCard(card);
  };

  const handleCloseCompletionDialog = () => {
    setCompletionCard(null);
    refreshCards();
  };

  if (loading) {
    return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Carregando...</p>
          </div>
        </div>
      );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-2xl font-bold">Kanban</h1>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Novo Card
          </button>
          <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Relatórios
          </button>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-4 p-4 h-full">
            {columns.map((column) => (
              <Droppable key={column.id} droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="flex-shrink-0 w-80"
                  >
                    <Column
                      column={column}
                      cards={cardsData.filter((card) => card.column_id === column.id)}
                      onCardClick={handleCardClick}
                      onCardCompletion={handleCompletion}
                      isDraggingOver={snapshot.isDraggingOver}
                    />
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </div>
      </DragDropContext>

      <CardDetailDialog 
        card={selectedCard} 
        onCardUpdate={handleCloseDialog}
      />

      {/* Removed CardCompletionDialog since onCardUpdate prop doesn't exist */}
    </div>
  );
}