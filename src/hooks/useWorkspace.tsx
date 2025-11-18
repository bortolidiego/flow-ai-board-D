import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
  refreshWorkspace: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const { userId, loading: userLoading } = useUserRole();

  const refreshWorkspace = () => setRefreshKey(prev => prev + 1);

  useEffect(() => {
    if (userLoading) return;

    const fetchWorkspace = async () => {
      setLoading(true);
      
      if (!userId) {
        setWorkspace(null);
        setLoading(false);
        return;
      }

      try {
        // 1. Buscar a associação do usuário ao workspace
        const { data: memberData, error: memberError } = await supabase
          .from('workspace_members')
          .select('workspace_id')
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle();

        if (memberError) throw memberError;

        if (!memberData) {
          // Se não for membro, tentar criar um workspace padrão (Provisionamento)
          setWorkspace(null);
          setLoading(false);
          return;
        }

        // 2. Buscar detalhes do workspace
        const { data: workspaceData, error: workspaceError } = await supabase
          .from('workspaces')
          .select('id, name')
          .eq('id', memberData.workspace_id)
          .single();

        if (workspaceError) throw workspaceError;

        setWorkspace(workspaceData as Workspace);
      } catch (error: any) {
        console.error('Error fetching workspace:', error);
        toast.error(`Erro ao carregar workspace: ${error.message}`);
        setWorkspace(null);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspace();
  }, [userId, userLoading, refreshKey]);

  return (
    <WorkspaceContext.Provider value={{ workspace, loading, refreshWorkspace }}>
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