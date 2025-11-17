import { useState, useEffect } from 'react';
import { useKanbanData } from '@/hooks/useKanbanData';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useUserRole } from '@/hooks/useUserRole';
import KanbanBoard from './KanbanBoard';
import ProvisionWrapper from '@/components/ProvisionWrapper';
import { Loader2 } from 'lucide-react';

export default function Index() {
  const { workspace, loading: workspaceLoading } = useWorkspace();
  const { userId } = useUserRole();
  
  // Corrigido Erros 10, 11: useKanbanData não aceita argumento e não retorna updateCardColumn
  const { loading: kanbanLoading } = useKanbanData(); 

  const loading = workspaceLoading || kanbanLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!userId) {
    // Should be handled by ProtectedRoute, but as a fallback
    return <ProvisionWrapper />;
  }

  if (!workspace) {
    return <ProvisionWrapper />;
  }

  return <KanbanBoard />;
}