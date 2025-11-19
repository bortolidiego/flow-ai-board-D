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
 * Verifica se a mensagem é "lixo" do sistema (ex: apenas o nome entre asteriscos)
 */
function isNoise(message: string, name?: string): boolean {
  if (!message) return true;
  const cleanMsg = message.trim();
  
  // Remove mensagens que são apenas "*Nome:*", "*Nome*", "Nome:"
  if (name && (
    cleanMsg === `*${name}:*` || 
    cleanMsg === `*${name}*` || 
    cleanMsg === `${name}:`
  )) {
    return true;
  }
  
  return false;
}

/**
 * Parser principal das linhas do chat
 */
function parseLine(raw: string): { role: Role; time?: string; name?: string; message?: string } | null {
  const line = raw.trim();
  if (!line) return null;

  // Regex para capturar formato: [DATA HORA] EMOJI LABEL NOME: MENSAGEM
  const strictRegex = /^\[(.*?)\]\s*(?:(🧑‍💼|👤)\s*(?:Atendente|Agente|Cliente)?\s*)?([^:]+):\s*(.+)$/i;
  const match = line.match(strictRegex);

  if (match) {
    const time = match[1]; // ex: 19/11 13:44
    const marker = match[2] || ''; // Emoji
    const rawName = match[3]; // Nome cru
    const message = match[4]; // Conteúdo

    // Limpa o nome
    const displayName = cleanName(rawName);

    // Se a mensagem for apenas o nome do usuário repetido (bug do chatwoot), ignora
    if (isNoise(message, displayName)) {
      return null;
    }

    let role: Role = 'client'; // Default

    // Determina role pelo emoji ou keywords no nome
    if (marker === '🧑‍💼' || /\b(atendente|agente|kb tech|suporte)\b/i.test(rawName)) {
      role = 'agent';
    } else if (marker === '👤' || /\bcliente\b/i.test(rawName)) {
      role = 'client';
    }

    return { role, time, name: displayName, message };
  }

  // Fallback para linhas de sistema
  if (
    /conversa.*encerrad/i.test(line) ||
    /transferid/i.test(line) ||
    /atribuíd/i.test(line) ||
    /iniciada/i.test(line)
  ) {
    const timeMatch = line.match(/^\[(.*?)\]/);
    const time = timeMatch ? timeMatch[1] : undefined;
    const message = line.replace(/^\[.*?\]\s*/, '');
    return { role: 'system', time, message };
  }

  // Se não casou com nada, retorna null para não sujar a tela, ou exibe como sistema se tiver conteúdo útil
  if (line.length > 3 && !line.startsWith('[')) {
      return { role: 'system', message: line };
  }

  return null;
}

export const ConversationSummary = ({ summary, description }: ConversationSummaryProps) => {
  const renderDescription = (text: string) => {
    if (!text) return null;
    
    const lines = text.split('\n').filter((l) => l.trim().length > 0);
    
    // Processa as linhas e filtra nulos
    const messages = lines
      .map(line => parseLine(line))
      .filter((msg): msg is NonNullable<typeof msg> => msg !== null);
    
    if (messages.length === 0) {
        return <p className="text-sm text-muted-foreground p-2">Nenhuma mensagem legível encontrada.</p>;
    }

    return messages.map((parsed, idx) => (
      <ChatMessageBubble
        key={idx}
        role={parsed.role}
        time={parsed.time}
        name={parsed.name}
        message={parsed.message || ''}
      />
    ));
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
          <div className="p-3 bg-muted/50 rounded-lg border-l-4 border-primary">
            <p className="text-sm text-foreground leading-relaxed">{summary}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            Clique em "Analisar com IA" para gerar um resumo inteligente desta conversa.
          </p>
        )}

        {description && (
          <div className="mt-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Histórico da Conversa
            </p>
            <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-border/50 max-h-[600px] overflow-y-auto shadow-inner">
              <div className="flex flex-col gap-1">
                {renderDescription(description)}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};