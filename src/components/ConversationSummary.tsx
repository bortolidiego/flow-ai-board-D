import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Tenta identificar timestamp [DD/MM/YYYY HH:MM]
 */
function extractTime(line: string) {
  const m = line.match(/\[(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2})\]/);
  return m ? m[1] : undefined;
}

/**
 * Normaliza a linha removendo timestamp inicial
 */
function stripTime(line: string) {
  return line.replace(/^\s*\[\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}\]\s*/, '').trim();
}

interface ChatMessage {
  time?: string;
  name: string;
  message: string;
  isSystem?: boolean;
}

interface ConversationSummaryProps {
  summary?: string | null;
  description?: string | null;
}

export function ConversationSummary({ summary, description }: ConversationSummaryProps) {
  const messages = useMemo(() => {
    if (!description) return [];
    
    const lines = description.split('\n').filter(line => line.trim());
    const chatMessages: ChatMessage[] = [];
    
    for (const line of lines) {
      const time = extractTime(line);
      const cleanLine = stripTime(line);
      
      // Tentar extrair nome e mensagem
      const match = cleanLine.match(/^(.+?):\s*(.+)$/);
      if (match) {
        const [, name, message] = match;
        chatMessages.push({
          time,
          name: name.trim(),
          message: message.trim(),
          isSystem: name.toLowerCase().includes('sistema') || name.toLowerCase().includes('bot')
        });
      }
    }
    
    return chatMessages;
  }, [description]);

  if (!summary && !description) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="w-5 h-5 text-primary" />
          Resumo da Conversa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {summary && (
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-sm text-foreground">{summary}</p>
          </div>
        )}
        
        {messages.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Histórico de Mensagens:</h4>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {messages.map((msg, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  {(msg.time || msg.name) && (
                    <span className="mr-1 text-[11px] text-muted-foreground tabular-nums">
                      [{msg.time}] {msg.name}:
                    </span>
                  )}
                  <span className={cn(!msg.isSystem && msg.name ? "ml-1" : "")}>
                    {msg.message || "(sem texto)"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}