import { useState, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { KanbanColumn } from '@/components/KanbanColumn';
import { KanbanCard } from '@/components/KanbanCard';
import { CardDetailDialog } from '@/components/CardDetailDialog';
import { CardCompletionDialog } from '@/components/CardCompletionDialog';
import { BulkActionsBar } from '@/components/BulkActionsBar';
import { KanbanFilters } from '@/components/KanbanFilters';
import { DeletedCardsSheet } from '@/components/DeletedCardsSheet';
import { useKanbanData } from '@/hooks/useKanbanData';
import { useKanbanFilters } from '@/hooks/useKanbanFilters';
import { useWorkspace } from '@/hooks/useWorkspace';
import { Loader2, RefreshCw, CheckSquare, X, Building2, MessageSquare, AlertCircle, User } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useChatwoot } from '@/components/ChatwootContextProvider';

const KanbanBoard = () => {
  const { workspace, loading: workspaceLoading } = useWorkspace();
  const {
    pipeline,
    cards,
    pipelineConfig,
    loading,
    updateCardColumn,
    deleteCards,
    restoreCards,
    bulkUpdateCardColumn,
    refreshCards,
  } = useKanbanData(workspace?.id);

  const {
    filters,
    sortBy,
    setSortBy,
    updateFilter,
    updateCustomFieldFilter,
    resetFilters,
    filteredCards,
    activeFiltersCount,
    savedViews,
    saveView,
    loadView,
    deleteView,
  } = useKanbanFilters(cards);

  const [activeCard, setActiveCard] = useState<any>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false);
  const [cardToComplete, setCardToComplete] = useState<string | null>(null);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [reanalysisProgress, setReanalysisProgress] = useState<{ current: number; total: number } | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // Usar contexto do Chatwoot
  const { 
    isChatwootFrame, 
    context, 
    appType, 
    conversationId, 
    contactId, 
    contactEmail, 
    contactPhone,
    contactName, // Adicionado aqui
    agentName 
  } = useChatwoot();
  const [autoFilterApplied, setAutoFilterApplied] = useState(false);
  const [customerProfileIdFromChatwoot, setCustomerProfileIdFromChatwoot] = useState<string | null>(null);

  // Função para buscar customer_profile_id se não vier direto do Chatwoot
  const fetchCustomerProfileId = async (email?: string, phone?: string): Promise<string | null> => {
    if (!email && !phone) return null;

    let query = supabase.from('customer_profiles').select('id');

    if (email) {
      query = query.eq('email', email);
    } else if (phone) {
      query = query.eq('phone', phone);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error('Error fetching customer profile by email/phone:', error);
      return null;
    }
    return data?.id || null;
  };

  // Aplicar filtro automático quando contexto do Chatwoot estiver disponível
  useEffect(() => {
    const applyChatwootFilters = async () => {
      if (!isChatwootFrame || autoFilterApplied || !context) return;

      console.log('🎯 Aplicando filtro automático para contexto Chatwoot:', appType);
      
      // Resetar filtros antes de aplicar o novo
      resetFilters();

      if (appType === 'conversation_sidebar' && conversationId) {
        console.log('✅ Filtrando por Conversation ID:', conversationId);
        updateFilter('chatwootConversationId', [conversationId.toString()]);
        
        const conversationCards = cards.filter(card => 
          card.chatwootConversationId === conversationId.toString()
        );
        if (conversationCards.length === 1) {
          setSelectedCardId(conversationCards[0].id);
        }
      } else if (appType === 'contact_sidebar') {
        let profileIdToFilter: string | null = null;

        if (contactId) {
          profileIdToFilter = contactId.toString();
          console.log('✅ Filtrando por Contact ID (direto):', contactId);
        } else if (contactEmail || contactPhone) {
          console.log('🔍 Buscando Customer Profile ID por email/telefone...');
          profileIdToFilter = await fetchCustomerProfileId(contactEmail, contactPhone);
          if (profileIdToFilter) {
            console.log('✅ Customer Profile ID encontrado:', profileIdToFilter);
          } else {
            console.warn('⚠️ Nenhum Customer Profile ID encontrado para o contato.');
          }
        }

        if (profileIdToFilter) {
          setCustomerProfileIdFromChatwoot(profileIdToFilter);
          updateFilter('customerProfileId', [profileIdToFilter]);
          
          const contactCards = cards.filter(card => 
            card.customerProfileId === profileIdToFilter
          );
          if (contactCards.length === 1) {
            setSelectedCardId(contactCards[0].id);
          }
        } else {
          console.warn('⚠️ Não foi possível aplicar filtro de contato: ID, email ou telefone ausentes.');
        }
      } else {
        console.log('ℹ️ Nenhum filtro específico do Chatwoot aplicado (Dashboard App ou contexto incompleto).');
      }
      
      setAutoFilterApplied(true);
    };

    applyChatwootFilters();
  }, [isChatwootFrame, context, appType, conversationId, contactId, contactEmail, contactPhone, autoFilterApplied, cards, updateFilter, resetFilters]);

  const handleReanalyzeAll = async () => {
    if (!pipeline) {
      toast({
        title: "Nenhum pipeline disponível",
        description: "Aguarde o carregamento do pipeline.",
        variant: "destructive"
      });
      return;
    }

    setReanalyzing(true);
    setReanalysisProgress({ current: 0, total: cards.length });
    
    toast({
      title: "Reanálise iniciada",
      description: "Processando todos os cards. Isso pode levar alguns minutos...",
    });

    const estimatedTimePerCard = 2500;
    const interval = setInterval(() => {
      setReanalysisProgress(prev => {
        if (!prev) return null;
        const newCurrent = Math.min(prev.current + 1, prev.total);
        if (newCurrent >= prev.total) {
          clearInterval(interval);
        }
        return { current: newCurrent, total: prev.total };
      });
    }, estimatedTimePerCard);

    try {
      const { data, error } = await supabase.functions.invoke('reanalyze-all-cards', {
        body: { pipelineId: pipeline.id }
      });

      clearInterval(interval);

      if (error) throw error;

      setReanalysisProgress({ current: data.total, total: data.total });
      
      toast({
        title: "Reanálise concluída!",
        description: `${data.successful} cards analisados com sucesso de ${data.total} total.`,
      });

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      clearInterval(interval);
      console.error('Error reanalyzing cards:', error);
      toast({
        title: "Erro na reanálise",
        description: "Ocorreu um erro ao reanalisar os cards. Tente novamente.",
        variant: "destructive"
      });
      setReanalysisProgress(null);
    } finally {
      setReanalyzing(false);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      setSelectedCardIds(new Set());
    }
  };

  const toggleCardSelection = (cardId: string) => {
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

  const selectAllCards = () => {
    setSelectedCardIds(new Set(filteredCards.map(c => c.id)));
  };

  const selectColumnCards = (columnId: string) => {
    const columnCards = filteredCards.filter(c => c.columnId === columnId);
    setSelectedCardIds(prev => {
      const newSet = new Set(prev);
      const allSelected = columnCards.length > 0 && columnCards.every(card => newSet.has(card.id));
      
      if (allSelected) {
        columnCards.forEach(card => newSet.delete(card.id));
      } else {
        columnCards.forEach(card => newSet.add(card.id));
      }
      
      return newSet;
    });
  };

  const handleRestore = async (ids: string[]) => {
    const success = await restoreCards(ids);
    if (success) {
      refreshCards();
      toast({
        title: 'Cards restaurados',
        description: `${ids.length} cards foram recuperados com sucesso.`,
      });
    }
  };

  const handleBulkDelete = async () => {
    const idsToDelete = Array.from(selectedCardIds);
    const success = await deleteCards(idsToDelete);
    
    if (success) {
      setSelectedCardIds(new Set());
      setSelectionMode(false);
      refreshCards();

      toast({
        title: "Cards movidos para lixeira",
        description: `${idsToDelete.length} cards foram removidos.`,
        action: (
          <ToastAction altText="Desfazer" onClick={() => handleRestore(idsToDelete)}>
            Desfazer
          </ToastAction>
        ),
        duration: 5000,
      });
    }
  };

  const handleBulkTransfer = async (columnId: string) => {
    const success = await bulkUpdateCardColumn(Array.from(selectedCardIds), columnId);
    if (success) {
      setSelectedCardIds(new Set());
      setSelectionMode(false);
      refreshCards();
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    if (selectionMode) return;
    const { active } = event;
    const card = cards.find((c) => c.id === active.id);
    setActiveCard(card || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) return;

    const activeCardData = cards.find((c) => c.id === active.id);
    if (!activeCardData) return;

    const overColumnId = over.id as string;
    
    const targetColumn = pipeline?.columns.find(col => col.id === overColumnId);
    if (targetColumn?.name === 'Finalizados') {
      setCardToComplete(active.id as string);
      setCompletionDialogOpen(true);
      return;
    }
    
    if (activeCardData.columnId !== overColumnId) {
      await updateCardColumn(active.id as string, overColumnId);
    }
  };

  const getColumnCards = (columnId: string) => {
    return filteredCards.filter((card) => card.columnId === columnId);
  };

  if (workspaceLoading || loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-background via-background to-primary/5 overflow-hidden">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/30 backdrop-blur-xl shrink-0 z-20 relative">
        <div className={cn("w-full py-4", isMobile ? "px-3" : "px-6")}>
          <div className={cn("gap-3", isMobile ? "flex flex-col" : "flex items-center justify-between")}>
            <div className="flex items-center justify-between w-full md:w-auto">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className={cn("font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent", isMobile ? "text-xl" : "text-2xl")}>
                    Kanban Board
                  </h1>
                  {workspace && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {workspace.name}
                    </Badge>
                  )}
                  {isChatwootFrame && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      Chatwoot
                    </Badge>
                  )}
                </div>
                <p className={cn("text-muted-foreground", isMobile ? "text-xs" : "text-xs")}>Gestão visual de leads e oportunidades</p>
              </div>
              
              {isMobile && pipeline && (
                <DeletedCardsSheet 
                  pipelineId={pipeline.id}
                  onRestore={refreshCards}
                />
              )}
            </div>

            <div className={cn("flex items-center", isMobile ? "flex-col gap-2 w-full" : "gap-2")}>
              {!selectionMode ? (
                <>
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <Button
                      onClick={toggleSelectionMode}
                      variant="outline"
                      size={isMobile ? "default" : "sm"}
                      className={cn("gap-2 flex-1 md:flex-none")}
                    >
                      <CheckSquare className={cn(isMobile ? "w-5 h-5" : "w-4 h-4")} />
                      {isMobile ? "Seleção" : "Modo Seleção"}
                    </Button>
                    
                    {!isMobile && pipeline && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <DeletedCardsSheet 
                              pipelineId={pipeline.id}
                              onRestore={refreshCards}
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Lixeira: Ver itens excluídos</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>

                  <Button
                    onClick={handleReanalyzeAll}
                    disabled={reanalyzing || !pipeline || cards.length === 0}
                    variant="outline"
                    size={isMobile ? "default" : "sm"}
                    className={cn("gap-2", isMobile && "w-full")}
                  >
                    <RefreshCw className={cn(isMobile ? "w-5 h-5" : "w-4 h-4", reanalyzing && 'animate-spin')} />
                    {reanalyzing ? (isMobile ? 'Reanalisando...' : 'Reanalisar') : 'Reanalisar'}
                  </Button>
                  {reanalysisProgress && !isMobile && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-medium">
                        {reanalysisProgress.current}/{reanalysisProgress.total}
                      </span>
                      <span className="text-xs">
                        ({Math.round((reanalysisProgress.current / reanalysisProgress.total) * 100)}%)
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className={cn(
                  "flex items-center rounded-lg bg-muted/30 border",
                  isMobile ? "flex-col gap-2 w-full p-3" : "gap-2 p-2"
                )}>
                  <div className={cn("flex items-center", isMobile ? "justify-between w-full" : "gap-2")}>
                    <Badge variant="secondary" className={cn("px-3", isMobile && "py-1.5 text-sm")}>
                      {selectedCardIds.size} selecionado(s)
                    </Badge>
                    {!isMobile && (
                      <>
                        <Button
                          onClick={selectAllCards}
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                        >
                          Todos (Filtrados)
                        </Button>
                        <Separator orientation="vertical" className="h-6" />
                      </>
                    )}
                    <Button
                      onClick={toggleSelectionMode}
                      variant="ghost"
                      size="sm"
                      className={cn(isMobile ? "h-8" : "h-7")}
                    >
                      <X className={cn(isMobile ? "w-5 h-5" : "w-4 h-4")} />
                    </Button>
                  </div>
                  {isMobile && (
                    <Button
                      onClick={selectAllCards}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <CheckSquare className="w-4 h-4 mr-2" />
                      Todos (Filtrados)
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar - Fixed */}
      <div className={cn("shrink-0 z-10 bg-background/50 backdrop-blur-sm border-b border-border/10 relative", isMobile ? "px-3 py-3" : "px-6 py-3")}>
         <KanbanFilters
            filters={filters}
            sortBy={sortBy}
            setSortBy={setSortBy}
            updateFilter={updateFilter}
            updateCustomFieldFilter={updateCustomFieldFilter}
            resetFilters={resetFilters}
            activeFiltersCount={activeFiltersCount}
            totalCards={cards.length}
            filteredCount={filteredCards.length}
            cards={cards}
            savedViews={savedViews}
            saveView={saveView}
            loadView={loadView}
            deleteView={deleteView}
          />

          {selectionMode && selectedCardIds.size > 0 && (
            <div className="mt-2">
              <BulkActionsBar
                selectedCount={selectedCardIds.size}
                onCancel={() => {
                  setSelectedCardIds(new Set());
                  setSelectionMode(false);
                }}
                onDelete={handleBulkDelete}
                onTransfer={handleBulkTransfer}
                columns={pipeline?.columns || []}
              />
            </div>
          )}
          
          {/* Indicador de contexto do Chatwoot - MELHORADO */}
          {isChatwootFrame && (
            <Alert className="mt-2">
              <MessageSquare className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {context ? '✅ Conectado ao Chatwoot' : '⚠️ Aguardando contexto do Chatwoot'}
                    </p>
                    {context && (
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {agentName && <span>Agente: <strong>{agentName}</strong></span>}
                        {appType === 'conversation_sidebar' && conversationId && <span>Conversa: <strong>#{conversationId}</strong></span>}
                        {appType === 'contact_sidebar' && (contactName || contactEmail || contactPhone) && (
                          <span>Contato: <strong>{contactName || contactEmail || contactPhone}</strong></span>
                        )}
                        {filteredCards.length > 0 && (
                          <span className="text-primary font-medium">
                            {filteredCards.length} card(s) {appType === 'conversation_sidebar' ? 'desta conversa' : 'deste contato'}
                          </span>
                        )}
                      </div>
                    )}
                    {!context && (
                      <p className="text-xs text-muted-foreground">
                        Verifique o console (F12) para logs de debug
                      </p>
                    )}
                  </div>
                  {!context && (
                    <AlertCircle className="h-5 w-5 text-yellow-500 animate-pulse" />
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
      </div>

      {/* Kanban Board Area */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className={cn(
          "flex-1 overflow-auto",
          isMobile ? "px-3 pb-20 pt-4" : "px-6 pb-6 pt-4"
        )}>
          <div className="inline-flex min-w-full justify-center items-start">
            <div className={cn(
                "flex gap-4",
                isMobile && "flex-col w-full"
            )}>
              {pipeline?.columns.map((column) => {
                const columnCards = getColumnCards(column.id);
                const columnTotalValue = columnCards.reduce((sum, card) => sum + (card.value || 0), 0);

                return (
                  <KanbanColumn
                    key={column.id}
                    id={column.id}
                    title={column.name}
                    cards={columnCards}
                    count={columnCards.length}
                    totalValue={columnTotalValue}
                    onCardClick={(cardId) => !selectionMode && setSelectedCardId(cardId)}
                    pipelineConfig={pipelineConfig}
                    selectionMode={selectionMode}
                    selectedCardIds={selectedCardIds}
                    onSelectCard={toggleCardSelection}
                    onSelectAllColumn={selectColumnCards}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <DragOverlay>
          {activeCard && !selectionMode ? <KanbanCard {...activeCard} /> : null}
        </DragOverlay>
      </DndContext>

      <CardDetailDialog
        cardId={selectedCardId}
        open={selectedCardId !== null}
        onOpenChange={(open) => !open && setSelectedCardId(null)}
        pipelineConfig={pipelineConfig}
      />

      {completionDialogOpen && cardToComplete && pipeline && (
        <CardCompletionDialog
          cardId={cardToComplete}
          pipelineId={pipeline.id}
          open={completionDialogOpen}
          onOpenChange={setCompletionDialogOpen}
          onCompleted={() => {
            refreshCards();
            setCardToComplete(null);
          }}
        />
      )}
    </div>
  );
};

export default KanbanBoard;