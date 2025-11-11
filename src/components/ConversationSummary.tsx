import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';
import ChatMessageBubble from './ChatMessageBubble';

interface ConversationSummaryProps {
  summary?: string;
  description?: string;
}

type Role = 'agent' | 'client' | 'system';
type ParsedRole = Role | 'unknown';

type ParsedLine = {
  role: ParsedRole;
  time?: string;
  name?: string;
  message?: string;
  metaNameOnly?: boolean;
};

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
 * Limpa nome removendo emojis/labels e espaços extras
 */
function normalizeName(raw?: string) {
  if (!raw) return undefined;
  return raw
    .replace(/🧑‍💼|👤/g, '')
    .replace(/\b(Atendente|Cliente)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Escapa nome para uso em regex
 */
function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Remove o prefixo redundante 'Nome:' (com ou sem emojis/itálico)
 * do início do conteúdo da mensagem, mantendo apenas uma ocorrência do nome.
 */
function dedupeMessage(name?: string, message?: string) {
  if (!message) return '';
  const msg = message.trim();
  const cleanName = normalizeName(name);
  if (!cleanName) return msg;

  // Padrão abrangente: emojis/labels, itálico/ênfase, espaços e dois-pontos
  const n = escapeRegExp(cleanName);
  const pattern = new RegExp(
    String.raw`^\s*(?:[\*\_\~"]*)\s*(?:🧑‍💼|👤|Atendente|Cliente)?\s*${n}\s*(?:[\*\_\~"]*)\s*:\s*(?:[\*\_\~"]*)\s*`,
    'i'
  );

  let out = msg.replace(pattern, '').trim();

  // Se ainda sobra apenas marcação sem conteúdo útil, limpar
  out = out.replace(/^[\*\_\~"\s]+$/, '').trim();

  // Evitar bolha vazia se a mensagem ficar sem conteúdo após a poda
  return out;
}

/**
 * Detecta se a linha é claramente de sistema (eventos)
 */
function isSystemEvent(line: string) {
  const lower = line.toLowerCase();
  return (
    /conversa.*encerrad/.test(lower) ||
    /transferid/.test(lower) ||
    /atribuíd|atribuid/.test(lower) ||
    /fechad|closed/.test(lower) ||
    /resolvid|finalizad/.test(lower)
  );
}

/**
 * Detecta papel por keywords/emoji e extrai nome/mensagem
 * Aceita padrões:
 * [20:34] 🧑‍💼 Diego: mensagem
 * [20:34] 👤 João: mensagem
 * [20:34] Atendente Diego: mensagem
 * [20:34] Cliente João: mensagem
 * [20:34] Diego: mensagem
 * [20:34] Diego:
 */
function parseLine(raw: string): ParsedLine {
  const time = extractTime(raw);
  const line = stripTime(raw);
  const lower = line.toLowerCase();

  // Eventos de sistema reais
  if (isSystemEvent(line)) {
    return { role: 'system', time, message: line };
  }

  const isAgent =
    line.includes('🧑‍💼') ||
    /\batendente\b/.test(lower);
  const isClient =
    line.includes('👤') ||
    /\bcliente\b/.test(lower);

  // Regex ampla permitindo emojis/labels antes do nome
  const withMessage =
    line.match(/^(?:[*_~\s]*)(?:🧑‍💼|👤|Atendente|Cliente)?\s*([^:]+):\s*(.+)$/i);
  const nameOnly =
    line.match(/^(?:[*_~\s]*)(?:🧑‍💼|👤|Atendente|Cliente)?\s*([^:]+):\s*$/i);

  if (withMessage) {
    const name = normalizeName((withMessage[1] || '').trim());
    const message = (withMessage[2] || '').trim();
    const role: ParsedRole = isAgent ? 'agent' : isClient ? 'client' : 'unknown';
    return { role, time, name, message };
  }

  if (nameOnly) {
    const name = normalizeName((nameOnly[1] || '').trim());
    const role: ParsedRole = isAgent ? 'agent' : isClient ? 'client' : 'unknown';
    // Metadado "Nome:" sem conteúdo — deve fundir com próxima linha
    return { role, time, name, metaNameOnly: true };
  }

  // Sem padrão explícito — tratar como mensagem "solta"
  // Papel será herdado pelo renderizador
  return { role: 'unknown', time, message: line };
}

export const ConversationSummary = ({ summary, description }: ConversationSummaryProps) => {
  const renderDescription = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n').filter((l) => l.trim().length > 0);

    const bubbles: Array<{
      role: Role;
      time?: string;
      name?: string;
      message: string;
    }> = [];

    let lastRole: Role = 'client';
    let lastName: string | undefined;
    let i = 0;

    while (i < lines.length) {
      const raw = lines[i];
      const parsed = parseLine(raw);

      // Fundir "Nome:" com próxima linha
      if (parsed.metaNameOnly) {
        // procurar próxima linha não vazia
        let j = i + 1;
        while (j < lines.length && lines[j].trim().length === 0) j++;
        if (j < lines.length) {
          const nextParsed = parseLine(lines[j]);
          const effectiveRole: Role =
            nextParsed.role === 'unknown'
              ? (parsed.role !== 'unknown' ? (parsed.role as Role) : lastRole)
              : (nextParsed.role as Role);

          const effectiveName =
            normalizeName(nextParsed.name) ||
            parsed.name ||
            lastName;

          let message = dedupeMessage(effectiveName, (nextParsed.message || '').trim());
          if (message.length > 0) {
            bubbles.push({
              role: effectiveRole,
              time: nextParsed.time || parsed.time,
              name: effectiveName,
              message,
            });
            lastRole = effectiveRole;
            if (effectiveName) lastName = effectiveName;
          }
          i = j + 1;
          continue;
        } else {
          // Não há próxima linha — ignorar metadado solto
          i++;
          continue;
        }
      }

      if (parsed.role === 'system') {
        bubbles.push({
          role: 'system',
          time: parsed.time,
          message: parsed.message || '',
        });
        i++;
        continue;
      }

      // Mensagem comum — herdar papel/nome quando necessário
      const effectiveRole: Role =
        parsed.role === 'unknown' ? lastRole : (parsed.role as Role);

      const effectiveName =
        normalizeName(parsed.name) || lastName;

      let message = dedupeMessage(effectiveName, (parsed.message || '').trim());
      if (message.length > 0) {
        bubbles.push({
          role: effectiveRole,
          time: parsed.time,
          name: effectiveName,
          message,
        });
        lastRole = effectiveRole;
        if (effectiveName) lastName = effectiveName;
      }

      i++;
    }

    return bubbles.map((b, idx) => (
      <ChatMessageBubble
        key={idx}
        role={b.role}
        time={b.time}
        name={b.name}
        message={b.message}
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