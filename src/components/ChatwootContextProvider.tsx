import { createContext, useContext, ReactNode } from 'react';
import { useChatwootContext } from '@/hooks/useChatwootContext';

interface ChatwootContextType {
  isChatwootFrame: boolean;
  context: any;
  loading: boolean;
  agentName: string | undefined;
  agentEmail: string | undefined;
  conversationId: number | undefined;
  contactId: number | undefined;
}

const ChatwootContext = createContext<ChatwootContextType | undefined>(undefined);

export function ChatwootContextProvider({ children }: { children: ReactNode }) {
  const chatwootContext = useChatwootContext();
  
  return (
    <ChatwootContext.Provider value={chatwootContext}>
      {children}
    </ChatwootContext.Provider>
  );
}

export function useChatwoot() {
  const context = useContext(ChatwootContext);
  if (context === undefined) {
    throw new Error('useChatwoot must be used within a ChatwootContextProvider');
  }
  return context;
}