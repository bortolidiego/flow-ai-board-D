import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export const ChatwootAuthHandler = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isChatwootFrame, setIsChatwootFrame] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Verifica se está em iframe
    const inIframe = window.self !== window.top;
    if (inIframe) {
      setIsChatwootFrame(true);
      
      // Handler para mensagens do Chatwoot
      const handleMessage = async (event: MessageEvent) => {
        const eventData = event.data;

        // Verifica se é o contexto do Chatwoot (formato padrão: 'appContext')
        // O Chatwoot envia { event: 'appContext', data: { user: {...}, account: {...} } }
        if (eventData && eventData.event === 'appContext' && eventData.data?.user) {
          const cwUser = eventData.data.user;
          const cwAccount = eventData.data.account;
          
          await performAutoLogin(cwUser, cwAccount);
        }
      };

      window.addEventListener('message', handleMessage);
      
      // Solicita contexto ao Chatwoot (Handshake)
      window.parent.postMessage('app:ready', '*');
      
      return () => window.removeEventListener('message', handleMessage);
    }
  }, []);

  const performAutoLogin = async (cwUser: any, cwAccount: any) => {
    const { data: session } = await supabase.auth.getSession();
    
    // Se já estiver logado com o mesmo email, não faz nada
    if (session?.session?.user?.email === cwUser.email) {
      return;
    }

    setIsAuthenticating(true);

    try {
      // Chama a Edge Function para garantir usuário e obter credenciais temporárias
      const { data, error } = await supabase.functions.invoke('chatwoot-sso', {
        body: {
          email: cwUser.email,
          name: cwUser.name,
          identifier: cwAccount?.id || 'cw'
        }
      });

      if (error || !data?.password) throw new Error('Falha no SSO');

      // Faz o login no cliente
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      });

      if (loginError) throw loginError;

      toast({
        title: "Conectado ao Chatwoot",
        description: `Bem-vindo, ${cwUser.name}`
      });

    } catch (error) {
      console.error('Auto-login failed:', error);
      // Não mostramos erro fatal para não bloquear caso o usuário queira logar manual
    } finally {
      setIsAuthenticating(false);
    }
  };

  if (isAuthenticating) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Sincronizando com Chatwoot...</p>
      </div>
    );
  }

  return <>{children}</>;
};