import { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, Save } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { KanbanFilters as KanbanFiltersType, SortOption } from '@/types/kanbanFilters';
import { Card } from '@/hooks/useKanbanData';
import { cn } from '@/lib/utils';
import { AdvancedFiltersContent } from './filters/AdvancedFiltersContent';
import { ActiveFilters } from './filters/ActiveFilters';
import { QuickFilterBar } from './filters/QuickFilterBar';

interface KanbanFiltersProps {
  filters: KanbanFiltersType;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  updateFilter: <K extends keyof KanbanFiltersType>(key: K, value: KanbanFiltersType[K]) => void;
  resetFilters: () => void;
  activeFiltersCount: number;
  totalCards: number;
  filteredCount: number;
  cards: Card[];
  savedViews: any[];
  saveView: (name: string) => void;
  loadView: (id: string) => void;
  deleteView: (id: string) => void;
}

export const KanbanFilters = ({
  filters,
  sortBy,
  setSortBy,
  updateFilter,
  resetFilters,
  activeFiltersCount,
  totalCards,
  filteredCount,
  cards,
  savedViews,
  saveView,
  loadView,
}: KanbanFiltersProps) => {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const isMobile = useIsMobile();

  // Extract unique values for filters
  const uniqueValues = useMemo(() => ({
    priorities: Array.from(new Set(cards.map(c => c.priority).filter(Boolean))),
    assignees: Array.from(new Set(cards.map(c => c.assignee).filter(Boolean))),
    funnelTypes: Array.from(new Set(cards.map(c => c.funnelType).filter(Boolean))),
    products: Array.from(new Set(cards.map(c => c.productItem).filter(Boolean))),
    inboxes: Array.from(new Set(cards.map(c => c.inboxName).filter(Boolean))),
    lifecycleStages: Array.from(new Set(cards.map(c => c.currentLifecycleStage).filter(Boolean))),
  }), [cards]);

  const handleSaveView = () => {
    if (newViewName.trim()) {
      saveView(newViewName.trim());
      setNewViewName('');
      setShowSaveDialog(false);
    }
  };

  return (
    <div className={cn("space-y-3 mb-4", isMobile && "px-1")}>
      {/* Search and Main Actions */}
      <div className={cn("flex gap-2 items-center", isMobile ? "flex-col" : "flex-wrap")}>
        <div className={cn("relative", isMobile ? "w-full" : "flex-1 min-w-[200px]")}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar cards..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-9"
          />
        </div>

        <div className={cn("flex gap-2", isMobile && "w-full")}>
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
            <SelectTrigger className={cn(isMobile ? "flex-1" : "w-[200px]")}>
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="progress-desc">🔥 Maior Progresso</SelectItem>
              <SelectItem value="lastActivity-desc">⚡ Atividade Recente</SelectItem>
              <SelectItem value="value-desc">💰 Maior Valor</SelectItem>
              <SelectItem value="priority-desc">🔴 Alta Prioridade</SelectItem>
              <SelectItem value="createdAt-desc">🆕 Mais Recentes</SelectItem>
              <Separator />
              <SelectItem value="progress-asc">Menor Progresso</SelectItem>
              <SelectItem value="lastActivity-asc">Menos Ativo</SelectItem>
              <SelectItem value="value-asc">Menor Valor</SelectItem>
              <SelectItem value="createdAt-asc">Mais Antigos</SelectItem>
            </SelectContent>
          </Select>

          <Popover open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                type="button"
                className={cn(isMobile && "flex-1")}
              >
                <SlidersHorizontal className="h-4 w-4 mr-2 pointer-events-none" />
                Filtros
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-2 pointer-events-none">{activeFiltersCount}</Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-[90vw] sm:w-[420px] max-h-[80vh] overflow-y-auto" 
              align="end"
              sideOffset={5}
            >
              <AdvancedFiltersContent
                filters={filters}
                updateFilter={updateFilter}
                resetFilters={resetFilters}
                activeFiltersCount={activeFiltersCount}
                uniqueValues={uniqueValues}
              />
            </PopoverContent>
          </Popover>
        </div>

        {savedViews.length > 0 && (
          <Select onValueChange={loadView}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Visões Salvas" />
            </SelectTrigger>
            <SelectContent>
              {savedViews.map(view => (
                <SelectItem key={view.id} value={view.id}>
                  {view.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Button
          variant="outline"
          size="default"
          onClick={() => setShowSaveDialog(!showSaveDialog)}
        >
          <Save className="h-4 w-4 mr-2" />
          Salvar Visão
        </Button>
      </div>

      {/* Quick Filters */}
      <QuickFilterBar 
        updateFilter={updateFilter}
        isMobile={isMobile}
      />

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <ActiveFilters 
          filters={filters}
          updateFilter={updateFilter}
        />
      )}

      {/* Results Counter */}
      {(!isMobile || activeFiltersCount > 0) && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {filteredCount} de {totalCards} cards
            {activeFiltersCount > 0 && (
              <Button
                variant="link"
                size="sm"
                onClick={resetFilters}
                className="ml-2 h-auto p-0 text-xs"
              >
                Limpar filtros
              </Button>
            )}
          </span>
        </div>
      )}

      {/* Save View Dialog */}
      {showSaveDialog && (
        <div className="flex gap-2 items-center p-3 border rounded-lg bg-muted/50">
          <Input
            placeholder="Nome da visão..."
            value={newViewName}
            onChange={(e) => setNewViewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveView()}
          />
          <Button onClick={handleSaveView} size="sm">
            Salvar
          </Button>
          <Button onClick={() => setShowSaveDialog(false)} variant="ghost" size="sm">
            Cancelar
          </Button>
        </div>
      )}
    </div>
  );
};