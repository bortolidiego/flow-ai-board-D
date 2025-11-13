import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Workspace {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  active_pipeline_id: string | null; // Pode ser null se nenhum pipeline estiver ativo
}

interface WorkspaceContextType {
  workspace: Workspace | null;
  loading: boolean;
  error: string | null;
  fetchWorkspace: () => Promise<void>;
  updateWorkspace: (updates: Partial<Workspace>) => Promise<void>;
  setActivePipeline: (pipelineId: string | null) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchWorkspace = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Fetch workspace member entry for the current user
      const { data: memberData, error: memberError } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .maybeSingle(); // Usar maybeSingle para evitar erro se não houver membro

      if (memberError) throw memberError;

      if (!memberData) {
        setWorkspace(null);
        setLoading(false);
        return;
      }

      // Fetch the actual workspace details
      const { data: workspaceData, error: workspaceError } = await supabase
        .from('workspaces')
        .select('id, name, created_at, updated_at, active_pipeline_id') // Selecionar explicitamente active_pipeline_id
        .eq('id', memberData.workspace_id)
        .single();

      if (workspaceError) throw workspaceError;

      setWorkspace(workspaceData as Workspace);
    } catch (err: any) {
      console.error('Error fetching workspace:', err);
      setError(err.message || 'Failed to fetch workspace');
      setWorkspace(null);
    } finally {
      setLoading(false);
    }
  };

  const updateWorkspace = async (updates: Partial<Workspace>) => {
    if (!workspace) {
      toast({
        title: 'Erro',
        description: 'Nenhum workspace ativo para atualizar.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('workspaces')
        .update(updates)
        .eq('id', workspace.id);

      if (updateError) throw updateError;

      setWorkspace(prev => (prev ? { ...prev, ...updates } : null));
      toast({
        title: 'Workspace atualizado',
        description: 'As configurações do workspace foram salvas.',
      });
    } catch (err: any) {
      console.error('Error updating workspace:', err);
      toast({
        title: 'Erro ao atualizar workspace',
        description: err.message || 'Não foi possível salvar as configurações do workspace.',
        variant: 'destructive',
      });
    }
  };

  const setActivePipeline = async (pipelineId: string | null) => {
    if (!workspace) {
      toast({
        title: 'Erro',
        description: 'Nenhum workspace ativo para definir o pipeline.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('workspaces')
        .update({ active_pipeline_id: pipelineId })
        .eq('id', workspace.id);

      if (updateError) throw updateError;

      setWorkspace(prev => (prev ? { ...prev, active_pipeline_id: pipelineId } : null));
      toast({
        title: 'Pipeline ativo atualizado',
        description: 'O pipeline ativo foi alterado com sucesso.',
      });
    } catch (err: any) {
      console.error('Error setting active pipeline:', err);
      toast({
        title: 'Erro ao definir pipeline ativo',
        description: err.message || 'Não foi possível definir o pipeline ativo.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchWorkspace();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchWorkspace();
      } else {
        setWorkspace(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <WorkspaceContext.Provider value={{ workspace, loading, error, fetchWorkspace, updateWorkspace, setActivePipeline }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}