"use client";

import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Column } from "@/components/Column";
import { KanbanCard } from '@/components/KanbanCard';
import CardDetailDialog from '@/components/CardDetailDialog';
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

// Mock data for now
const mockCards: CardData[] = [
  {
    id: "1",
    title: "Card de Exemplo 1",
    description: "Este é um card de exemplo",
    priority: "alta",
    assignee: "João Silva",
    column_id: "col-1",
    position: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    funnel_score: 85,
    service_quality_score: 90,
    lifecycle_progress_percent: 75,
    value: 1500,
    conversation_status: "em_andamento",
    subject: "Orçamento para reforma",
    product_item: "Reforma residencial",
    chatwoot_contact_name: "Maria Santos",
  },
  {
    id: "2",
    title: "Card de Exemplo 2",
    description: "Outro card de exemplo",
    priority: "media",
    assignee: "Ana Costa",
    column_id: "col-2",
    position: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    funnel_score: 60,
    service_quality_score: 80,
    lifecycle_progress_percent: 50,
    value: 800,
    conversation_status: "aguardando",
    subject: "Consulta sobre produto",
    product_item: "Consultoria",
    chatwoot_contact_name: "Pedro Oliveira",
  },
];

const mockColumns: Column[] = [
  { id: "col-1", name: "A Fazer", position: 0 },
  { id: "col-2", name: "Em Progresso", position: 1 },
  { id: "col-3", name: "Concluído", position: 2 },
];

export default function KanbanBoard() {
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [cards, setCards] = useState<CardData[]>(mockCards);

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
      // Update card column locally for now
      setCards(prevCards => 
        prevCards.map(card => 
          card.id === draggableId 
            ? { ...card, column_id: destination.droppableId }
            : card
        )
      );
      
      toast.success("Card movido com sucesso!");
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
  };

  const handleCompletion = (card: CardData) => {
    // For now, just show a success message
    toast.success("Card finalizado!");
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-2xl font-bold">Kanban</h1>
        <div className="flex items-center gap-2">
          <button 
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2"
            onClick={() => {
              const newCard: CardData = {
                id: Date.now().toString(),
                title: "Novo Card",
                description: "Descrição do novo card",
                priority: "media",
                assignee: "Sem responsável",
                column_id: "col-1",
                position: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
              setCards(prev => [newCard, ...prev]);
              toast.success("Card criado!");
            }}
          >
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
            {mockColumns.map((column) => (
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
    </div>
  );
}