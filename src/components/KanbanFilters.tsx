import { useState, useMemo } from 'react';
import { Search, Filter, Save, Plus } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { KanbanFilters as KanbanFiltersType, SortOption } from '@/types/kanbanFilters';
import { Card } from '@/hooks/useKanbanData';
import { cn } from '@/lib/utils';
import { AdvancedFiltersContent } from './filters/AdvancedFiltersContent';
import { QuickFilterBar } from './filters/QuickFilterBar';

interface KanbanFiltersProps {
  filters: KanbanFiltersType;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  updateFilter: <K extends keyof KanbanFiltersType>(key: K, value: KanbanFiltersType[K]) => void;
  updateCustomFieldFilter: (field: string, value: any) => void; // Adicionado
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
  // setSortBy, // Pode ser reativado se precisar de ordenação na UI principal
  updateFilter,
  updateCustomFieldFilter,
  resetFilters,
  activeFiltersCount,
  totalCards,
  filteredCount,
  cards,
  savedViews,
  saveView,
  loadView,
  deleteView,
}: KanbanFiltersProps) => {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [newFilterName, setNewFilterName] = useState('');
  const isMobile = useIsMobile();

  // Extract unique values for filters safely
  const uniqueValues = useMemo(() => {
    const assignees = new Set<string>();
    const funnelTypes = new Set<string>();
    const products = new Set<string>();
    const lostReasons = new Set<string>();
    const lifecycleStages = new Set<string>();
    const customFieldKeys = new Set<string>();

    cards.forEach(c => {
      if (c.assignee) assignees.add(c.assignee);
      if (c.chatwootAgentName) assignees.add(c.chatwootAgentName);
      if (c.funnelType) funnelTypes.add(c.funnelType);
      if (c.productItem) products.add(c.productItem);
      if (c.lossReason) lostReasons.add(c.lossReason);
      if (c.currentLifecycleStage) lifecycleStages.add(c.currentLifecycleStage);
      
      if (c.customFieldsData) {
        Object.keys(c.customFieldsData).forEach(k => customFieldKeys.add(k));
      }
    });

    return {
      assignees: Array.from(assignees),
      funnelTypes: Array.from(funnelTypes),
      products: Array.from(products),
      lostReasons: Array.from(lostReasons),
      lifecycleStages: Array.from(lifecycleStages),
      customFields: Array.from(customFieldKeys)
    };
  }, [cards]);

  const handleSaveFilter = () => {
    if (newFilterName.trim()) {
      saveView(newFilterName.trim());
      setNewFilterName('');
    }
  };

  return (
    <div className={cn("flex flex-col gap-3 mb-4", isMobile && "px-1")}>
      
      {/* Top Bar: Search + Filter Button + Save Action */}
      <div className="flex items-center gap-2 w-full">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por nome, título..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-9 h-9 bg-background/60 backdrop-blur-sm"
          />
        </div>

        {/* Filter Toggle Button */}
        <Popover open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant={activeFiltersCount > 0 ? "secondary" : "outline"} 
              size="sm"
              className={cn("h-9 px-3", activeFiltersCount > 0 && "border-primary/50 bg-primary/10 text-primary")}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros
              {activeFiltersCount > 0 && (
                <Badge variant="primary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-[340px] sm:w-[400px] p-0 overflow-hidden" 
            align="end" 
            sideOffset={8}
          >
            <div className="p-4 bg-muted/10 border-b">
              <h4 className="font-semibold text-sm">Configurar Filtros</h4>
            </div>
            <div className="p-2">
              <AdvancedFiltersContent
                filters={filters}
                updateFilter={updateFilter}
                updateCustomFieldFilter={updateCustomFieldFilter}
                resetFilters={resetFilters}
                uniqueValues={uniqueValues}
              />
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Quick Filters (Saved Views) Row */}
      <div className="flex items-center justify-between gap-4 min-h-[32px]">
        <QuickFilterBar 
          savedViews={savedViews}
          loadView={loadView}
          deleteView={deleteView}
          isMobile={isMobile}
        />

        {/* Save Current View Input (Minimalist) */}
        {activeFiltersCount > 0 && (
          <div className="flex items-center gap-2 flex-shrink-0 animate-in fade-in duration-300">
             <Input 
               placeholder="Nome do filtro..." 
               className="h-7 w-[120px] text-xs bg-transparent border-dashed hover:border-solid transition-all"
               value={newFilterName}
               onChange={(e) => setNewFilterName(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && handleSaveFilter()}
             />
             <Button 
               size="sm" 
               variant="ghost" 
               className="h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary"
               onClick={handleSaveFilter}
               disabled={!newFilterName.trim()}
             >
               <Plus className="h-4 w-4" />
             </Button>
          </div>
        )}
      </div>

      {/* Result Counter (Subtle) */}
      <div className="flex justify-end">
         <span className="text-[10px] text-muted-foreground">
            Mostrando {filteredCount} de {totalCards} cards
         </span>
      </div>

    </div>
  );
};