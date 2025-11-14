import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Workspace {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  joined_at: string;
}

export function useWorkspace() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWorkspace = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setLoading(false);
          return;
        }

        // Buscar workspaces do usuário via workspace_members (pode haver 0 ou mais)
        const { data: memberships, error: memberError } = await supabase
          .from('workspace_members')
          .select('workspace_id, workspaces(*)')
          .eq('user_id', user.id);

        if (memberError) {
          console.error('Error fetching workspace:', memberError);
          setLoading(false);
          return;
        }

        const firstMembership = (memberships || [])[0];
        if (firstMembership?.workspaces) {
          setWorkspace(firstMembership.workspaces as unknown as Workspace);

          // Buscar todos os membros do workspace selecionado
          const { data: allMembers } = await supabase
            .from('workspace_members')
            .select('*')
            .eq('workspace_id', firstMembership.workspace_id);

          if (allMembers) {
            setMembers(allMembers);
          }
        } else {
          // Sem vínculos: limpar estado
          setWorkspace(null);
          setMembers([]);
        }
      } catch (error) {
        console.error('Error in useWorkspace:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspace();

    // Listener para mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchWorkspace();
    });

    return () => subscription.unsubscribe();
  }, []);

  const updateWorkspaceName = async (newName: string) => {
    if (!workspace) return;

    const { error } = await supabase
      .from('workspaces')
      .update({ name: newName, updated_at: new Date().toISOString() })
      .eq('id', workspace.id);

    if (!error) {
      setWorkspace({ ...workspace, name: newName });
    }

    return { error };
  };

  const removeMember = async (memberId: string) => {
    const { error } = await supabase
      .from('workspace_members')
      .delete()
      .eq('id', memberId);

    if (!error) {
      setMembers(members.filter(m => m.id !== memberId));
    }

    return { error };
  };

  return { 
    workspace, 
    members, 
    loading,
    updateWorkspaceName,
    removeMember
  };
}
