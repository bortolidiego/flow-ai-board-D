import { Button } from '@/components/ui/button';
import { KanbanFilters as KanbanFiltersType, QuickFilter } from '@/types/kanbanFilters';
import { User, TrendingUp, Lock, Clock, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickFilterBarProps {
  updateFilter: <K extends keyof KanbanFiltersType>(key: K, value: KanbanFiltersType[K]) => void;
  isMobile: boolean;
}

export function QuickFilterBar({ updateFilter, isMobile }: QuickFilterBarProps) {
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
    const newFilters = filter.apply({} as any);
    Object.entries(newFilters).forEach(([key, value]) => {
      // @ts-ignore
      updateFilter(key, value);
    });
  };

  return (
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
  );
}