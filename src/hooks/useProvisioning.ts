import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from './useWorkspace';
import { useToast } from './use-toast';

export function useProvisioning() {
  const { workspace, loading: workspaceLoading } = useWorkspace();
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [isProvisioned, setIsProvisioned] = useState(false);
  const [verificationComplete, setVerificationComplete] = useState(false);
  const { toast } = useToast();

  // Função para verificar conectividade
  const checkConnectivity = async (): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.getSession();
      return !error;
    } catch (error) {
      console.warn('Connectivity check failed:', error);
      return false;
    }
  };

  // Função para tentar provisionamento com retry
  const attemptProvisioning = async (userEmail: string, workspaceName: string, maxRetries = 3): Promise<boolean> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🏗️ Tentativa ${attempt}/${maxRetries} de provisionamento`);

        const { data: session } = await supabase.auth.getSession();

        if (!session.session?.access_token) {
          throw new Error("Sessão não encontrada para provisionamento.");
        }

        const { error } = await supabase.functions.invoke("provision-current-user-workspace", {
          body: { workspaceName },
          headers: { Authorization: `Bearer ${session.session.access_token}` },
        });

        if (!error) {
          console.log('✅ Provisionamento bem-sucedido');
          return true;
        }

        console.warn(`❌ Tentativa ${attempt} falhou:`, error.message);

        // Se não é erro de rede, não retry
        if (!error.message.includes('fetch') && !error.message.includes('network')) {
          break;
        }

        // Espera antes do próximo retry
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        }
      } catch (error) {
        console.warn(`❌ Erro na tentativa ${attempt}:`, error);

        // Se não é erro de rede, não retry
        if (!String(error).includes('fetch') && !String(error).includes('network')) {
          break;
        }

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        }
      }
    }

    return false;
  };

  useEffect(() => {
    const checkAndProvision = async () => {
      if (workspaceLoading) return; // Espera terminar de carregar o workspace

      if (isProvisioning || isProvisioned) {
        setVerificationComplete(true);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      // Se não houver usuário logado, ou se já tiver workspace, não faz nada
      if (!user || workspace) {
        setIsProvisioned(true);
        setVerificationComplete(true);
        return;
      }

      // Verifica conectividade antes de prosseguir
      const isConnected = await checkConnectivity();
      if (!isConnected) {
        console.warn('❌ Sem conectividade, pulando provisionamento');
        setIsProvisioned(true); // Marca como provisionado para não travar
        setVerificationComplete(true);
        return;
      }

      // Usuário logado, mas sem workspace. Iniciar provisionamento.
      setIsProvisioning(true);

      // Usar dados fixos para o usuário específico que você mencionou
      const targetEmail = "diego.bortoli@kbtech.com.br";
      const targetWorkspaceName = "KB Tech";

      if (user.email?.toLowerCase() === targetEmail.toLowerCase()) {
        const success = await attemptProvisioning(user.email, targetWorkspaceName);

        if (!success) {
          toast({
            title: "Erro ao provisionar workspace",
            description: "Não foi possível configurar o workspace automaticamente. Tente novamente mais tarde.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Provisionamento concluído",
            description: `Workspace "${targetWorkspaceName}" criado/vinculado.`,
          });

          // Forçar refresh para useWorkspace pegar o novo estado
          window.location.reload();
        }
      } else {
        // Para qualquer outro usuário, apenas marca como provisionado (eles devem ser convidados)
        console.log("Usuário não é o alvo de provisionamento automático. Aguardando convite.");
      }

      setIsProvisioning(false);
      setIsProvisioned(true);
      setVerificationComplete(true);
    };

    checkAndProvision();
  }, [workspaceLoading, workspace]);

  const isLoading = workspaceLoading || isProvisioning || !verificationComplete;

  return {
    isProvisioning,
    isProvisioned: isProvisioned || isLoading, // Se está carregando, considera provisionado para não mostrar erro
    isLoading
  };
}