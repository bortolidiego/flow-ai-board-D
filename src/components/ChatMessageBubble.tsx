import React from "react";
import { cn } from "@/lib/utils";

type Role = "agent" | "client" | "system";

interface ChatMessageBubbleProps {
  role: Role;
  time?: string;
  name?: string;
  message: string;
}

function normalizeName(raw?: string) {
  if (!raw) return undefined;
  // Remove emojis/labels e espaços extras
  return raw
    .replace(/🧑‍💼|👤/g, "")
    .replace(/\b(Atendente|Cliente)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
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

  const cleanName = normalizeName(name);

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
          isAgent && "bg-blue-100 border-blue-300 dark:bg-blue-900/20 dark:border-blue-700",
          isClient && "bg-gray-100 border-gray-300 dark:bg-gray-800 dark:border-gray-600",
          isSystem && "bg-muted/40 border-muted"
        )}
      >
        <div
          className={cn(
            "text-sm leading-relaxed break-words",
            isSystem && "text-muted-foreground"
          )}
        >
          {time && (
            <span className="mr-1 text-[11px] text-muted-foreground tabular-nums">
              [{time}]
            </span>
          )}
          {!isSystem && cleanName && (
            <span className="font-semibold text-foreground">
              {cleanName}:
            </span>
          )}
          <span className={cn(!isSystem && cleanName ? "ml-1" : "")}>
            {message || "(sem texto)"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatMessageBubble;