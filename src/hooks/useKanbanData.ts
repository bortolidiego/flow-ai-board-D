import { useState, useEffect, useCallback } from 'react';
import { useWorkspace } from './useWorkspace';
import { 
  fetchPipeline, 
  fetchCards, 
  fetchPipelineConfig, 
  Pipeline, 
  Card, 
  PipelineConfig 
} from '@/lib/kanban';
import { toast } from 'sonner';

interface KanbanData {
  cards: Card[];
  pipeline: Pipeline | null;
  pipelineConfig: PipelineConfig | null;
  loading: boolean;
  refreshCards: () => Promise<void>;
  // updateCardColumn não existe mais no retorno
}

export function useKanbanData(): KanbanData { // Corrigido Erro 7, 8, 11
  const { workspace, loading: workspaceLoading } = useWorkspace();
  const [cards, setCards] = useState<Card[]>([]);
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [pipelineConfig, setPipelineConfig] = useState<PipelineConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshCards = useCallback(async () => {
    setRefreshKey(prev => prev + 1);
  }, []);

  useEffect(() => {
    if (workspaceLoading) {
      // Still waiting for workspace, keep loading true
      return;
    }

    if (!workspace) {
      // Workspace not found after loading, stop loading and clear data
      setLoading(false);
      setPipeline(null);
      setCards([]);
      setPipelineConfig(null);
      return;
    }

    const loadKanbanData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Pipeline
        const fetchedPipeline = await fetchPipeline(workspace.id);
        setPipeline(fetchedPipeline);

        if (!fetchedPipeline) {
          // No pipeline found, stop loading and clear data
          setCards([]);
          setPipelineConfig(null);
          setLoading(false);
          return;
        }

        // 2. Fetch Cards and Config concurrently
        const [fetchedCards, fetchedConfig] = await Promise.all([
          fetchCards(fetchedPipeline.id),
          fetchPipelineConfig(fetchedPipeline.id),
        ]);

        setCards(fetchedCards);
        setPipelineConfig(fetchedConfig);
        
      } catch (error) {
        console.error("Error loading Kanban data:", error);
        toast.error("Erro ao carregar dados do Kanban. Verifique o console.");
        setPipeline(null);
        setCards([]);
        setPipelineConfig(null);
      } finally {
        setLoading(false);
      }
    };

    loadKanbanData();
  }, [workspace, workspaceLoading, refreshKey]);

  return {
    cards,
    pipeline,
    pipelineConfig,
    loading,
    refreshCards,
  };
}