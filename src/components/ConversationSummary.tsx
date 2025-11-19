import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';
import ChatMessageBubble from './ChatMessageBubble';
import { useRef, useEffect } from 'react';

interface ConversationSummaryProps {
  summary?: string;
  description?: string;
  agentName?: string;
}

type Role = 'agent' | 'client' | 'system';

interface ParsedMessage {
  role: Role;
  time?: string;
  name?: string;
  message: string;
  isContinuation?: boolean;
}

function cleanName(raw: string): string {
  return raw
    .replace(/[*:]/g, '')
    .replace(/🧑‍💼|👤/g, '')
    .replace(/\b(Atendente|Agente|Cliente)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTime(raw: string): string | undefined {
  const bracketMatch = raw.match(/\[(.*?)\]/);
  if (bracketMatch) return bracketMatch[1];
  const timeMatch = raw.match(/\b\d{1,2}:\d{2}\b/);
  if (timeMatch) return timeMatch[0];
  return undefined;
}

export const ConversationSummary = ({ summary, description, agentName }: ConversationSummaryProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [description]);

  const parseMessages = (text: string): ParsedMessage[] => {
    if (!text) return [];
    
    const lines = text.split('\n').filter((l) => l.trim().length > 0);
    const parsedMessages: ParsedMessage[] = [];
    
    let lastRole: Role = 'system';
    let lastName: string = 'Sistema';
    let pendingTime: string | undefined = undefined;

    lines.forEach((line) => {
      const raw = line.trim();

      // 1. System Events
      if (/conversa.*encerrad|transferid|atribuíd|iniciada|etiqueta/i.test(raw)) {
         const timeMatch = raw.match(/^\[(.*?)\]/);
         parsedMessages.push({
           role: 'system',
           time: timeMatch ? timeMatch[1] : undefined,
           message: raw.replace(/^\[.*?\]\s*/, ''),
           isContinuation: false
         });
         return;
      }

      // 2. Check for Header lines (Header ONLY, no content)
      // Matches: [19/11 14:18] *Diego Bortoli:* 
      // Matches: *Diego Bortoli:*
      const headerOnlyRegex = /^(\[(.*?)\])?\s*(?:[*-]?\s*)?(?:(🧑‍💼|👤)\s*)?([^*:]+?)(?:\s*[:*]+)?$/;
      const headerMatch = raw.match(headerOnlyRegex);
      
      // Ensure it's not a simple short message by checking specific header traits or if it ends in colon
      // The regex above is generous, so we verify if it ends with colon or is wrapped in *
      const isExplicitHeader = raw.endsWith(':') || raw.endsWith(':*') || /^\*.*\*:?$/.test(raw);

      if (isExplicitHeader && headerMatch) {
        const time = headerMatch[2];
        const rawName = headerMatch[4];
        const name = cleanName(rawName);
        
        if (time) pendingTime = time;
        
        // Determine role
        let newRole: Role = 'client';
        const lowerName = name.toLowerCase();
        const lowerAgentName = agentName?.toLowerCase();

        if (/\b(atendente|agente|kb tech|suporte)\b/.test(lowerName)) {
          newRole = 'agent';
        } else if (lowerAgentName && lowerName.includes(lowerAgentName)) {
          newRole = 'agent';
        } else if (lowerAgentName && lowerName === lowerAgentName) {
          newRole = 'agent';
        } else if (lastRole === 'agent' && lastName === name) {
          // Keep previous if name matches
          newRole = 'agent';
        } else {
          newRole = 'client';
        }

        lastRole = newRole;
        lastName = name;
        return; // Consumed as header
      }

      // 3. Standard/Combined Message Line (Header + Content)
      const standardMatch = raw.match(/^\[(.*?)\]\s*(?:(🧑‍💼|👤)\s*)?([^:]+):\s*(.+)$/);
      if (standardMatch) {
        const time = standardMatch[1];
        const rawName = standardMatch[3];
        const content = standardMatch[4];
        const name = cleanName(rawName);
        
        let role: Role = 'client';
        const lowerName = name.toLowerCase();
        if (/\b(atendente|agente|suporte)\b/.test(lowerName) || (agentName && lowerName.includes(agentName.toLowerCase()))) {
          role = 'agent';
        }

        lastRole = role;
        lastName = name;
        pendingTime = undefined;

        parsedMessages.push({
          role,
          time,
          name,
          message: content,
          isContinuation: false
        });
        return;
      }

      // 4. Content Line (using context from Header)
      if (lastRole !== 'system') {
         const isSameUser = parsedMessages.length > 0 && 
                            parsedMessages[parsedMessages.length - 1].role === lastRole &&
                            parsedMessages[parsedMessages.length - 1].name === lastName;
                            
         parsedMessages.push({
           role: lastRole,
           time: pendingTime, // Apply pending time
           name: lastName,
           message: raw,
           isContinuation: !pendingTime && isSameUser // If we have new time, it's a new bubble
         });
         pendingTime = undefined;
      } else {
         // Fallback for content without context
         parsedMessages.push({
            role: 'client',
            message: raw,
            isContinuation: false
         });
         lastRole = 'client';
         lastName = 'Cliente';
      }
    });

    return parsedMessages;
  };

  const messages = parseMessages(description || '');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="w-5 h-5 text-primary" />
          Resumo da Conversa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {summary ? (
          <div className="p-3 bg-muted/50 rounded-lg border-l-4 border-primary">
            <p className="text-sm text-foreground leading-relaxed">{summary}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            Clique em "Analisar com IA" para gerar um resumo inteligente desta conversa.
          </p>
        )}

        {description && (
          <div className="mt-6 border rounded-xl overflow-hidden">
            <div className="bg-muted px-4 py-2 border-b flex justify-between items-center">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Chat Histórico
              </p>
              <span className="text-xs text-muted-foreground">{messages.length} mensagens</span>
            </div>
            
            <div 
              ref={scrollRef}
              className="p-4 h-[500px] overflow-y-auto bg-[#e5ddd5] dark:bg-[#0b141a]"
              style={{ 
                backgroundImage: "url('/chat-bg.jpg')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundBlendMode: 'overlay'
              }}
            >
              <div className="flex flex-col gap-1">
                {messages.length === 0 ? (
                  <p className="text-sm text-center text-gray-500 bg-white/80 dark:bg-black/50 p-2 rounded mx-auto inline-block">
                    Nenhuma mensagem legível encontrada.
                  </p>
                ) : (
                  messages.map((msg, idx) => (
                    <ChatMessageBubble
                      key={idx}
                      role={msg.role}
                      time={msg.time}
                      name={msg.name}
                      message={msg.message}
                      isContinuation={msg.isContinuation}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};