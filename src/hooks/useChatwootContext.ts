import { useState, useEffect } from 'react';
import { ChatwootContextType } from '@/components/ChatwootContextProvider'; // Import the type

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

export const useChatwootContext = (): ChatwootContextType => { // Explicitly define return type
  const [context, setContext] = useState<ChatwootContextData | null>(null);
  const [isChatwootFrame, setIsChatwootFrame] = useState(false);
  const [loading, setLoading] = useState(true);
  const [appType, setAppType] = useState<'dashboard' | 'contact_sidebar' | 'conversation_sidebar' | null>(null);

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
    let timeoutId: NodeJS.Timeout | null = null;

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

      // Formato 1: { event: 'push.event', data: {...} } ou { event: 'appContext', data: {...} }
      if ((payload?.event === 'push.event' || payload?.event === 'appContext') && payload?.data) {
        console.log('✅ Contexto completo recebido do Chatwoot (formato event):', payload.event, payload.data);

        // Limpar timeout já que recebemos o contexto
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        const chatwootData = payload.data;
        setContext({
          user: chatwootData.user,
          account: chatwootData.account,
          conversation: chatwootData.conversation,
          contact: chatwootData.contact,
        });

        // Determinar o tipo de app baseado nos dados recebidos
        if (chatwootData.conversation && chatwootData.contact) {
          // Se temos conversa E contato, pode ser dashboard ou conversation sidebar
          // Verificar se estamos em uma conversa específica
          if (chatwootData.conversation.id) {
            setAppType('conversation_sidebar');
            console.log('🎯 Detectado: Conversation Sidebar (barra lateral da conversa)');
          } else {
            setAppType('contact_sidebar');
            console.log('🎯 Detectado: Contact Sidebar (aba do contato)');
          }
        } else if (chatwootData.contact && !chatwootData.conversation) {
          setAppType('contact_sidebar');
          console.log('🎯 Detectado: Contact Sidebar (aba do contato)');
        } else if (chatwootData.conversation && !chatwootData.contact) {
          setAppType('conversation_sidebar');
          console.log('🎯 Detectado: Conversation Sidebar (barra lateral da conversa)');
        } else {
          setAppType('dashboard');
          console.log('🎯 Detectado: Dashboard App (página principal)');
        }

        setLoading(false);
      }
      // Formato 2: Direto com user, account, conversation, contact
      else if (payload?.user || payload?.account || payload?.conversation || payload?.contact) {
        console.log('✅ Contexto completo recebido do Chatwoot (formato direto):', payload);

        // Limpar timeout já que recebemos o contexto
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        setContext({
          user: payload.user,
          account: payload.account,
          conversation: payload.conversation,
          contact: payload.contact,
        });

        // Determinar o tipo de app
        if (payload.conversation && payload.contact) {
          if (payload.conversation.id) {
            setAppType('conversation_sidebar');
            console.log('🎯 Detectado: Conversation Sidebar');
          } else {
            setAppType('contact_sidebar');
            console.log('🎯 Detectado: Contact Sidebar');
          }
        } else if (payload.contact && !payload.conversation) {
          setAppType('contact_sidebar');
          console.log('🎯 Detectado: Contact Sidebar');
        } else if (payload.conversation && !payload.contact) {
          setAppType('conversation_sidebar');
          console.log('🎯 Detectado: Conversation Sidebar');
        } else {
          setAppType('dashboard');
          console.log('🎯 Detectado: Dashboard App');
        }

        setLoading(false);
      } else {
        console.log('⚠️ Mensagem recebida mas não contém contexto esperado:', payload);
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

    // Timeout de segurança: se após 3s não receber contexto, mostrar erro
    timeoutId = setTimeout(() => {
      if (!context) {
        console.error('❌ Timeout: Contexto do Chatwoot não recebido após 3s');
        console.error(`❌ Total de mensagens recebidas: ${messageCount}`);
        console.error('❌ Verifique se o Dashboard App foi configurado corretamente no Chatwoot');
        console.error('❌ A primeira mensagem recebida deve conter: user, account, conversation, contact');

        // NÃO usar dados mock - forçar erro para debug
        setLoading(false);
        setAppType(null);
      }
    }, 3000); // Reduzido de 10s para 3s

    return () => {
      window.removeEventListener('message', handleMessage);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const requestConversationUpdate = () => {
    if (!isChatwootFrame) return;
    console.log('📤 Solicitando atualização de contexto ao Chatwoot');
    window.parent.postMessage(
      JSON.stringify({ event: 'chatwoot-dashboard-app:fetch-info' }),
      '*'
    );
  };

  const notifyCardUpdate = (label: string) => {
    if (!isChatwootFrame) return;
    console.log('📤 Notificando Chatwoot sobre atualização:', label);
    // Exemplo: adicionar label na conversa
    window.parent.postMessage(
      JSON.stringify({
        event: 'chatwoot-dashboard-app:set-label',
        label
      }),
      '*'
    );
  };

  return {
    isChatwootFrame,
    context,
    loading,
    appType,
    agentName: context?.user?.name,
    agentEmail: context?.user?.email,
    conversationId: context?.conversation?.id,
    contactId: context?.contact?.id,
    contactEmail: context?.contact?.email,
    contactName: context?.contact?.name,
    contactPhone: context?.contact?.phone_number,
    requestConversationUpdate,
    notifyCardUpdate
  };
};