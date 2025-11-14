import { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Workspace {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  active_pipeline_id: string | null;
}

interface WorkspaceContextType {
  workspace?: Workspace | null;
  loading: boolean;
  error: string | null;
  fetchWorkspace: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function useWorkspace(): WorkspaceContextType {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('useWorkspace must be used within WorkspaceProvider');

  useEffect(() => {
    context.fetchWorkspace();
  }, []);

  return context;
}

export function WorkspaceProvider({ children }: { children: any }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const fetchWorkspace = async () => {
    try {
      const { data, error } = await supabase.from('workspaces').select('*').limit(1);
      if (error) {
        setError(error.message);
        return;
      }
      setWorkspace(data[0] || null);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <WorkspaceContext.Provider value={{
      workspace,
      loading,
      error,
      fetchWorkspace: fetchWorkspace,
    }}>{
      {children}
    }
  );
}