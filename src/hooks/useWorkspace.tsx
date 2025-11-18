import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';
import { toast } from 'sonner';

interface Workspace {
  id: string;
  name: string;
}

interface WorkspaceContextType {
  workspace: Workspace | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

interface WorkspaceProviderProps {
  children: ReactNode;
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const { userId, loading: userLoading } = useUserRole();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const fetchWorkspace = async (currentUserId: string) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Buscar membros do workspace para o usuário atual
      const { data: memberData, error: memberError } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', currentUserId)
        .limit(1)
        .maybeSingle();

      if (memberError) throw memberError;

      if (!memberData) {
        // Se o usuário não for membro de nenhum workspace, ele precisa ser provisionado
        setWorkspace(null);
        return;
      }

      // 2. Buscar detalhes do workspace
      const { data: workspaceData, error: workspaceError } = await supabase
        .from('workspaces')
        .select('id, name')
        .eq('id', memberData.workspace_id)
        .single();

      if (workspaceError) throw workspaceError;

      setWorkspace(workspaceData);
    } catch (err: any) {
      console.error('Error fetching workspace:', err);
      setError(err.message || 'Erro ao carregar workspace.');
      toast.error('Erro ao carregar workspace.');
      setWorkspace(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userLoading) {
      if (userId) {
        fetchWorkspace(userId);
      } else {
        setWorkspace(null);
        setLoading(false);
      }
    }
  }, [userId, userLoading, refetchTrigger]);

  const refetch = () => setRefetchTrigger(prev => prev + 1);

  const value = {
    workspace,
    loading,
    error,
    refetch,
  };

  return (
    <WorkspaceContext.Provider value={value}>
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