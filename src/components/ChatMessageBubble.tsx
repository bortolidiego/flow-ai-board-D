import React from "react";
import { cn } from "@/lib/utils";

type Role = "agent" | "client" | "system";

interface ChatMessageBubbleProps {
  role: Role;
  time?: string;
  name?: string;
  message: string;
}

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({
  role,
  time,
  name,
  message,
}) => {
  const isAgent = role === "agent";
  const isClient = role === "client";
  const isSystem = role === "system";

  return (
    <div
      className={cn(
        "w-full flex my-1",
        isAgent ? "justify-end" : isClient ? "justify-start" : "justify-center"
      )}
    >
      <div
        className={cn(
          "rounded-xl px-3 py-2 shadow-sm border max-w-[85%] text-sm",
          isAgent && "bg-primary/10 border-primary/20 text-foreground rounded-tr-none",
          isClient && "bg-secondary/10 border-secondary/20 text-foreground rounded-tl-none",
          isSystem && "bg-muted/40 border-muted text-muted-foreground text-xs py-1"
        )}
      >
        <div className="inline leading-relaxed break-words">
          {/* Data/Hora */}
          {time && (
            <span className="mr-1.5 text-[10px] font-mono opacity-60 tabular-nums select-none">
              [{time}]
            </span>
          )}
          
          {/* Nome */}
          {!isSystem && name && (
            <span className={cn(
              "font-bold mr-1.5",
              isAgent ? "text-primary" : "text-secondary-foreground"
            )}>
              {name}:
            </span>
          )}

          {/* Mensagem */}
          <span>
            {message}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatMessageBubble;