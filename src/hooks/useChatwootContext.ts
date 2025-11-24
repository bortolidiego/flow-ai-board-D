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
      // Log de todas as mensagens recebidas para debug
      console.log('📨 Mensagem recebida:', event.data);

      // Aceitar mensagens do Chatwoot em diferentes formatos
      if (!event.data) return;

      let payload;
      
      // Tentar parsear se for string
      if (typeof event.data === 'string') {
        try {
          payload = JSON.parse(event.data);
        } catch {
          // Se não for JSON válido, ignorar
          return;
        }
      } else {
        payload = event.data;
      }

      // Processar eventos do Chatwoot
      if (payload.event) {
        console.log('🎯 Evento Chatwoot:', payload.event, payload);
        
        switch (payload.event) {
          case 'push.event':
            // Chatwoot envia contexto via push.event
            if (payload.data) {
              console.log('📦 Contexto recebido via push.event:', payload.data);
              setContext(prev => ({
                ...prev,
                ...payload.data
              }));
            }
            break;
            
          case 'chatwoot:ready':
            console.log('✅ Chatwoot está pronto');
            break;
            
          case 'chatwoot:user:set':
            console.log('👤 Usuário definido:', payload.data);
            setContext(prev => ({
              ...prev,
              user: payload.data
            }));
            break;
            
          case 'chatwoot:conversation:started':
          case 'chatwoot:conversation:loaded':
          case 'chatwoot:conversation:selected':
            console.log('💬 Conversa carregada:', payload.data);
            setContext(prev => ({
              ...prev,
              conversation: payload.data
            }));
            break;
            
          case 'chatwoot:contact:set':
            console.log('📇 Contato definido:', payload.data);
            setContext(prev => ({
              ...prev,
              contact: payload.data
            }));
            break;
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Enviar mensagem de "ready" para o Chatwoot
    const sendReady = () => {
      console.log('📤 Enviando mensagem de ready para o Chatwoot');
      
      // Tentar diferentes formatos de mensagem
      window.parent.postMessage({ event: 'chatwoot:ready' }, '*');
      window.parent.postMessage('chatwoot-dashboard-app:ready', '*');
      
      // Solicitar contexto
      setTimeout(() => {
        console.log('📤 Solicitando contexto ao Chatwoot');
        window.parent.postMessage({ event: 'chatwoot:request-context' }, '*');
      }, 500);
    };

    // Enviar ready imediatamente e depois periodicamente até receber contexto
    sendReady();
    
    const readyInterval = setInterval(() => {
      if (!context?.conversation) {
        console.log('⏰ Reenviando ready (ainda sem contexto)');
        sendReady();
      } else {
        console.log('✅ Contexto recebido, parando envio de ready');
        clearInterval(readyInterval);
      }
    }, 2000);

    // Timeout para parar de tentar após 30 segundos
    const timeout = setTimeout(() => {
      clearInterval(readyInterval);
      console.warn('⚠️ Timeout: Não foi possível receber contexto do Chatwoot após 30s');
      setLoading(false);
    }, 30000);

    setLoading(false);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(readyInterval);
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