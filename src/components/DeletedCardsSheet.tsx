import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, RefreshCw, Search, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';

interface DeletedCard {
  id: string;
  title: string;
  deleted_at: string;
  column_id: string;
  columns: { name: string };
}

interface DeletedCardsSheetProps {
  pipelineId: string;
  onRestore: () => void;
}

export function DeletedCardsSheet({ pipelineId, onRestore }: DeletedCardsSheetProps) {
  const [open, setOpen] = useState(false);
  const [cards, setCards] = useState<DeletedCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const { toast } = useToast();

  const fetchDeletedCards = async () => {
    if (!pipelineId) return;
    
    setLoading(true);
    try {
      // Buscar cards deletados do pipeline atual
      // Precisamos fazer um join com columns -> pipelines para filtrar pelo pipelineId
      const { data, error } = await supabase
        .from('cards')
        .select(`
          id, 
          title, 
          deleted_at, 
          column_id,
          columns!inner (
            name,
            pipeline_id
          )
        `)
        .not('deleted_at', 'is', null)
        .eq('columns.pipeline_id', pipelineId)
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      setCards(data as any[] || []);
    } catch (error) {
      console.error('Error fetching deleted cards:', error);
      toast({
        title: 'Erro ao carregar lixeira',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchDeletedCards();
      setSelectedIds(new Set());
      setSearch('');
    }
  }, [open, pipelineId]);

  const handleRestore = async () => {
    if (selectedIds.size === 0) return;

    setLoading(true);
    try {
      const { error } = await supabase.rpc('restore_cards_bulk', {
        card_ids: Array.from(selectedIds)
      });

      if (error) throw error;

      toast({
        title: 'Cards restaurados com sucesso',
        description: `${selectedIds.size} cards voltaram para o quadro.`
      });

      onRestore(); // Atualiza o Kanban
      fetchDeletedCards(); // Atualiza a lista local
      setSelectedIds(new Set());
    } catch (error: any) {
      toast({
        title: 'Erro ao restaurar',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCards.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCards.map(c => c.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const filteredCards = cards.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
          <Trash2 className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] flex flex-col h-full">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Lixeira
          </SheetTitle>
          <SheetDescription>
            Visualize e restaure cards que foram excluídos.
          </SheetDescription>
        </SheetHeader>

        <div className="py-4 space-y-4 flex-1 flex flex-col min-h-0">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar card..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground border-b pb-2">
            <div className="flex items-center gap-2">
              <Checkbox 
                checked={filteredCards.length > 0 && selectedIds.size === filteredCards.length}
                onCheckedChange={toggleSelectAll}
                disabled={filteredCards.length === 0}
              />
              <span>{selectedIds.size} selecionado(s)</span>
            </div>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>

          <ScrollArea className="flex-1 -mx-6 px-6">
            {filteredCards.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm">
                {loading ? (
                  <span>Carregando...</span>
                ) : (
                  <>
                    <AlertCircle className="h-8 w-8 mb-2 opacity-20" />
                    <p>Nenhum card encontrado na lixeira.</p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-2 pb-4">
                {filteredCards.map(card => (
                  <div 
                    key={card.id} 
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors group"
                  >
                    <Checkbox 
                      checked={selectedIds.has(card.id)}
                      onCheckedChange={() => toggleSelect(card.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="font-medium truncate text-sm">{card.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-5 font-normal">
                          {card.columns?.name}
                        </Badge>
                        <span>
                          Excluído em {format(new Date(card.deleted_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <div className="pt-4 border-t mt-auto">
          <Button 
            className="w-full gap-2" 
            disabled={selectedIds.size === 0 || loading}
            onClick={handleRestore}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Restaurar Selecionados
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}