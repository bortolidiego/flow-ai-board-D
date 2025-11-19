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
 * Limpa formatação de nomes (remove * e :)
 */
function cleanName(raw: string): string {
  return raw
    .replace(/[*:]/g, '') // Remove asteriscos e dois pontos
    .replace(/🧑‍💼|👤/g, '') // Remove emojis
    .replace(/\b(Atendente|Agente|Cliente)\b/gi, '') // Remove labels técnicos
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tenta extrair data/hora de strings variadas
 */
function extractTime(raw: string): string | undefined {
  // Tenta formato [DD/MM/YYYY HH:mm] ou [HH:mm]
  const bracketMatch = raw.match(/\[(.*?)\]/);
  if (bracketMatch) return bracketMatch[1];
  
  // Tenta encontrar hora solta HH:mm no final ou início
  const timeMatch = raw.match(/\b\d{1,2}:\d{2}\b/);
  if (timeMatch) return timeMatch[0];
  
  return undefined;
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
    
    let lastRole: Role = 'system';
    let lastName: string | undefined = undefined;

    lines.forEach((line) => {
      const raw = line.trim();
      
      // --- TENTATIVA 1: Formato Novo Padronizado ---
      // Ex: [14/11 10:00] 🧑‍💼 Atendente Diego: Olá
      const standardRegex = /^\[(.*?)\]\s*(?:(🧑‍💼|👤)\s*(?:Atendente|Agente|Cliente)?\s*)?([^:]+):\s*(.+)$/i;
      const standardMatch = raw.match(standardRegex);

      if (standardMatch) {
        const time = standardMatch[1];
        const marker = standardMatch[2] || '';
        const rawName = standardMatch[3];
        const content = standardMatch[4];
        const name = cleanName(rawName);

        let role: Role = 'client';
        if (marker === '🧑‍💼' || /\b(atendente|agente|suporte)\b/i.test(rawName)) {
          role = 'agent';
        } else if (marker === '👤') {
          role = 'client';
        } else {
          // Fallback por nome se não tiver emoji
          role = name.toLowerCase().includes('bot') ? 'system' : 'client';
        }

        lastRole = role;
        lastName = name;

        parsedMessages.push({ role, time, name, message: content, isContinuation: false });
        return;
      }

      // --- TENTATIVA 2: Formato Antigo / Chatwoot Clássico ---
      // Ex: *Diego Bortoli:* Mensagem
      // Ex: Diego Bortoli: Mensagem
      const legacyRegex = /^(\*?[^*:]+\*?):\s*(.+)$/;
      const legacyMatch = raw.match(legacyRegex);

      if (legacyMatch) {
        const rawName = legacyMatch[1];
        const content = legacyMatch[2];
        const name = cleanName(rawName);
        
        // Tenta achar hora dentro do conteúdo (alguns formatos colocam no fim)
        let time = extractTime(raw);
        
        // Limpa a mensagem se a hora estiver nela
        let cleanContent = content;
        if (time) {
             cleanContent = content.replace(`[${time}]`, '').trim();
        }

        // Inferir role
        // Se não temos certeza, assumimos cliente, a menos que seja o mesmo nome do último agente conhecido
        let role: Role = 'client'; 
        if (lastRole === 'agent' && lastName === name) {
            role = 'agent';
        }

        lastRole = role;
        lastName = name;

        parsedMessages.push({ role, time, name, message: cleanContent, isContinuation: false });
        return;
      }

      // --- TENTATIVA 3: Mensagens de Sistema ---
      if (
        /conversa.*encerrad/i.test(raw) ||
        /transferid/i.test(raw) ||
        /atribuíd/i.test(raw) ||
        /iniciada/i.test(raw) ||
        /etiqueta/i.test(raw)
      ) {
        const time = extractTime(raw);
        const message = raw.replace(/\[.*?\]/, '').trim();
        
        parsedMessages.push({ role: 'system', time, message, isContinuation: false });
        return;
      }

      // --- TENTATIVA 4: Continuação (linhas soltas) ---
      // "oieee", "opa tudo bem"
      // Assume que pertence à última pessoa que falou
      if (lastRole !== 'system') {
        parsedMessages.push({
          role: lastRole,
          name: lastName,
          message: raw,
          isContinuation: true, // Isso agrupa visualmente
          time: undefined // Geralmente continuações imediatas não têm hora nova repetida
        });
      } else {
        // Se começou com linha solta sem contexto, trata como sistema ou cliente default
        parsedMessages.push({
          role: 'client', // Default seguro
          message: raw,
          isContinuation: false
        });
        lastRole = 'client';
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