import { useState, useEffect } from 'react';

interface ChatwootUser {
  id: number;
  name: string;
  email: string;
}

interface ChatwootContextData {
  user?: ChatwootUser;
  account?: any;
  conversation?: any;
}

export const useChatwootContext = () => {
  const [context, setContext] = useState<ChatwootContextData | null>(null);
  const [isChatwoot, setIsChatwoot] = useState(false);

  useEffect(() => {
    // Função para lidar com mensagens vindas do pai (Chatwoot)
    const handleMessage = (event: MessageEvent) => {
      // Verifica se é um evento de contexto do Chatwoot
      // O formato exato pode variar dependendo da versão, mas geralmente vem em data
      const eventData = event.data;

      // Log para debug (ajuda a ver o que o Chatwoot está mandando)
      if (eventData && (eventData.event === 'appContext' || eventData.type === 'dashboard:ready')) {
        console.log('Chatwoot Context Received:', eventData);
        setIsChatwoot(true);
        
        if (eventData.data) {
          setContext(eventData.data);
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Tenta avisar o pai que estamos prontos (algumas versões requerem handshake)
    window.parent.postMessage('app:ready', '*');

    // Check se está em iframe
    const inIframe = window.self !== window.top;
    if (inIframe) {
        // As vezes o postMessage demora, podemos assumir chatwoot se estivermos em iframe
        // e aguardar os dados
        // setIsChatwoot(true); 
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  return {
    isChatwoot,
    agentName: context?.user?.name,
    agentEmail: context?.user?.email,
    context
  };
};