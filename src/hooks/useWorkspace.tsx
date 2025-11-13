import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

interface Workspace {
  id: string;
  name: string;
  active_pipeline_id: string | null; // Pode ser string ou null
}

interface WorkspaceContextType {
  workspace: Workspace | null;
  loading: boolean;
  error: string | null;
  fetchWorkspaces: () => Promise<void>;
  createWorkspace: (name: string) => Promise<void>;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }

      const { data: memberData, error: memberError } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (memberError) throw memberError;

      if (!memberData) {
        setWorkspace(null);
        setLoading(false);
        return;
      }

      const { data: workspaceData, error: workspaceError } = await supabase
        .from('workspaces')
        .select('id, name, active_pipeline_id') // Selecionar explicitamente active_pipeline_id
        .eq('id', memberData.workspace_id)
        .single();

      if (workspaceError) throw workspaceError;

      setWorkspace(workspaceData as Workspace);
    } catch (err: any) {
      console.error('Error fetching workspace:', err);
      setError(err.message);
      toast({
        title: 'Erro ao carregar workspace',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createWorkspace = async (name: string) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: newWorkspace, error: workspaceError } = await supabase
        .from('workspaces')
        .insert({ name })
        .select('id, name, active_pipeline_id') // Selecionar explicitamente active_pipeline_id
        .single();

      if (workspaceError) throw workspaceError;

      await supabase.from('workspace_members').insert({
        workspace_id: newWorkspace.id,
        user_id: user.id,
      });

      // Set default pipeline for the new workspace
      const { data: newPipeline, error: pipelineError } = await supabase
        .from('pipelines')
        .insert({ workspace_id: newWorkspace.id })
        .select()
        .single();

      if (pipelineError) throw pipelineError;

      // Update workspace with active_pipeline_id
      const { error: updateWorkspaceError } = await supabase
        .from('workspaces')
        .update({ active_pipeline_id: newPipeline.id } as Partial<Workspace>) // Cast para Partial<Workspace>
        .eq('id', newWorkspace.id);

      if (updateWorkspaceError) throw updateWorkspaceError;

      setWorkspace({ ...newWorkspace, active_pipeline_id: newPipeline.id } as Workspace);
      toast({
        title: 'Workspace criado',
        description: 'Seu novo workspace foi criado com sucesso!',
      });
    } catch (err: any) {
      console.error('Error creating workspace:', err);
      setError(err.message);
      toast({
        title: 'Erro ao criar workspace',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateWorkspace = async (id: string, updates: Partial<Workspace>) => {
    setLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('workspaces')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;

      setWorkspace(prev => prev ? { ...prev, ...updates } : null);
      toast({
        title: 'Workspace atualizado',
        description: 'As informações do workspace foram salvas.',
      });
    } catch (err: any) {
      console.error('Error updating workspace:', err);
      setError(err.message);
      toast({
        title: 'Erro ao atualizar workspace',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteWorkspace = async (id: string) => {
    setLoading(true);
    try {
      const { error: deleteError } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setWorkspace(null);
      toast({
        title: 'Workspace excluído',
        description: 'O workspace foi removido com sucesso.',
      });
    } catch (err: any) {
      console.error('Error deleting workspace:', err);
      setError(err.message);
      toast({
        title: 'Erro ao excluir workspace',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <WorkspaceContext.Provider value={{ workspace, loading, error, fetchWorkspaces, createWorkspace, updateWorkspace, deleteWorkspace }}>
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