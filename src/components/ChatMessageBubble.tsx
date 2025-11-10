import React from "react";
import { Badge } from "@/components/ui/badge";
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
          "rounded-2xl px-3 py-2 shadow-sm border max-w-[80%] whitespace-pre-wrap break-words",
          isAgent && "bg-primary/15 border-primary/30",
          isClient && "bg-secondary/15 border-secondary/30",
          isSystem && "bg-muted/40 border-muted"
        )}
      >
        {!isSystem && (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-1">
            {time && <span className="tabular-nums">{time}</span>}
            <Badge
              variant="secondary"
              className={cn(
                "h-5 px-2",
                isAgent ? "bg-primary/20 text-primary" : "bg-secondary/20 text-secondary-foreground"
              )}
            >
              {isAgent ? "Agente" : "Cliente"}
            </Badge>
            {name && (
              <span className="font-semibold text-foreground leading-none">
                {name}
              </span>
            )}
          </div>
        )}
        <div
          className={cn(
            "text-sm leading-relaxed",
            isSystem && "text-muted-foreground"
          )}
        >
          {message || "(sem texto)"}
        </div>
      </div>
    </div>
  );
};

export default ChatMessageBubble;