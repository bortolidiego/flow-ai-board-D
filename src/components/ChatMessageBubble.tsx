import { cn } from '@/lib/utils';

interface ChatMessageBubbleProps {
  time?: string;
  name: string;
  message: string;
  isSystem?: boolean;
}

export function ChatMessageBubble({ time, name, message, isSystem = false }: ChatMessageBubbleProps) {
  const cleanName = name.trim();
  
  return (
    <div className="flex items-start gap-2 text-sm">
      {(time || name) && (
        <span className="mr-1 text-[11px] text-muted-foreground tabular-nums">
          [{time}] {name}:
        </span>
      )}
      <span className={cn(!isSystem && cleanName ? "ml-1" : "")}>
        {message || "(sem texto)"}
      </span>
    </div>
  );
}