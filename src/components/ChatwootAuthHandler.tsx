import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Bot, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ChatwootContext {
  user?: {
    id: number;
    name: string;
    email: string;
  };
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
  const { toast } = useToast();

  // ✅ 1. Escutar postMessage do Chatwoot
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verifica se é um evento de contexto do Chatwoot
      if (event.data?.event === 'appContext' || event.data?.type === 'dashboard:ready') {
        console.log('📬 Contexto recebido do Chatwoot:', event.data);
        setContextReceived(event.data.data || event.data);
        setWaitingForContext(false);
      }
    };

    window.addEventListener('message', handleMessage);
    
    // ✅ 2. Avisar Chatwoot que estamos prontos
    window.parent.postMessage('app:ready', '*');

    // ✅ 3. Detectar se estamos em iframe do Chatwoot
    const inIframe = window.self !== window.top;
    if (inIframe) {
      setIsChatwootFrame(true);
      setWaitingForContext(true);
      
      // Timeout para fallback
      const timeout = setTimeout(() => {
        setWaitingForContext(false);
      }, 10000);
      
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