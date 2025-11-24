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
      console.log('ℹ️ App rodando fora de iframe (modo standalone)');
      setLoading(false);
      return;
    }

    console.log('🎯 App detectado dentro de iframe - Iniciando comunicação com Chatwoot');
    console.log('📍 Parent origin:', document.referrer || 'unknown');
    console.log('📍 Current URL:', window.location.href);

    let messageCount = 0;

    const handleMessage = (event: MessageEvent) => {
      messageCount++;
      
      // Log TODAS as mensagens para debug (mesmo de outras origens)
      console.log(`📨 Mensagem #${messageCount} recebida:`, {
        origin: event.origin,
        source: event.source === window.parent ? 'parent' : 'other',
        data: event.data,
        type: typeof event.data
      });

      // Aceitar apenas mensagens do parent (Chatwoot)
      if (event.source !== window.parent) {
        console.log('⚠️ Mensagem ignorada: não veio do parent');
        return;
      }

      const data = event.data;
      
      // Tentar parsear se for string
      let payload = data;
      if (typeof data === 'string') {
        try {
          payload = JSON.parse(data);
          console.log('✅ Payload parseado:', payload);
        } catch (e) {
          console.log('⚠️ Payload não é JSON válido:', data);
          return;
        }
      }

      // O Chatwoot envia o contexto no formato: { event: 'push.event', data: {...} }
      if (payload?.event === 'push.event' && payload?.data) {
        console.log('✅ Contexto completo recebido do Chatwoot:', payload.data);
        
        setContext({
          user: payload.data.user,
          account: payload.data.account,
          conversation: payload.data.conversation,
          contact: payload.data.contact,
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
      
      console.log('📤 Mensagem enviada para parent com evento: chatwoot-dashboard-app:ready');
    };

    // Enviar ready após um pequeno delay para garantir que o Chatwoot está escutando
    setTimeout(notifyReady, 100);
    
    // Timeout de segurança: se após 10s não receber contexto, parar de carregar
    const timeout = setTimeout(() => {
      if (!context) {
        console.warn('⚠️ Timeout: Contexto do Chatwoot não recebido após 10s');
        console.warn(`⚠️ Total de mensagens recebidas: ${messageCount}`);
        console.warn('⚠️ Verifique se o Dashboard App foi configurado corretamente no Chatwoot');
        console.warn('⚠️ Verifique também se há erros de CORS no console do Chatwoot');
        
        // Modo de teste: usar dados mock se não receber contexto
        console.log('🧪 Ativando modo de teste com dados mock');
        setContext({
          user: {
            id: 1,
            name: 'Diego Bortoli (Teste)',
            email: 'diego.bortoli@kbtech.com.br'
          },
          account: {
            id: 1,
            name: 'KB Tech (Teste)'
          },
          conversation: {
            id: 999,
            contact_id: 1,
            status: 'open',
            inbox_id: 1
          },
          contact: {
            id: 1,
            name: 'Cliente Teste',
            email: 'cliente@teste.com'
          }
        });
        
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