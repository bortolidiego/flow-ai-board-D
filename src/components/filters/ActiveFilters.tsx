import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { KanbanFilters as KanbanFiltersType } from '@/types/kanbanFilters';

interface ActiveFiltersProps {
  filters: KanbanFiltersType;
  updateFilter: <K extends keyof KanbanFiltersType>(key: K, value: KanbanFiltersType[K]) => void;
}

export function ActiveFilters({ filters, updateFilter }: ActiveFiltersProps) {
  return (
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
  );
}