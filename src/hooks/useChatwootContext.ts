import { useState, useEffect } from 'react';

interface ChatwootUser {
  id: number;
  name: string;
  email: string;
  avatar_url?: string;
}

interface ChatwootContextData {
  user?: ChatwootUser;
  account?: {
    id: number;
    name: string;
  };
  conversation?: {
    id: number;
    contact_id: number;
    status: string;
    inbox_id: number;
  };
  contact?: {
    id: number;
    name: string;
    email: string;
    phone_number?: string;
  };
}

export const useChatwootContext = () => {
  const [context, setContext] = useState<ChatwootContextData | null>(null);
  const [isChatwootFrame, setIsChatwootFrame] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar se estamos em um iframe
    const inIframe = window.self !== window.top;
    setIsChatwootFrame(inIframe);
    
    if (!inIframe) {
      setLoading(false);
      return;
    }

    console.log('🎯 App detectado dentro de iframe - Iniciando comunicação com Chatwoot');

    const handleMessage = (event: MessageEvent) => {
      // Aceitar apenas mensagens do parent (Chatwoot)
      if (event.source !== window.parent) return;

      const data = event.data;
      
      // Log apenas de mensagens relevantes
      if (data && typeof data === 'object' && data.event) {
        console.log('📨 Evento Chatwoot recebido:', data.event, data);
      }

      // O Chatwoot envia o contexto no formato: { event: 'push.event', data: {...} }
      if (data?.event === 'push.event' && data?.data) {
        console.log('✅ Contexto completo recebido do Chatwoot:', data.data);
        
        setContext({
          user: data.data.user,
          account: data.data.account,
          conversation: data.data.conversation,
          contact: data.data.contact,
        });
        
        setLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);

    // Enviar sinal de "ready" para o Chatwoot
    const notifyReady = () => {
      console.log('📤 Notificando Chatwoot que o app está pronto');
      
      // Formato correto para Dashboard Apps do Chatwoot
      window.parent.postMessage(
        JSON.stringify({ event: 'chatwoot-dashboard-app:ready' }),
        '*'
      );
    };

    // Enviar ready após um pequeno delay para garantir que o Chatwoot está escutando
    setTimeout(notifyReady, 100);
    
    // Timeout de segurança: se após 10s não receber contexto, parar de carregar
    const timeout = setTimeout(() => {
      if (!context) {
        console.warn('⚠️ Timeout: Contexto do Chatwoot não recebido após 10s');
        console.warn('⚠️ Verifique se o Dashboard App foi configurado corretamente no Chatwoot');
        setLoading(false);
      }
    }, 10000);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(timeout);
    };
  }, []);

  return {
    isChatwootFrame,
    context,
    loading,
    agentName: context?.user?.name,
    agentEmail: context?.user?.email,
    conversationId: context?.conversation?.id,
    contactId: context?.contact?.id
  };
};