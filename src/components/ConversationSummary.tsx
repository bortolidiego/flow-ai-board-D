import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';
import ChatMessageBubble from './ChatMessageBubble';

interface ConversationSummaryProps {
  summary?: string;
  description?: string;
}

type Role = 'agent' | 'client' | 'system';

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
 * Parser principal das linhas do chat
 */
function parseLine(raw: string): { role: Role; time?: string; name?: string; message?: string } {
  const line = raw.trim();
  if (!line) return { role: 'unknown' as any };

  // Regex para capturar formato: [DATA HORA] EMOJI LABEL NOME: MENSAGEM
  // Ex: [10/11 14:30] 🧑‍💼 Atendente Diego: Olá
  // Grupo 1: Data/Hora
  // Grupo 2: Emoji e Label (Opcional)
  // Grupo 3: Nome
  // Grupo 4: Mensagem
  const strictRegex = /^\[(.*?)\]\s*(?:(🧑‍💼|👤)\s*(?:Atendente|Agente|Cliente)?\s*)?([^:]+):\s*(.+)$/i;
  const match = line.match(strictRegex);

  if (match) {
    const time = match[1];
    const marker = match[2] || ''; // Emoji
    const rawName = match[3];
    const message = match[4];

    let role: Role = 'client'; // Default fallback

    // Determina role pelo emoji ou keywords no nome
    if (marker === '🧑‍💼' || /\b(atendente|agente)\b/i.test(rawName)) {
      role = 'agent';
    } else if (marker === '👤' || /\bcliente\b/i.test(rawName)) {
      role = 'client';
    }

    // Limpa o nome para exibição
    const displayName = cleanName(rawName);

    return { role, time, name: displayName, message };
  }

  // Fallback para linhas de sistema ou formatos antigos
  if (
    /conversa.*encerrad/i.test(line) ||
    /transferid/i.test(line) ||
    /atribuíd/i.test(line)
  ) {
    // Tenta extrair hora se houver
    const timeMatch = line.match(/^\[(.*?)\]/);
    const time = timeMatch ? timeMatch[1] : undefined;
    const message = line.replace(/^\[.*?\]\s*/, '');
    return { role: 'system', time, message };
  }

  return { role: 'client', message: line }; // Fallback final
}

export const ConversationSummary = ({ summary, description }: ConversationSummaryProps) => {
  const renderDescription = (text: string) => {
    if (!text) return null;
    
    const lines = text.split('\n').filter((l) => l.trim().length > 0);
    
    return lines.map((line, idx) => {
      const parsed = parseLine(line);
      
      // Se falhou em parsear algo útil, pula ou renderiza genérico
      if (!parsed.message) return null;

      return (
        <ChatMessageBubble
          key={idx}
          role={parsed.role}
          time={parsed.time}
          name={parsed.name}
          message={parsed.message}
        />
      );
    });
  };

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
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-foreground leading-relaxed">{summary}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            Nenhum resumo disponível ainda. Clique em "Analisar com IA" para gerar.
          </p>
        )}

        {description && (
          <details className="mt-4" open>
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground mb-2">
              Ver conversa completa
            </summary>
            <div className="p-3 bg-muted/10 rounded-lg max-h-[500px] overflow-y-auto border border-border/50">
              <div className="flex flex-col gap-1">
                {renderDescription(description)}
              </div>
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
};