import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useChatwoot } from '@/components/ChatwootContextProvider';

interface ChatwootUser {
  id: number;
  name: string;
  email: string;
}

interface ChatwootContext {
  user?: ChatwootUser;
  account?: {
    id: number;
    name: string;
  };
}

export const ChatwootAuthHandler = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authRetries, setAuthRetries] = useState(0);
  const { isChatwootFrame, context, conversationId, agentName } = useChatwoot();
  const { toast } = useToast();

  // Dados fixos para teste manual
  const MANUAL_TEST_USER = {
    email: "diego.bortoli@kbtech.com.br",
    name: "Diego Bortoli",
    id: 12345,
  };
  const MANUAL_TEST_ACCOUNT = {
    id: "1",
    name: "KB Tech Account",
  };

  // Função para verificar conectividade com Supabase
  const checkSupabaseConnectivity = async (): Promise<boolean> => {
    try {
      // Tenta uma operação simples para verificar conectividade
      const { error } = await supabase.auth.getSession();
      return !error;
    } catch (error) {
      console.warn('Supabase connectivity check failed:', error);
      return false;
    }
  };

  // Função para tentar login com retry
  const attemptLogin = async (email: string, password: string, maxRetries = 3): Promise<boolean> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔐 Tentativa ${attempt}/${maxRetries} de login para ${email}`);
        
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (!error) {
          console.log('✅ Login bem-sucedido');
          return true;
        }

        console.warn(`❌ Tentativa ${attempt} falhou:`, error.message);
        
        // Se não é erro de rede, não retry
        if (!error.message.includes('fetch') && !error.message.includes('network')) {
          break;
        }

        // Espera antes do próximo retry
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      } catch (error) {
        console.warn(`❌ Erro na tentativa ${attempt}:`, error);
        
        // Se não é erro de rede, não retry
        if (!String(error).includes('fetch') && !String(error).includes('network')) {
          break;
        }

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    return false;
  };

  // ✅ Quando contexto chega, fazer login automático
  useEffect(() => {
    if (context?.user?.email) {
      performAutoLogin(
        {
          email: context.user.email,
          name: context.user.name
        },
        {
          id: context.account?.id?.toString() || 'chatwoot'
        }
      );
    } else if (isChatwootFrame && !context) {
      // Se estamos no iframe mas não temos contexto, tentar login manual
      performAutoLogin(MANUAL_TEST_USER, MANUAL_TEST_ACCOUNT);
    }
  }, [context, isChatwootFrame]);

  const performAutoLogin = async (
    cwUser: { email: string; name: string },
    cwAccount: { id: string }
  ) => {
    console.log('🔑 === AUTO-LOGIN INICIADO ===', cwUser);

    // Verifica se já está logado
    const { data: session } = await supabase.auth.getSession();
    if (session?.session?.user?.email === cwUser.email) {
      console.log('✅ Já logado');
      setIsAuthenticating(false);
      return;
    }

    setIsAuthenticating(true);

    try {
      // Verifica conectividade antes de prosseguir
      const isConnected = await checkSupabaseConnectivity();
      if (!isConnected) {
        console.warn('❌ Sem conectividade com Supabase, pulando auto-login');
        toast({
          title: "Problema de conectividade",
          description: "Não foi possível conectar ao servidor. Verifique sua conexão com a internet.",
          variant: "destructive"
        });
        setIsAuthenticating(false);
        return;
      }

      console.log('📞 Chamando chatwoot-sso...');
      const { data, error } = await supabase.functions.invoke('chatwoot-sso', {
        body: { email: cwUser.email, name: cwUser.name, identifier: cwAccount.id }
      });

      console.log('📞 Resposta SSO:', data, error);

      if (error) {
        console.error('❌ Erro na função SSO:', error);
        throw new Error(`SSO falhou: ${error.message}`);
      }

      if (!data?.password) {
        console.error('❌ Resposta SSO sem senha:', data);
        throw new Error('SSO não retornou senha');
      }

      // Tenta login com retry
      const loginSuccess = await attemptLogin(data.email, data.password);
      
      if (!loginSuccess) {
        throw new Error('Falha no login após múltiplas tentativas');
      }

      console.log('✅ === AUTO-LOGIN SUCESSO ===');
      toast({ title: `Bem-vindo, ${cwUser.name}!` });
      
    } catch (error: any) {
      console.error('❌ AUTO-LOGIN FALHOU:', error);
      
      // Mostra erro específico baseado no tipo
      let errorMessage = "Erro no login automático";
      let errorDescription = error.message || "Tente novamente ou entre manualmente.";
      
      if (error.message?.includes('fetch') || error.message?.includes('network')) {
        errorMessage = "Problema de conectividade";
        errorDescription = "Verifique sua conexão com a internet e tente novamente.";
      } else if (error.message?.includes('SSO')) {
        errorMessage = "Erro na configuração SSO";
        errorDescription = "Entre em contato com o administrador do sistema.";
      }
      
      toast({
        title: errorMessage,
        description: errorDescription,
        variant: "destructive"
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  if (isAuthenticating) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-background to-primary/10">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg font-medium">Conectando...</p>
          {context?.user && (
            <p className="text-sm text-muted-foreground mt-2">
              Como {context.user.name} ({context.user.email})
            </p>
          )}
          {authRetries > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Tentativa {authRetries}/3
            </p>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
};