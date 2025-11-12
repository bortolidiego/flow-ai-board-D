"use client";

import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Column } from "@/components/Column";
import { KanbanCard } from '@/components/KanbanCard';
import CardDetailDialog from '@/components/CardDetailDialog'; // Fixed import
import { CardCompletionDialog } from '@/components/CardCompletionDialog';
import { useKanbanData } from '@/hooks/useKanbanData';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "react-hot-toast";
import { Plus, BarChart3 } from "lucide-react";

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
    columns, 
    cards, 
    isLoading, 
    error,
    refetch 
  } = useKanbanData();

  const [selectedCard, setSelectedCard] = useState<KanbanCard | null>(null);
  const [completionCard, setCompletionCard] = useState<KanbanCard | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
      // Encontrar o card sendo movido
      const card = cards.find(c => c.id === draggableId);
      if (!card) return;

      // Atualizar o card no banco
      const { error } = await supabase
        .from("cards")
        .update({
          column_id: destination.droppableId,
          position: destination.index,
          updated_at: new Date().toISOString(),
        })
        .eq("id", draggableId);

      if (error) {
        console.error("Erro ao mover card:", error);
        toast.error("Erro ao mover card");
        return;
      }

      toast.success("Card movido com sucesso!");
      refetch(); // Atualizar dados
    } catch (error) {
      console.error("Erro ao processar movimento:", error);
      toast.error("Erro ao processar movimento");
    }
  };

  const handleCardClick = (card: KanbanCard) => {
    setSelectedCard(card);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setSelectedCard(null);
    setIsDialogOpen(false);
    refetch(); // Atualizar dados ao fechar
  };

  const handleCompletion = (card: KanbanCard) => {
    setCompletionCard(card);
  };

  const handleCloseCompletionDialog = () => {
    setCompletionCard(null);
    refetch(); // Atualizar dados ao fechar
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-500 mb-4">Erro ao carregar dados: {error}</p>
          <button 
            onClick={refetch}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
          >
            Tentar novamente
          </button>
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
                      cards={cards.filter((card) => card.column_id === column.id)}
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

      <CardCompletionDialog 
        card={completionCard} 
        onCardUpdate={handleCloseCompletionDialog}
      />
    </div>
  );
}