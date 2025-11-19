export interface KanbanFilters {
  search: string;
  
  // Pessoas
  assignee: string[]; // Agentes
  
  // Funil e Estágios
  funnelType: string[];
  lifecycleStages: string[];
  
  // Métricas (Ranges)
  funnelScoreRange: { min: number; max: number } | null; // Chance de Negócio (0-100)
  qualityScoreRange: { min: number; max: number } | null; // Qualidade (0-100)
  valueRange: { min: number; max: number } | null; // Valor Monetário
  
  // Detalhes do Negócio
  productItem: string[]; // Produtos
  lostReasons: string[]; // Motivos de Perda
  
  // Status e Tempo
  resolutionStatus: string[];
  inactivityDays: number | null;
  dateRange: { start: Date | null; end: Date | null };
  
  // Flags Booleanas
  isMonetaryLocked: boolean | null;
  isUnassigned: boolean | null;
  isReturningCustomer: boolean | null;
  
  // Campos Personalizados (Chave: Nome do campo, Valor: Valor do filtro)
  customFields: Record<string, any>;
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

// Removida interface QuickFilter antiga pois agora são dinâmicos