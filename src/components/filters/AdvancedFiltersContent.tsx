import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Lock } from 'lucide-react';
import { KanbanFilters as KanbanFiltersType } from '@/types/kanbanFilters';

interface AdvancedFiltersContentProps {
  filters: KanbanFiltersType;
  updateFilter: <K extends keyof KanbanFiltersType>(key: K, value: KanbanFiltersType[K]) => void;
  resetFilters: () => void;
  activeFiltersCount: number;
  uniqueValues: {
    priorities: string[];
    assignees: string[];
    funnelTypes: string[];
    products: string[];
    inboxes: string[];
    lifecycleStages: string[];
  };
}

export function AdvancedFiltersContent({
  filters,
  updateFilter,
  resetFilters,
  activeFiltersCount,
  uniqueValues,
}: AdvancedFiltersContentProps) {
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
              value={filters.lifecycleStages[0] || 'all'}
              onValueChange={(value) => updateFilter('lifecycleStages', value === 'all' ? [] : [value])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas as etapas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
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
              value={filters.assignee[0] || 'all'}
              onValueChange={(value) => updateFilter('assignee', value === 'all' ? [] : [value])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
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
              value={filters.productItem[0] || 'all'}
              onValueChange={(value) => updateFilter('productItem', value === 'all' ? [] : [value])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
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
  );
}