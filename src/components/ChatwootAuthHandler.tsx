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
    console.log('🔍 ChatwootAuthHandler: inIframe?', inIframe); // DEBUG LOG 1
    if (inIframe) {
      setIsChatwootFrame(true);
      
      // Handler para TODAS as mensagens (DEBUG: loga tudo que chega)
      const handleMessage = async (event: MessageEvent) => {
        console.log('📨 Chatwoot postMessage RECEBIDO:', event.data); // DEBUG LOG 2: Loga TODAS mensagens
        
        const eventData = event.data;

        // Tenta múltiplos formatos que o Chatwoot pode enviar
        const userData = 
          eventData?.data?.user ||           // Formato padrão: { event: 'appContext', data: { user, account } }
          eventData?.user ||                 // Formato direto: { user, account }
          eventData;                         // Fallback: qualquer objeto com user

        if (userData?.email && userData?.name) {
          console.log('✅ Chatwoot user detectado:', userData); // DEBUG LOG 3
          const cwUser = { email: userData.email, name: userData.name };
          const cwAccount = eventData?.data?.account || eventData?.account || {};
          
          await performAutoLogin(cwUser, cwAccount);
        }
      };

      window.addEventListener('message', handleMessage);
      
      // Múltiplos handshakes para Chatwoot (diferentes formatos)
      console.log('🚀 Enviando handshakes para Chatwoot...'); // DEBUG LOG 4
      window.parent.postMessage('app:ready', '*');
      window.parent.postMessage({ event: 'appContextRequested' }, '*');
      window.parent.postMessage({ type: 'dashboard:ready' }, '*');
      
      // Timeout: Se não receber em 5s, avisa no console
      const timeout = setTimeout(() => {
        console.warn('⚠️ Chatwoot não enviou contexto em 5s. Verifique configuração do App no Chatwoot.');
      }, 5000);
      
      return () => {
        window.removeEventListener('message', handleMessage);
        clearTimeout(timeout);
      };
    } else {
      console.log('ℹ️ Não está em iframe Chatwoot (acesso web normal)'); // DEBUG LOG 5
    }
  }, []);

  const performAutoLogin = async (cwUser: any, cwAccount: any) => {
    console.log('🔑 Iniciando auto-login para:', cwUser.email); // DEBUG LOG 6
    
    const { data: session } = await supabase.auth.getSession();
    
    // Se já estiver logado com o mesmo email, não faz nada
    if (session?.session?.user?.email === cwUser.email) {
      console.log('✅ Já logado com este usuário'); // DEBUG LOG 7
      return;
    }

    setIsAuthenticating(true);

    try {
      // Chama a Edge Function para garantir usuário e obter credenciais temporárias
      console.log('📞 Chamando chatwoot-sso edge function...'); // DEBUG LOG 8
      const { data, error } = await supabase.functions.invoke('chatwoot-sso', {
        body: {
          email: cwUser.email,
          name: cwUser.name,
          identifier: cwAccount?.id || 'cw'
        }
      });

      console.log('📞 Resposta da edge function:', data, error); // DEBUG LOG 9

      if (error || !data?.password) throw new Error('Falha no SSO');

      // Faz o login no cliente
      console.log('🔐 Fazendo login no Supabase...'); // DEBUG LOG 10
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      });

      if (loginError) throw loginError;

      console.log('✅ Auto-login SUCEDIDO!'); // DEBUG LOG 11
      toast({
        title: "Conectado ao Chatwoot",
        description: `Bem-vindo, ${cwUser.name}`
      });

    } catch (error) {
      console.error('❌ Auto-login FALHOU:', error); // DEBUG LOG 12
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