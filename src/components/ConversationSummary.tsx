import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';
import ChatMessageBubble from './ChatMessageBubble';
import { useRef, useEffect } from 'react';

interface ConversationSummaryProps {
  summary?: string;
  description?: string;
}

type Role = 'agent' | 'client' | 'system';

interface ParsedMessage {
  role: Role;
  time?: string;
  name?: string;
  message: string;
  isContinuation?: boolean;
}

/**
 * Normaliza o nome removendo emojis e labels técnicos
 */
function cleanName(raw: string): string {
  return raw
    .replace(/🧑‍💼|👤/g, '')
    .replace(/\b(Atendente|Agente|Cliente)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Verifica se a mensagem é "lixo" do sistema
 */
function isNoise(message: string, name?: string): boolean {
  if (!message) return true;
  const cleanMsg = message.trim();
  
  if (name && (
    cleanMsg === `*${name}:*` || 
    cleanMsg === `*${name}*` || 
    cleanMsg === `${name}:`
  )) {
    return true;
  }
  
  return false;
}

export const ConversationSummary = ({ summary, description }: ConversationSummaryProps) => {
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
    
    let lastRole: Role = 'system'; // Começa como sistema para segurança
    let lastName: string | undefined = undefined;

    lines.forEach((line) => {
      const raw = line.trim();
      
      // Regex para capturar formato: [DATA HORA] EMOJI LABEL NOME: MENSAGEM
      const strictRegex = /^\[(.*?)\]\s*(?:(🧑‍💼|👤)\s*(?:Atendente|Agente|Cliente)?\s*)?([^:]+):\s*(.+)$/i;
      const match = raw.match(strictRegex);

      if (match) {
        const time = match[1];
        const marker = match[2] || '';
        const rawName = match[3];
        const messageContent = match[4];
        const displayName = cleanName(rawName);

        if (isNoise(messageContent, displayName)) return;

        let role: Role = 'client';
        if (marker === '🧑‍💼' || /\b(atendente|agente|kb tech|suporte)\b/i.test(rawName)) {
          role = 'agent';
        } else if (marker === '👤' || /\bcliente\b/i.test(rawName)) {
          role = 'client';
        }

        lastRole = role;
        lastName = displayName;

        parsedMessages.push({
          role,
          time,
          name: displayName,
          message: messageContent,
          isContinuation: false
        });
        return;
      }

      // Verifica se é evento de sistema
      if (
        /conversa.*encerrad/i.test(raw) ||
        /transferid/i.test(raw) ||
        /atribuíd/i.test(raw) ||
        /iniciada/i.test(raw) ||
        /etiqueta/i.test(raw)
      ) {
        // Tenta extrair hora se existir
        const timeMatch = raw.match(/^\[(.*?)\]/);
        const time = timeMatch ? timeMatch[1] : undefined;
        const message = raw.replace(/^\[.*?\]\s*/, '');
        
        parsedMessages.push({
          role: 'system',
          time,
          message,
          isContinuation: false
        });
        // Não atualiza lastRole para sistema, mantém o último contexto de fala
        return;
      }

      // Se não é cabeçalho nem sistema, assume continuação da última mensagem
      if (lastRole !== 'system') {
        parsedMessages.push({
          role: lastRole,
          name: lastName,
          message: raw,
          isContinuation: true
        });
      } else {
        // Se não tem contexto, trata como sistema (centralizado)
        parsedMessages.push({
          role: 'system',
          message: raw,
          isContinuation: false
        });
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
                backgroundSize: 'cover', // Ajusta para cobrir o container
                backgroundPosition: 'center',
                backgroundBlendMode: 'overlay' // Suaviza com a cor de fundo
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