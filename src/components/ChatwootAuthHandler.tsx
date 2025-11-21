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
  const { isChatwootFrame, context, agentName, agentEmail } = useChatwoot();
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
          {context?.user && (
            <p className="text-sm text-muted-foreground mt-2">
              Como {context.user.name} ({context.user.email})
            </p>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
};