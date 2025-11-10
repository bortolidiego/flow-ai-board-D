import { useState, useEffect, useMemo } from 'react';
import { KanbanFilters, SortOption, SavedView } from '@/types/kanbanFilters';
import { Card } from '@/hooks/useKanbanData';

const STORAGE_KEY = 'kanban-filters';
const VIEWS_STORAGE_KEY = 'kanban-saved-views';

  const defaultFilters: KanbanFilters = {
    search: '',
    priority: [],
    assignee: [],
    funnelType: [],
    valueRange: null,
    productItem: [],
    inboxName: [],
    lifecycleStages: [],
    progressRange: null,
    isMonetaryLocked: null,
    resolutionStatus: [],
    inactivityDays: null,
    isUnassigned: null,
    isReturningCustomer: null,
    dateRange: { start: null, end: null },
  };

export const useKanbanFilters = (cards: Card[]) => {
  const [filters, setFilters] = useState<KanbanFilters>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge com defaultFilters para garantir que todas as propriedades existam
        return { ...defaultFilters, ...parsed };
      } catch (e) {
        console.error('Error parsing saved filters:', e);
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
        const parsed = JSON.parse(saved);
        // Atualizar views antigas para ter a estrutura correta
        return parsed.map((view: SavedView) => ({
          ...view,
          filters: { ...defaultFilters, ...view.filters }
        }));
      } catch (e) {
        console.error('Error parsing saved views:', e);
        return [];
      }
    }
    return [];
  });

  // Persist filters
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  }, [filters]);

  // Persist saved views
  useEffect(() => {
    localStorage.setItem(VIEWS_STORAGE_KEY, JSON.stringify(savedViews));
  }, [savedViews]);

  const updateFilter = <K extends keyof KanbanFilters>(
    key: K,
    value: KanbanFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  const saveView = (name: string) => {
    const newView: SavedView = {
      id: Date.now().toString(),
      name,
      filters,
      sortBy,
      createdAt: new Date(),
    };
    setSavedViews(prev => [...prev, newView]);
  };

  const loadView = (viewId: string) => {
    const view = savedViews.find(v => v.id === viewId);
    if (view) {
      setFilters(view.filters);
      setSortBy(view.sortBy);
    }
  };

  const deleteView = (viewId: string) => {
    setSavedViews(prev => prev.filter(v => v.id !== viewId));
  };

  // Apply filters
  const filteredCards = useMemo(() => {
    let result = [...cards];

    // Text search
    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(card => 
        card.title?.toLowerCase().includes(search) ||
        card.description?.toLowerCase().includes(search) ||
        card.chatwootContactName?.toLowerCase().includes(search)
      );
    }

    // Priority
    if (filters.priority.length > 0) {
      result = result.filter(card => 
        card.priority && filters.priority.includes(card.priority)
      );
    }

    // Assignee
    if (filters.assignee.length > 0) {
      result = result.filter(card => 
        card.assignee && filters.assignee.includes(card.assignee)
      );
    }

    // Unassigned
    if (filters.isUnassigned) {
      result = result.filter(card => !card.assignee);
    }

    // Funnel type
    if (filters.funnelType.length > 0) {
      result = result.filter(card => 
        card.funnelType && filters.funnelType.includes(card.funnelType)
      );
    }

    // Lifecycle stage
    if (filters.lifecycleStages.length > 0) {
      result = result.filter(card => 
        card.currentLifecycleStage && filters.lifecycleStages.includes(card.currentLifecycleStage)
      );
    }

    // Progress range
    if (filters.progressRange) {
      result = result.filter(card => {
        const progress = card.lifecycleProgressPercent || 0;
        return progress >= filters.progressRange!.min && progress <= filters.progressRange!.max;
      });
    }

    // Monetary locked
    if (filters.isMonetaryLocked) {
      result = result.filter(card => card.isMonetaryLocked === true);
    }

    // Resolution status
    if (filters.resolutionStatus.length > 0) {
      result = result.filter(card => 
        card.resolutionStatus && filters.resolutionStatus.includes(card.resolutionStatus)
      );
    }

    // Inactivity days
    if (filters.inactivityDays) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - filters.inactivityDays);
      result = result.filter(card => {
        const lastActivity = card.lastActivityAt ? new Date(card.lastActivityAt) : new Date(card.createdAt);
        return lastActivity < cutoffDate;
      });
    }

    // Value range
    if (filters.valueRange) {
      result = result.filter(card => {
        const value = card.value || 0;
        return value >= filters.valueRange!.min && value <= filters.valueRange!.max;
      });
    }

    // Product item
    if (filters.productItem.length > 0) {
      result = result.filter(card => 
        card.productItem && filters.productItem.includes(card.productItem)
      );
    }

    // Inbox name
    if (filters.inboxName.length > 0) {
      result = result.filter(card => 
        card.inboxName && filters.inboxName.includes(card.inboxName)
      );
    }

    // Returning customer
    if (filters.isReturningCustomer) {
      result = result.filter(card => card.customerProfileId !== null);
    }

    // Date range
    if (filters.dateRange.start || filters.dateRange.end) {
      result = result.filter(card => {
        const cardDate = new Date(card.createdAt);
        if (filters.dateRange.start && cardDate < filters.dateRange.start) return false;
        if (filters.dateRange.end && cardDate > filters.dateRange.end) return false;
        return true;
      });
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'createdAt-desc':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'createdAt-asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'value-desc':
          return (b.value || 0) - (a.value || 0);
        case 'value-asc':
          return (a.value || 0) - (b.value || 0);
        case 'progress-desc':
          return (b.lifecycleProgressPercent || 0) - (a.lifecycleProgressPercent || 0);
        case 'progress-asc':
          return (a.lifecycleProgressPercent || 0) - (b.lifecycleProgressPercent || 0);
        case 'lastActivity-desc':
          return new Date(b.lastActivityAt || b.createdAt).getTime() - 
                 new Date(a.lastActivityAt || a.createdAt).getTime();
        case 'lastActivity-asc':
          return new Date(a.lastActivityAt || a.createdAt).getTime() - 
                 new Date(b.lastActivityAt || b.createdAt).getTime();
        case 'priority-desc':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - 
                 (priorityOrder[a.priority as keyof typeof priorityOrder] || 0);
        case 'priority-asc':
          const priorityOrderAsc = { high: 3, medium: 2, low: 1 };
          return (priorityOrderAsc[a.priority as keyof typeof priorityOrderAsc] || 0) - 
                 (priorityOrderAsc[b.priority as keyof typeof priorityOrderAsc] || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [cards, filters, sortBy]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.priority.length > 0) count++;
    if (filters.assignee.length > 0) count++;
    if (filters.funnelType.length > 0) count++;
    if (filters.valueRange) count++;
    if (filters.productItem.length > 0) count++;
    if (filters.inboxName.length > 0) count++;
    if (filters.lifecycleStages.length > 0) count++;
    if (filters.progressRange) count++;
    if (filters.isMonetaryLocked) count++;
    if (filters.resolutionStatus.length > 0) count++;
    if (filters.inactivityDays) count++;
    if (filters.dateRange.start || filters.dateRange.end) count++;
    if (filters.isUnassigned) count++;
    if (filters.isReturningCustomer) count++;
    return count;
  }, [filters]);

  return {
    filters,
    sortBy,
    setSortBy,
    updateFilter,
    resetFilters,
    filteredCards,
    activeFiltersCount,
    savedViews,
    saveView,
    loadView,
    deleteView,
  };
};
