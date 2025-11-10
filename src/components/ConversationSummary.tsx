import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';
import ChatMessageBubble from './ChatMessageBubble';

interface ConversationSummaryProps {
  summary?: string;
  description?: string;
}

type ParsedLine =
  | { role: 'agent' | 'client'; time?: string; name?: string; message: string }
  | { role: 'system'; message: string; time?: string };

/**
 * Tenta identificar timestamp [HH:MM]
 */
function extractTime(line: string) {
  const m = line.match(/\[(\d{2}:\d{2})\]/);
  return m ? m[1] : undefined;
}

/**
 * Normaliza a linha removendo timestamp inicial
 */
function stripTime(line: string) {
  return line.replace(/^\s*\[\d{2}:\d{2}\]\s*/, '').trim();
}

/**
 * Detecta papel por keywords/emoji e extrai nome/mensagem
 * Aceita padrões do webhook como:
 * [20:34] 🧑‍💼 Atendente Diego: mensagem
 * [20:34] 🧑‍💼 Diego Bortoli: mensagem
 * [20:34] 👤 Cliente João: mensagem
 * [20:34] 👤 João: mensagem
 */
function parseLine(raw: string): ParsedLine {
  const time = extractTime(raw);
  const line = stripTime(raw);

  const lower = line.toLowerCase();

  const isAgent =
    line.includes('🧑‍💼') ||
    lower.includes('atendente ');
  const isClient =
    line.includes('👤') ||
    lower.includes('cliente ');

  // Regex ampla: (emoji|rótulo) nome: mensagem
  const contentMatch =
    line.match(/(?:🧑‍💼|👤|Atendente|Cliente)\s*([^:]+):\s*(.*)$/i) ||
    line.match(/^([^:]+):\s*(.*)$/); // fallback "Nome: mensagem"

  if (isAgent || isClient) {
    const role = isAgent ? 'agent' : 'client';
    if (contentMatch) {
      const name = (contentMatch[1] || '').trim();
      const message = (contentMatch[2] || '').trim();
      return { role, time, name, message };
    }
    return { role, time, name: undefined, message: line };
  }

  // Sem agente/cliente detectado -> mensagem de sistema
  // Se houver apenas uma palavra curta (ex.: "ok", "boa tarde"), ainda exibe como system
  return { role: 'system', time, message: line || raw };
}

export const ConversationSummary = ({ summary, description }: ConversationSummaryProps) => {
  const renderDescription = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n').filter((l) => l.trim().length > 0);

    return lines.map((line, idx) => {
      const parsed = parseLine(line);

      if (parsed.role === 'agent' || parsed.role === 'client') {
        return (
          <ChatMessageBubble
            key={idx}
            role={parsed.role}
            time={parsed.time}
            name={parsed.name}
            message={parsed.message}
          />
        );
      }

      // system
      return (
        <ChatMessageBubble
          key={idx}
          role="system"
          time={parsed.time}
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
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
              Ver conversa completa
            </summary>
            <div className="mt-2 p-3 bg-muted/30 rounded-lg max-h-[400px] overflow-y-auto">
              <div className="space-y-2">
                {renderDescription(description)}
              </div>
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
};