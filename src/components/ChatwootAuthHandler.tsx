import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export const ChatwootAuthHandler = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isChatwootFrame, setIsChatwootFrame] = useState(false);
  const [contextReceived, setContextReceived] = useState<any>(null);
  const [waitingForContext, setWaitingForContext] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // 1. VERIFICAÇÃO IMEDIATA: É iframe?
    const inIframe = window.self !== window.top;
    console.log('🚀 === CHATWOOT DEBUG START ===');
    console.log('🔍 1. inIframe?', inIframe);
    console.log('🔍 2. window.parent === window.self?', window.parent === window.self);
    
    if (inIframe) {
      setIsChatwootFrame(true);
      setWaitingForContext(true);
      
      // 2. Listener AGRESSIVO para TODAS mensagens (log de TUDO)
      const handleMessage = (event: MessageEvent) => {
        console.log('📨 === TODA MENSAGEM RECEBIDA ===');
        console.log('   origin:', event.origin);
        console.log('   data:', event.data);
        console.log('   source:', event.source);
        console.log('==============================');
        
        const eventData = event.data;

        // 3. MÚLTIPLOS PADRÕES de detecção do Chatwoot
        const patterns = [
          eventData?.event === 'appContext' && eventData.data?.user,           // Padrão oficial
          eventData?.user && eventData.user.email,                              // Formato direto
          eventData?.data?.user && eventData.data.user.email,                   // Aninhado
          eventData?.current_user && eventData.current_user.email,              // current_user
          eventData?.account_user && eventData.account_user.email,              // account_user
          typeof eventData === 'object' && eventData.email && eventData.name,   // Objeto direto
        ];

        const matchedPattern = patterns.find(Boolean);
        if (matchedPattern) {
          console.log('✅ === USUÁRIO CHATWOOT DETECTADO ===');
          const cwUser = extractUser(eventData);
          const cwAccount = extractAccount(eventData);
          console.log('   user:', cwUser);
          console.log('   account:', cwAccount);
          
          setContextReceived({ user: cwUser, account: cwAccount });
          performAutoLogin(cwUser, cwAccount);
          setWaitingForContext(false);
        }
      };

      window.addEventListener('message', handleMessage);

      // 4. MÚLTIPLOS HANDSHAKES (envia 5 tipos diferentes)
      console.log('🚀 === ENVIANDO HANDSHAKES ===');
      const handshakes = [
        'app:ready',
        { event: 'appContextRequested' },
        { type: 'dashboard:ready' },
        { action: 'getContext' },
        { ready: true }
      ];
      handshakes.forEach((msg, i) => {
        console.log(`   Handshake ${i+1}:`, msg);
        window.parent.postMessage(msg, '*');
      });

      // 5. Timeout: Se não receber em 10s, fallback
      const timeout = setTimeout(() => {
        console.warn('⏰ TIMEOUT: Chatwoot não enviou contexto. Mostrando login manual.');
        setWaitingForContext(false);
      }, 10000);

      return () => {
        window.removeEventListener('message', handleMessage);
        clearTimeout(timeout);
      };
    } else {
      console.log('ℹ️ Acesso web normal (não iframe)');
    }
    console.log('🚀 === CHATWOOT DEBUG END ===');
  }, []);

  // 5. Helpers para extrair user/account de QUALQUER formato
  const extractUser = (data: any) => ({
    email: data?.data?.user?.email || data?.user?.email || data?.email || data?.current_user?.email,
    name: data?.data?.user?.name || data?.user?.name || data?.name || data?.current_user?.name,
    id: data?.data?.user?.id || data?.user?.id || data?.id
  });

  const extractAccount = (data: any) => ({
    id: data?.data?.account?.id || data?.account?.id || data?.account_id
  });

  const performAutoLogin = async (cwUser: any, cwAccount: any) => {
    console.log('🔑 === AUTO-LOGIN INICIADO ===');
    
    const { data: session } = await supabase.auth.getSession();
    if (session?.session?.user?.email === cwUser.email) {
      console.log('✅ Já logado');
      return;
    }

    setIsAuthenticating(true);

    try {
      console.log('📞 Chamando chatwoot-sso...');
      const { data, error } = await supabase.functions.invoke('chatwoot-sso', {
        body: { email: cwUser.email, name: cwUser.name, identifier: cwAccount.id }
      });

      console.log('📞 Resposta SSO:', data, error);

      if (error || !data?.password) throw new Error('SSO falhou');

      console.log('🔐 Login Supabase...');
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      });

      if (loginError) throw loginError;

      console.log('✅ === AUTO-LOGIN SUCESSO ===');
      toast({ title: `Bem-vindo, ${cwUser.name}!` });

    } catch (error) {
      console.error('❌ AUTO-LOGIN FALHOU:', error);
    } finally {
      setIsAuthenticating(false);
    }
  };

  // 6. UI de DEBUG (só em desenvolvimento)
  const isDev = import.meta.env.DEV;

  if (isAuthenticating) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-background to-primary/10">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg font-medium">Conectando com Chatwoot...</p>
        </div>
      </div>
    );
  }

  if (waitingForContext && isChatwootFrame) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-primary/10 p-8">
        <div className="max-w-md w-full space-y-6 text-center">
          <Bot className="w-24 h-24 text-primary/50 mx-auto" />
          
          <div>
            <h2 className="text-2xl font-bold mb-2">Aguardando Chatwoot...</h2>
            <p className="text-muted-foreground mb-4">
              Detectamos que você está no Chatwoot. Aguardando dados do agente...
            </p>
          </div>

          {isDev && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Debug Info</CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-2">
                <p><strong>Contexto Recebido:</strong> {contextReceived ? 'SIM' : 'NÃO'}</p>
                <p><strong>Esperando:</strong> {waitingForContext ? 'SIM' : 'NÃO'}</p>
                <Button 
                  size="sm" 
                  onClick={() => {
                    window.parent.postMessage({ event: 'appContextRequested' }, '*');
                    toast({ title: 'Handshake enviado!' });
                  }}
                >
                  🔄 Forçar Handshake
                </Button>
              </CardContent>
            </Card>
          )}

          <Button 
            variant="outline" 
            size="lg" 
            onClick={() => setWaitingForContext(false)}
            className="w-full"
          >
            Login Manual
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};