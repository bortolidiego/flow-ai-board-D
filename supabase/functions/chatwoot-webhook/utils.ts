export function sanitizeHTML(input: string): string {
  if (!input) return "";
  let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, "");
  sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]*/gi, "");
  sanitized = sanitized.replace(/javascript:/gi, "");
  sanitized = sanitized.replace(/data:text\/html/gi, "");
  const allowedTags = ["b", "i", "em", "strong", "a", "p", "br", "ul", "ol", "li"];
  const tagPattern = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
  sanitized = sanitized.replace(tagPattern, (match, tag) => {
    return allowedTags.includes(tag.toLowerCase()) ? match : "";
  });
  return sanitized;
}

export function computeSignature(
  messageId: string | undefined, 
  conversationId: string | undefined, 
  senderName: string | undefined | null, 
  messageType: string | undefined, 
  content: string | undefined
) {
  if (messageId) return `msg:${messageId}`;
  const norm = (s: any) => (s || "").toString().trim().toLowerCase().replace(/\s+/g, " ").slice(0, 300);
  const key = `${norm(conversationId)}|${norm(senderName)}|${norm(messageType)}|${norm(content)}`;
  return key.slice(0, 200);
}

export function getFormattedTimestamp() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' });
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
  return `${dateStr} ${timeStr}`;
}

export function determinePriority(content: string): "high" | "medium" | "low" {
  const lower = content.toLowerCase();
  if (lower.includes("urgente") || lower.includes("emergência")) return "high";
  if (lower.includes("dúvida") || lower.includes("informação")) return "low";
  return "medium";
}

export function isDuplicateContent(existingDescription: string, newContent: string): boolean {
  if (!existingDescription || !newContent) return false;
  const lines = existingDescription.split('\n');
  const recentLines = lines.slice(-5).join('\n');
  return recentLines.includes(newContent.trim());
}