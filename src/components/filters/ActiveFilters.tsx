import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { KanbanFilters } from '@/types/kanbanFilters';

interface ActiveFiltersProps {
  filters: KanbanFilters;
  updateFilter: <K extends keyof KanbanFilters>(key: K, value: KanbanFilters[K]) => void;
}

export function ActiveFilters({ filters, updateFilter }: ActiveFiltersProps) {
  // Helper to check if a filter is active
  const hasFilters = 
    filters.assignee.length > 0 ||
    filters.funnelType.length > 0 ||
    filters.productItem.length > 0 ||
    filters.isUnassigned ||
    filters.funnelScoreRange ||
    filters.qualityScoreRange ||
    filters.valueRange ||
    filters.lostReasons.length > 0 ||
    filters.isMonetaryLocked;

  if (!hasFilters) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-muted-foreground">Filtros ativos:</span>
      
      {filters.assignee.length > 0 && (
        <Badge variant="secondary" className="gap-1">
          Agentes: {filters.assignee.length}
          <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter('assignee', [])} />
        </Badge>
      )}

      {filters.funnelType.length > 0 && (
        <Badge variant="secondary" className="gap-1">
          Funil: {filters.funnelType.length}
          <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter('funnelType', [])} />
        </Badge>
      )}

      {filters.productItem.length > 0 && (
        <Badge variant="secondary" className="gap-1">
          Produtos: {filters.productItem.length}
          <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter('productItem', [])} />
        </Badge>
      )}

      {filters.isUnassigned && (
        <Badge variant="secondary" className="gap-1">
          Sem responsável
          <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter('isUnassigned', null)} />
        </Badge>
      )}

      {filters.funnelScoreRange && (
        <Badge variant="secondary" className="gap-1">
          Chance: {filters.funnelScoreRange.min}-{filters.funnelScoreRange.max}%
          <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter('funnelScoreRange', null)} />
        </Badge>
      )}

      {filters.qualityScoreRange && (
        <Badge variant="secondary" className="gap-1">
          Qualidade: {filters.qualityScoreRange.min}-{filters.qualityScoreRange.max}%
          <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter('qualityScoreRange', null)} />
        </Badge>
      )}
      
      {filters.valueRange && (
        <Badge variant="secondary" className="gap-1">
          Valor: {filters.valueRange.min}-{filters.valueRange.max}
          <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter('valueRange', null)} />
        </Badge>
      )}
      
      {filters.lostReasons.length > 0 && (
        <Badge variant="secondary" className="gap-1">
          Motivos Perda: {filters.lostReasons.length}
          <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter('lostReasons', [])} />
        </Badge>
      )}
      
      {filters.isMonetaryLocked && (
        <Badge variant="secondary" className="gap-1">
          Travado (Monetário)
          <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter('isMonetaryLocked', null)} />
        </Badge>
      )}
    </div>
  );
}