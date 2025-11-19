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
        "w-full flex my-1.5",
        isAgent ? "justify-end" : isClient ? "justify-start" : "justify-center"
      )}
    >
      <div
        className={cn(
          "relative max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm",
          isAgent && "bg-primary/10 text-foreground rounded-tr-none", // Balão do Agente
          isClient && "bg-muted text-foreground rounded-tl-none", // Balão do Cliente
          isSystem && "bg-transparent text-xs text-muted-foreground py-1 shadow-none italic" // Sistema
        )}
      >
        {/* O segredo está aqui: Tudo dentro de um parágrafo para fluir na mesma linha */}
        <p className="leading-relaxed whitespace-pre-wrap break-words">
          {/* Data/Hora */}
          {time && !isSystem && (
            <span className="text-[10px] font-mono opacity-50 mr-2 select-none inline-block">
              [{time}]
            </span>
          )}

          {/* Nome (Negrito e colorido) */}
          {!isSystem && name && (
            <span
              className={cn(
                "font-bold text-xs mr-1.5",
                isAgent ? "text-primary" : "text-blue-600 dark:text-blue-400"
              )}
            >
              {name}:
            </span>
          )}

          {/* Conteúdo da Mensagem (Vem logo ao lado) */}
          <span>{message}</span>
        </p>
      </div>
    </div>
  );
};

export default ChatMessageBubble;