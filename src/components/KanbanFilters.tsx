import { useState } from 'react';
import { Search, SlidersHorizontal, Save, X, User, TrendingUp, Package, Lock, Clock, DollarSign } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { KanbanFilters as KanbanFiltersType, SortOption, QuickFilter } from '@/types/kanbanFilters';
import { Card } from '@/hooks/useKanbanData';
import { cn } from '@/lib/utils';

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
  deleteView,
}: KanbanFiltersProps) => {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const isMobile = useIsMobile();

  // Extract unique values for filters
  const uniqueValues = {
    priorities: Array.from(new Set(cards.map(c => c.priority).filter(Boolean))),
    assignees: Array.from(new Set(cards.map(c => c.assignee).filter(Boolean))),
    funnelTypes: Array.from(new Set(cards.map(c => c.funnelType).filter(Boolean))),
    products: Array.from(new Set(cards.map(c => c.productItem).filter(Boolean))),
    inboxes: Array.from(new Set(cards.map(c => c.inboxName).filter(Boolean))),
    lifecycleStages: Array.from(new Set(cards.map(c => c.currentLifecycleStage).filter(Boolean))),
  };

  const quickFilters: QuickFilter[] = [
    {
      id: 'monetary-locked',
      label: 'Monetárias 🔒',
      icon: Lock,
      apply: () => ({ isMonetaryLocked: true }),
    },
    {
      id: 'closing',
      label: 'Em Fechamento',
      icon: TrendingUp,
      apply: () => ({ progressRange: { min: 70, max: 100 } }),
    },
    {
      id: 'stagnant',
      label: 'Estagnadas',
      icon: Clock,
      apply: () => ({ inactivityDays: 7 }),
    },
    {
      id: 'unassigned',
      label: 'Sem Atendente',
      icon: User,
      apply: () => ({ isUnassigned: true }),
    },
    {
      id: 'high-value',
      label: 'Alto Valor',
      icon: DollarSign,
      apply: () => ({ valueRange: { min: 5000, max: Infinity } }),
    },
  ];

  const handleQuickFilter = (filter: QuickFilter) => {
    const newFilters = filter.apply(filters);
    Object.entries(newFilters).forEach(([key, value]) => {
      updateFilter(key as keyof KanbanFiltersType, value);
    });
  };

  const handleSaveView = () => {
    if (newViewName.trim()) {
      saveView(newViewName.trim());
      setNewViewName('');
      setShowSaveDialog(false);
    }
  };

  const toggleArrayFilter = <K extends keyof KanbanFiltersType>(
    key: K,
    value: string
  ) => {
    const currentValues = filters[key] as string[];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    updateFilter(key, newValues as KanbanFiltersType[K]);
  };

  return (
    <div className={cn("space-y-3 mb-4", isMobile && "px-1")}>
      {/* Search and Main Actions */}
      <div className={cn("flex gap-2 items-center", isMobile ? "flex-col" : "flex-wrap")}>
        <div className={cn("relative", isMobile ? "w-full" : "flex-1 min-w-[200px]")}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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

          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className={cn(
                  isMobile && "flex-1 h-10 px-3",
                  !isMobile && "h-9"
                )}
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filtros
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-2">{activeFiltersCount}</Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[420px] max-h-[650px] overflow-y-auto" align="end">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between sticky top-0 bg-background pb-2 border-b z-10">
                  <h3 className="font-semibold">Filtros Avançados</h3>
                  {activeFiltersCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={resetFilters}>
                      Limpar ({activeFiltersCount})
                    </Button>
                  )}
                </div>

                {/* Seção 1: Intenções & Progresso */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-primary">🎯 Intenções & Progresso</Label>
                  
                  {/* Tipo de Funil */}
                  {uniqueValues.funnelTypes.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs">Tipo de Funil</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {uniqueValues.funnelTypes.map(type => (
                          <Button
                            key={type}
                            variant={filters.funnelType.includes(type) ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleArrayFilter('funnelType', type)}
                            className="justify-start text-xs h-8"
                          >
                            {type}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Etapa do Ciclo de Vida */}
                  {uniqueValues.lifecycleStages.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs">Etapa Atual</Label>
                      <Select
                        value={filters.lifecycleStages[0] || ''}
                        onValueChange={(value) => updateFilter('lifecycleStages', value ? [value] : [])}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todas as etapas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Todas</SelectItem>
                          {uniqueValues.lifecycleStages.map(stage => (
                            <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Progresso do Ciclo */}
                  <div className="space-y-2">
                    <Label className="text-xs">% de Progresso</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        variant={filters.progressRange?.min === 0 && filters.progressRange?.max === 30 ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateFilter('progressRange', { min: 0, max: 30 })}
                        className="text-xs h-8"
                      >
                        0-30%
                      </Button>
                      <Button
                        variant={filters.progressRange?.min === 31 && filters.progressRange?.max === 70 ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateFilter('progressRange', { min: 31, max: 70 })}
                        className="text-xs h-8"
                      >
                        31-70%
                      </Button>
                      <Button
                        variant={filters.progressRange?.min === 71 && filters.progressRange?.max === 100 ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateFilter('progressRange', { min: 71, max: 100 })}
                        className="text-xs h-8"
                      >
                        71-100%
                      </Button>
                    </div>
                  </div>

                  {/* Monetária Travada */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="monetary"
                      checked={filters.isMonetaryLocked || false}
                      onCheckedChange={(checked) => updateFilter('isMonetaryLocked', checked as boolean)}
                    />
                    <label htmlFor="monetary" className="text-sm cursor-pointer flex items-center gap-1">
                      <Lock className="h-3 w-3 text-red-500" />
                      Apenas intenções monetárias travadas
                    </label>
                  </div>
                </div>

                <Separator />

                {/* Seção 2: Atendimento */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-primary">👤 Atendimento</Label>
                  
                  {/* Prioridade */}
                  {uniqueValues.priorities.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs">Prioridade</Label>
                      <div className="flex gap-2">
                        {uniqueValues.priorities.map(p => (
                          <Button
                            key={p}
                            variant={filters.priority.includes(p) ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleArrayFilter('priority', p)}
                            className="text-xs h-8"
                          >
                            {p === 'high' ? '🔴 Alta' : p === 'medium' ? '🟡 Média' : '🟢 Baixa'}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Atendente */}
                  {uniqueValues.assignees.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs">Atendente</Label>
                      <Select
                        value={filters.assignee[0] || ''}
                        onValueChange={(value) => updateFilter('assignee', value ? [value] : [])}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Todos</SelectItem>
                          {uniqueValues.assignees.map(a => (
                            <SelectItem key={a} value={a}>{a}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="unassigned"
                      checked={filters.isUnassigned || false}
                      onCheckedChange={(checked) => updateFilter('isUnassigned', checked as boolean)}
                    />
                    <label htmlFor="unassigned" className="text-sm cursor-pointer">
                      Sem atendente atribuído
                    </label>
                  </div>
                </div>

                <Separator />

                {/* Seção 3: Negócio */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-primary">💰 Negócio</Label>
                  
                  {/* Valor */}
                  <div className="space-y-2">
                    <Label className="text-xs">Faixa de Valor (R$)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Mín"
                        value={filters.valueRange?.min || ''}
                        onChange={(e) => updateFilter('valueRange', {
                          min: Number(e.target.value) || 0,
                          max: filters.valueRange?.max || Infinity
                        })}
                      />
                      <Input
                        type="number"
                        placeholder="Máx"
                        value={filters.valueRange?.max === Infinity ? '' : filters.valueRange?.max || ''}
                        onChange={(e) => updateFilter('valueRange', {
                          min: filters.valueRange?.min || 0,
                          max: Number(e.target.value) || Infinity
                        })}
                      />
                    </div>
                  </div>

                  {/* Produto */}
                  {uniqueValues.products.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs">Produto/Serviço</Label>
                      <Select
                        value={filters.productItem[0] || ''}
                        onValueChange={(value) => updateFilter('productItem', value ? [value] : [])}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Todos</SelectItem>
                          {uniqueValues.products.map(p => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="returning"
                      checked={filters.isReturningCustomer || false}
                      onCheckedChange={(checked) => updateFilter('isReturningCustomer', checked as boolean)}
                    />
                    <label htmlFor="returning" className="text-sm cursor-pointer">
                      Cliente recorrente
                    </label>
                  </div>
                </div>

                <Separator />

                {/* Seção 4: Tempo & Atividade */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-primary">⏱️ Tempo & Atividade</Label>
                  
                  {/* Inatividade */}
                  <div className="space-y-2">
                    <Label className="text-xs">Sem atividade há mais de:</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        variant={filters.inactivityDays === 3 ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateFilter('inactivityDays', filters.inactivityDays === 3 ? null : 3)}
                        className="text-xs h-8"
                      >
                        3 dias
                      </Button>
                      <Button
                        variant={filters.inactivityDays === 7 ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateFilter('inactivityDays', filters.inactivityDays === 7 ? null : 7)}
                        className="text-xs h-8"
                      >
                        7 dias
                      </Button>
                      <Button
                        variant={filters.inactivityDays === 14 ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateFilter('inactivityDays', filters.inactivityDays === 14 ? null : 14)}
                        className="text-xs h-8"
                      >
                        14 dias
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
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
      <div className={cn("flex gap-2 items-center", isMobile ? "grid grid-cols-2" : "flex-wrap")}>
        {!isMobile && <span className="text-xs text-muted-foreground">Filtros Rápidos:</span>}
        {quickFilters.map(filter => {
          const Icon = filter.icon;
          return (
            <Button
              key={filter.id}
              variant="outline"
              size="sm"
              onClick={() => handleQuickFilter(filter)}
              className={cn("h-8", isMobile && "justify-start text-xs")}
            >
              <Icon className="h-3 w-3 mr-1" />
              {filter.label}
            </Button>
          );
        })}
      </div>

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Filtros ativos:</span>
          {filters.priority.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              Prioridade: {filters.priority.join(', ')}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter('priority', [])}
              />
            </Badge>
          )}
          {filters.assignee.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              Atendente: {filters.assignee.length}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter('assignee', [])}
              />
            </Badge>
          )}
          {filters.funnelType.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              Funil: {filters.funnelType.length}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter('funnelType', [])}
              />
            </Badge>
          )}
          {filters.isUnassigned && (
            <Badge variant="secondary" className="gap-1">
              Sem atendente
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter('isUnassigned', null)}
              />
            </Badge>
          )}
          {filters.valueRange && (
            <Badge variant="secondary" className="gap-1">
              Valor: R$ {filters.valueRange.min} - {filters.valueRange.max === Infinity ? '∞' : filters.valueRange.max}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter('valueRange', null)}
              />
            </Badge>
          )}
        </div>
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