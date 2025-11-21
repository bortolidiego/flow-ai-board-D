import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Bot, AlertCircle, RefreshCw, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
    id: "1", // Corrigido para string
    name: "KB Tech Account",
  };

  // ✅ 1. Escutar TODOS os postMessage e detectar Chatwoot
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Log tudo para debug
      console.log('📬 postMessage recebido:', event.origin, event.data);
      setRawMessages(prev => [...prev.slice(-10), event.data]); // últimos 10

      // Detectar Chatwoot por dados conhecidos
      const data = event.data;

      // Tenta encontrar dados aninhados
      const findContext = (obj: any): ChatwootContext | null => {
        if (obj?.user?.email && obj?.account?.id) {
          return obj;
        }
        for (const key in obj) {
          if (typeof obj[key] === 'object' && obj[key] !== null) {
            const found = findContext(obj[key]);
            if (found) return found;
          }
        }
        return null;
      };
      
      const foundContext = findContext(data);

      if (foundContext) {
        console.log('📬 Contexto Chatwoot identificado:', foundContext);
        setContextReceived(foundContext);
        setWaitingForContext(false);
        return;
      }
    };

    window.addEventListener('message', handleMessage);

    // ✅ 2. Avisar Chatwoot que estamos prontos
    window.parent.postMessage('app:ready', '*');
    console.log('📢 Mensagem "app:ready" enviada para parent');

    // ✅ 3. Forçar detecção de iframe
    const inIframe = window.self !== window.top;
    console.log('🖼️ Em iframe:', inIframe);
    if (inIframe) {
      setIsChatwootFrame(true);
      setWaitingForContext(true);
      
      // Timeout para fallback
      const timeout = setTimeout(() => {
        console.log('⏰ Timeout - Nenhum contexto recebido');
        setWaitingForContext(false);
      }, 15000);
      
      return () => {
        window.removeEventListener('message', handleMessage);
        clearTimeout(timeout);
      };
    }
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

    } catch (error: any) {
      console.error('❌ AUTO-LOGIN FALHOU:', error);
      toast({ 
        title: "Erro no login automático", 
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  // ✅ Forçar reenvio de "app:ready"
  const forceReady = () => {
    window.parent.postMessage('app:ready', '*');
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

  if (waitingForContext && isChatwootFrame) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-primary/10 p-8">
        <div className="max-w-md w-full space-y-6 text-center">
          <Bot className="w-24 h-24 text-primary/50 mx-auto" />
          
          <div>
            <h2 className="text-2xl font-bold mb-2">Aguardando Chatwoot...</h2>
            <p className="text-muted-foreground mb-4">
              Procurando dados do agente...
            </p>
          </div>

          <div className="flex gap-2 justify-center">
            <Button onClick={forceReady} variant="outline" size="sm" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Reenviar "Pronto"
            </Button>
            <Button onClick={handleManualLogin} size="sm" className="gap-2">
              <LogIn className="w-4 h-4" />
              Login Manual
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-500" />
                Configuração Necessária
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-2 text-left">
              <p><strong>Para login automático:</strong></p>
              <p>1. No Chatwoot, edite seu app</p>
              <p>2. Marque "Habilitar contexto do agente"</p>
              <p>3. Use a URL simples:</p>
              <code className="block bg-muted p-2 rounded text-[10px]">
                https://flow-ai-board-d.vercel.app
              </code>
            </CardContent>
          </Card>

          <details className="text-left">
            <summary className="text-xs text-muted-foreground cursor-pointer">Ver mensagens recebidas</summary>
            <pre className="text-[8px] bg-black/10 p-2 rounded mt-2 max-h-32 overflow-auto">
              {JSON.stringify(rawMessages, null, 2)}
            </pre>
          </details>

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