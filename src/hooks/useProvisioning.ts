import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from './useWorkspace';
import { useToast } from './use-toast';

export function useProvisioning() {
  const { workspace, loading: workspaceLoading } = useWorkspace();
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [isProvisioned, setIsProvisioned] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkAndProvision = async () => {
      if (workspaceLoading || isProvisioning || isProvisioned) return;

      const { data: { user } } = await supabase.auth.getUser();
      
      // Se não houver usuário logado, ou se já tiver workspace, não faz nada
      if (!user || workspace) {
        setIsProvisioned(true);
        return;
      }

      // Usuário logado, mas sem workspace. Iniciar provisionamento.
      setIsProvisioning(true);
      
      // Usar dados fixos para o usuário específico que você mencionou
      const targetEmail = "diego.bortoli@kbtech.com.br";
      const targetWorkspaceName = "KB Tech";

      if (user.email?.toLowerCase() === targetEmail.toLowerCase()) {
        try {
          const { data: session } = await supabase.auth.getSession();
          
          if (!session.session?.access_token) {
            throw new Error("Sessão não encontrada para provisionamento.");
          }

          const { error } = await supabase.functions.invoke("provision-current-user-workspace", {
            body: { workspaceName: targetWorkspaceName },
            headers: { Authorization: `Bearer ${session.session.access_token}` },
          });

          if (error) throw error;

          toast({
            title: "Provisionamento concluído",
            description: `Workspace "${targetWorkspaceName}" criado/vinculado.`,
          });
          
          // Forçar refresh para useWorkspace pegar o novo estado
          window.location.reload(); 

        } catch (err: any) {
          console.error("Provision error:", err);
          toast({
            title: "Erro ao provisionar workspace",
            description: err?.message || "Tente novamente.",
            variant: "destructive",
          });
        }
      } else {
        // Para qualquer outro usuário, apenas marca como provisionado (eles devem ser convidados)
        console.log("Usuário não é o alvo de provisionamento automático. Aguardando convite.");
      }

      setIsProvisioning(false);
      setIsProvisioned(true);
    };

    checkAndProvision();
  }, [workspaceLoading, workspace]);

  return { isProvisioning, isProvisioned: isProvisioned && !workspaceLoading };
}