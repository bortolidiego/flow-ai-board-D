import { createContext, useContext, ReactNode } from 'react';
import { useChatwootContext } from '@/hooks/useChatwootContext';

export interface ChatwootContextType {
  isChatwootFrame: boolean;
  context: any;
  loading: boolean;
  appType: 'dashboard' | 'contact_sidebar' | 'conversation_sidebar' | null;
  agentName: string | undefined;
  agentEmail: string | undefined;
  conversationId: number | undefined;
  contactId: number | undefined;
  contactEmail: string | undefined;
  contactName: string | undefined;
  contactPhone: string | undefined;
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