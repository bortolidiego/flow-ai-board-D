import { useState, useEffect, useMemo } from 'react';
import { KanbanFilters, SortOption, SavedView } from '@/types/kanbanFilters';
import { Card, Pipeline, PipelineConfig } from '@/hooks/useKanbanData';
import { useToast } from '@/hooks/use-toast';
import { calculateSLA } from './useSLA';

const STORAGE_KEY = 'kanban-filters-v2'; // Changed key to reset old incompatible filters
const VIEWS_STORAGE_KEY = 'kanban-saved-views-v2';

const defaultFilters: KanbanFilters = {
  search: '',
  assignee: [],
  funnelType: [],
  lifecycleStages: [],
  funnelScoreRange: null,
  qualityScoreRange: null,
  valueRange: null,
  productItem: [],
  lostReasons: [],
  resolutionStatus: [],
  slaStatus: [], // Inicializando novo filtro
  inactivityDays: null,
  dateRange: { start: null, end: null },
  chatwootConversationId: [],
  customerProfileId: [], // Adicionando campo faltante
  isMonetaryLocked: null,
  isUnassigned: null,
  isReturningCustomer: null,
  customFields: {}
};

export const useKanbanFilters = (cards: Card[], pipeline?: Pipeline | null, pipelineConfig?: PipelineConfig | null) => {
  const { toast } = useToast();

  const [filters, setFilters] = useState<KanbanFilters>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...defaultFilters, ...parsed };
      } catch (e) {
        return defaultFilters;
      }
    }
    return defaultFilters;
  });

  const [sortBy, setSortBy] = useState<SortOption>('createdAt-desc');

  const [savedViews, setSavedViews] = useState<SavedView[]>(() => {
    const saved = localStorage.getItem(VIEWS_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    localStorage.setItem(VIEWS_STORAGE_KEY, JSON.stringify(savedViews));
  }, [savedViews]);

  const updateFilter = <K extends keyof KanbanFilters>(
    key: K,
    value: KanbanFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const updateCustomFieldFilter = (fieldName: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      customFields: {
        ...prev.customFields,
        [fieldName]: value
      }
    }));
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  const saveView = (name: string) => {
    const newView: SavedView = {
      id: Date.now().toString(),
      name,
      filters: { ...filters }, // Copy current state
      sortBy,
      createdAt: new Date(),
    };
    setSavedViews(prev => [...prev, newView]);
    toast({ title: "Filtro salvo", description: `"${name}" foi adicionado aos filtros rápidos.` });
  };

  const loadView = (viewId: string) => {
    const view = savedViews.find(v => v.id === viewId);
    if (view) {
      setFilters(view.filters);
      setSortBy(view.sortBy);
      toast({ title: "Filtro aplicado", description: `Visualizando "${view.name}"` });
    }
  };

  const deleteView = (viewId: string) => {
    setSavedViews(prev => prev.filter(v => v.id !== viewId));
    toast({ title: "Filtro removido" });
  };

  const filteredCards = useMemo(() => {
    let result = [...cards];

    // 1. Search
    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(card =>
        card.title?.toLowerCase().includes(search) ||
        card.description?.toLowerCase().includes(search) ||
        card.chatwootContactName?.toLowerCase().includes(search)
      );
    }

    // 2. Agentes (Assignee) - Verifica assignee interno OU agente do chatwoot
    if (filters.assignee.length > 0) {
      result = result.filter(card => {
        const agentName = card.assignee || card.chatwootAgentName;
        return agentName && filters.assignee.includes(agentName);
      });
    }

    // 3. Unassigned
    if (filters.isUnassigned) {
      result = result.filter(card => !card.assignee && !card.chatwootAgentName);
    }

    // 4. Funnel Type & Lifecycle Stages
    if (filters.funnelType.length > 0) {
      result = result.filter(card => card.funnelType && filters.funnelType.includes(card.funnelType));
    }
    if (filters.lifecycleStages.length > 0) {
      result = result.filter(card => card.currentLifecycleStage && filters.lifecycleStages.includes(card.currentLifecycleStage));
    }

    // 5. Ranges (Score & Quality)
    if (filters.funnelScoreRange) {
      result = result.filter(card => {
        const score = card.funnelScore || 0;
        return score >= filters.funnelScoreRange!.min && score <= filters.funnelScoreRange!.max;
      });
    }
    if (filters.qualityScoreRange) {
      result = result.filter(card => {
        const score = card.serviceQualityScore || 0;
        return score >= filters.qualityScoreRange!.min && score <= filters.qualityScoreRange!.max;
      });
    }
    if (filters.valueRange) {
      result = result.filter(card => {
        const val = card.value || 0;
        return val >= filters.valueRange!.min && val <= filters.valueRange!.max;
      });
    }

    // 6. Products
    if (filters.productItem.length > 0) {
      result = result.filter(card => card.productItem && filters.productItem.includes(card.productItem));
    }

    // 7. Lost Reasons
    if (filters.lostReasons.length > 0) {
      result = result.filter(card => card.lossReason && filters.lostReasons.includes(card.lossReason));
    }

    // 8. Boolean Flags
    if (filters.isMonetaryLocked) result = result.filter(card => card.isMonetaryLocked === true);
    if (filters.isReturningCustomer) result = result.filter(card => card.customerProfileId !== null);

    // 9. Custom Fields
    if (Object.keys(filters.customFields).length > 0) {
      result = result.filter(card => {
        return Object.entries(filters.customFields).every(([key, filterVal]) => {
          if (!filterVal) return true;
          const cardVal = card.customFieldsData?.[key];
          // Simple equality check for now, can be expanded to 'contains'
          return String(cardVal).toLowerCase().includes(String(filterVal).toLowerCase());
        });
      });
    }

    // 10. Inactivity
    if (filters.inactivityDays) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - filters.inactivityDays);
      result = result.filter(card => {
        const lastAct = card.lastActivityAt ? new Date(card.lastActivityAt) : new Date(card.createdAt);
        return lastAct < cutoff;
      });
    }

    // 11. Chatwoot Conversation ID
    if (filters.chatwootConversationId.length > 0) {
      result = result.filter(card =>
        card.chatwootConversationId && filters.chatwootConversationId.includes(card.chatwootConversationId)
      );
    }

    // 12. Customer Profile ID
    if (filters.customerProfileId.length > 0) {
      result = result.filter(card =>
        card.customerProfileId && filters.customerProfileId.includes(card.customerProfileId)
      );
    }

    // 13. SLA Status (Novo)
    if (filters.slaStatus && filters.slaStatus.length > 0 && pipelineConfig?.slaConfig && pipeline) {
      const columnMap = new Map(pipeline.columns.map(c => [c.id, c.name]));

      result = result.filter(card => {
        const columnName = columnMap.get(card.columnId);
        const sla = calculateSLA({
          createdAt: card.createdAt,
          updatedAt: card.updatedAt,
          lastActivityAt: card.lastActivityAt,
          completionType: card.completionType,
          columnName
        }, pipelineConfig.slaConfig);

        return sla && filters.slaStatus.includes(sla.status);
      });
    }

    // Sorting logic... (mantida igual)
    result.sort((a, b) => {
      switch (sortBy) {
        case 'createdAt-desc': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'createdAt-asc': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'value-desc': return (b.value || 0) - (a.value || 0);
        case 'value-asc': return (a.value || 0) - (b.value || 0);
        case 'progress-desc': return (b.lifecycleProgressPercent || 0) - (a.lifecycleProgressPercent || 0);
        case 'progress-asc': return (a.lifecycleProgressPercent || 0) - (b.lifecycleProgressPercent || 0);
        case 'lastActivity-desc': {
          const tA = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : new Date(a.createdAt).getTime();
          const tB = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : new Date(b.createdAt).getTime();
          return tB - tA;
        }
        case 'lastActivity-asc': {
          const tA = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : new Date(a.createdAt).getTime();
          const tB = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : new Date(b.createdAt).getTime();
          return tA - tB;
        }
        case 'priority-desc': {
          const pMap = { high: 3, medium: 2, low: 1 };
          return (pMap[b.priority] || 0) - (pMap[a.priority] || 0);
        }
        case 'priority-asc': {
          const pMap = { high: 3, medium: 2, low: 1 };
          return (pMap[a.priority] || 0) - (pMap[b.priority] || 0);
        }
        default: return 0;
      }
    });

    return result;
  }, [cards, filters, sortBy, pipeline, pipelineConfig]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.assignee.length) count++;
    if (filters.funnelType.length) count++;
    if (filters.lifecycleStages.length) count++;
    if (filters.funnelScoreRange) count++;
    if (filters.qualityScoreRange) count++;
    if (filters.valueRange) count++;
    if (filters.productItem.length) count++;
    if (filters.lostReasons.length) count++;
    if (filters.isMonetaryLocked) count++;
    if (filters.isUnassigned) count++;
    if (filters.isReturningCustomer) count++;
    if (filters.inactivityDays) count++;
    if (filters.chatwootConversationId.length) count++;
    if (filters.customerProfileId.length) count++; // Adicionando contador para novo filtro
    if (filters.slaStatus && filters.slaStatus.length) count++; // Contador SLA
    count += Object.keys(filters.customFields).length;
    return count;
  }, [filters]);

  return {
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
  };
};