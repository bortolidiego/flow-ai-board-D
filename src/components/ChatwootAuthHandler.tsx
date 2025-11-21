import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Bot, AlertCircle, RefreshCw, LogIn, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

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
  const [isChatwootFrame, setIsChatwootFrame] = useState(false);
  const [waitingForContext, setWaitingForContext] = useState(false);
  const [contextReceived, setContextReceived] = useState<ChatwootContext | null>(null);
  const [rawMessages, setRawMessages] = useState<any[]>([]); // Para debug
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

  // ✅ 1. Escutar TODOS os postMessage e detectar Chatwoot
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log('📬 postMessage recebido:', event.origin, event.data);
      setRawMessages(prev => [...prev.slice(-10), { timestamp: new Date().toLocaleTimeString(), data: event.data }]); // últimos 10

      // Detectar Chatwoot por dados conhecidos
      const data = event.data;

      // Verificar se é o contexto do Chatwoot
      if (data && typeof data === 'object') {
        // Procurar por padrões comuns do Chatwoot
        const findChatwootContext = (obj: any): ChatwootContext | null => {
          // Padrão 1: { user: { email: "...", name: "..." }, account: { id: 123, name: "..." } }
          if (obj.user?.email && obj.account?.id) {
            console.log('🎯 Padrão Chatwoot encontrado (direto):', obj);
            return obj;
          }

          // Padrão 2: Aninhado em alguma propriedade
          for (const key in obj) {
            if (typeof obj[key] === 'object' && obj[key] !== null) {
              const found = findChatwootContext(obj[key]);
              if (found) {
                console.log('🎯 Padrão Chatwoot encontrado (aninhado em', key + '):', found);
                return found;
              }
            }
          }

          // Padrão 3: Verificar se tem dados de usuário e conta em qualquer lugar
          if (obj.email && obj.name && (obj.accountId || obj.account_id)) {
            console.log('🎯 Padrão Chatwoot encontrado (plano):', obj);
            return {
              user: { email: obj.email, name: obj.name, id: obj.id || 1 },
              account: { id: obj.accountId || obj.account_id, name: obj.accountName || 'Chatwoot Account' }
            };
          }

          return null;
        };

        const foundContext = findChatwootContext(data);
        if (foundContext) {
          console.log('✅ Contexto Chatwoot identificado:', foundContext);
          setContextReceived(foundContext);
          setWaitingForContext(false);
          return;
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // ✅ 2. Avisar Chatwoot que estamos prontos (múltiplas vezes para garantir)
    const sendReady = () => {
      window.parent.postMessage('app:ready', '*');
      window.parent.postMessage({ type: 'app:ready' }, '*');
      console.log('📢 Mensagem "app:ready" enviada para parent');
    };

    sendReady();
    const interval = setInterval(sendReady, 2000); // Enviar a cada 2 segundos

    // ✅ 3. Forçar detecção de iframe
    const inIframe = window.self !== window.top;
    console.log('🖼️ Em iframe:', inIframe);
    if (inIframe) {
      setIsChatwootFrame(true);
      // Removido: setWaitingForContext(true);
      // Agora vai direto para o login automático
      performAutoLogin(MANUAL_TEST_USER, MANUAL_TEST_ACCOUNT);
    }

    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(interval);
    };
  }, []);

  // ✅ 4. Quando contexto chega, fazer login automático
  useEffect(() => {
    if (contextReceived?.user?.email) {
      performAutoLogin(
        {
          email: contextReceived.user.email,
          name: contextReceived.user.name
        },
        {
          id: contextReceived.account?.id?.toString() || 'chatwoot'
        }
      );
    }
  }, [contextReceived]);

  const performAutoLogin = async (
    cwUser: { email: string; name: string },
    cwAccount: { id: string }
  ) => {
    console.log('🔑 === AUTO-LOGIN INICIADO ===', cwUser);

    const { data: session } = await supabase.auth.getSession();
    if (session?.session?.user?.email === cwUser.email) {
      console.log('✅ Já logado');
      setIsAuthenticating(false);
      setWaitingForContext(false); // ✅ Importante: sair da tela de espera
      return;
    }

    setIsAuthenticating(true);

    try {
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

      console.log('🔐 Fazendo login no Supabase...');
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      });

      if (loginError) {
        console.error('❌ Erro no login Supabase:', loginError);
        throw new Error(`Login falhou: ${loginError.message}`);
      }

      console.log('✅ === AUTO-LOGIN SUCESSO ===');
      toast({ title: `Bem-vindo, ${cwUser.name}!` });
      
      // ✅ Importante: sair da tela de espera após login bem-sucedido
      setWaitingForContext(false);

    } catch (error: any) {
      console.error('❌ AUTO-LOGIN FALHOU:', error);
      toast({
        title: "Erro no login automático",
        description: error.message,
        variant: "destructive"
      });
      // Mesmo em erro, sair da tela de espera para permitir login manual
      setWaitingForContext(false);
    } finally {
      setIsAuthenticating(false);
    }
  };

  // ✅ Forçar reenvio de "app:ready"
  const forceReady = () => {
    window.parent.postMessage('app:ready', '*');
    window.parent.postMessage({ type: 'app:ready' }, '*');
    console.log('📢 Mensagem "app:ready" reenviada');
  };

  const handleManualLogin = () => {
    performAutoLogin(MANUAL_TEST_USER, MANUAL_TEST_ACCOUNT);
  };

  if (isAuthenticating) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-background to-primary/10">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg font-medium">Conectando...</p>
          {contextReceived?.user && (
            <p className="text-sm text-muted-foreground mt-2">
              Como {contextReceived.user.name} ({contextReceived.user.email})
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      
      {/* Debug Panel - Visível apenas em iframe */}
      {isChatwootFrame && (
        <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-card/95 backdrop-blur-md border-t border-border/50 p-2">
          <Card className="border-none shadow-lg">
            <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bug className="w-4 h-4 text-red-500" />
                Debug Chatwoot Context
              </CardTitle>
              <Button onClick={forceReady} variant="ghost" size="sm" className="h-6 text-xs">
                <RefreshCw className="w-3 h-3 mr-1" />
                Reenviar Ready
              </Button>
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <div className="text-xs space-y-1">
                <p><strong>Status:</strong> {contextReceived ? 'Contexto Recebido' : 'Aguardando Contexto...'}</p>
                <p><strong>Usuário:</strong> {contextReceived?.user?.email || 'N/A'}</p>
                <p><strong>Conta ID:</strong> {contextReceived?.account?.id || 'N/A'}</p>
              </div>
              <Separator className="my-2" />
              <h4 className="text-xs font-semibold mb-1">Últimas Mensagens (postMessage)</h4>
              <ScrollArea className="h-[100px] border rounded-md p-2 bg-background">
                <div className="space-y-1 text-[10px] font-mono">
                  {rawMessages.map((msg, index) => (
                    <div key={index} className="border-b border-border/50 pb-1">
                      <span className="text-muted-foreground mr-1">{msg.timestamp}:</span>
                      <pre className="whitespace-pre-wrap break-words">{JSON.stringify(msg.data, null, 2).substring(0, 200)}...</pre>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};