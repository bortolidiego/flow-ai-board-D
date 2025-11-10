export interface KanbanFilters {
  search: string;
  priority: string[];
  assignee: string[];
  funnelType: string[];
  valueRange: { min: number; max: number } | null;
  productItem: string[];
  inboxName: string[];
  
  // Filtros de ciclo de vida
  lifecycleStages: string[];
  progressRange: { min: number; max: number } | null;
  isMonetaryLocked: boolean | null;
  resolutionStatus: string[];
  inactivityDays: number | null;
  
  // Mantidos
  isUnassigned: boolean | null;
  isReturningCustomer: boolean | null;
  dateRange: { start: Date | null; end: Date | null };
}

export type SortOption = 
  | 'createdAt-desc'
  | 'createdAt-asc'
  | 'value-desc'
  | 'value-asc'
  | 'progress-desc'
  | 'progress-asc'
  | 'lastActivity-desc'
  | 'lastActivity-asc'
  | 'priority-desc'
  | 'priority-asc';

export interface SavedView {
  id: string;
  name: string;
  filters: KanbanFilters;
  sortBy: SortOption;
  createdAt: Date;
}

export interface QuickFilter {
  id: string;
  label: string;
  icon: any;
  apply: (filters: KanbanFilters) => Partial<KanbanFilters>;
}
