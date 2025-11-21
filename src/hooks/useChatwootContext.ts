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
    const handleMessage = (event: MessageEvent) => {
      // Verificar se é uma mensagem do Chatwoot
      if (event.data && typeof event.data === 'string' && event.data.startsWith('chatwoot-widget:')) {
        try {
          const payload = JSON.parse(event.data.replace('chatwoot-widget:', ''));
          
          console.log('📬 Chatwoot postMessage recebido:', payload);
          
          switch (payload.event) {
            case 'chatwoot:ready':
              // Solicitar contexto inicial
              window.parent.postMessage('chatwoot-widget:{ "event": "request-context" }', '*');
              break;
              
            case 'chatwoot:user:set':
              setContext(prev => ({
                ...prev,
                user: payload.data
              }));
              break;
              
            case 'chatwoot:conversation:started':
            case 'chatwoot:conversation:loaded':
              setContext(prev => ({
                ...prev,
                conversation: payload.data
              }));
              break;
              
            case 'chatwoot:contact:set':
              setContext(prev => ({
                ...prev,
                contact: payload.data
              }));
              break;
          }
        } catch (e) {
          console.warn('Erro ao parsear mensagem do Chatwoot:', e);
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Verificar se estamos em um iframe
    const inIframe = window.self !== window.top;
    setIsChatwootFrame(inIframe);
    
    if (inIframe) {
      // Enviar mensagem para solicitar contexto
      window.parent.postMessage('chatwoot-widget:{ "event": "request-context" }', '*');
    }
    
    setLoading(false);

    return () => {
      window.removeEventListener('message', handleMessage);
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