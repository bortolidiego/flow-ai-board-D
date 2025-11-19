import React from "react";
import { cn } from "@/lib/utils";

type Role = "agent" | "client" | "system";

interface ChatMessageBubbleProps {
  role: Role;
  time?: string;
  name?: string;
  message: string;
  isContinuation?: boolean;
}

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({
  role,
  time,
  name,
  message,
  isContinuation = false,
}) => {
  const isAgent = role === "agent";
  const isClient = role === "client";
  const isSystem = role === "system";

  // Estilo de sistema (centralizado, pequeno)
  if (isSystem) {
    return (
      <div className="w-full flex justify-center my-2">
        <span className="text-[11px] bg-white/90 dark:bg-slate-800/90 text-gray-600 dark:text-gray-300 px-2 py-1 rounded shadow-sm uppercase tracking-wide">
          {message}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "w-full flex",
        isAgent ? "justify-end" : "justify-start",
        isContinuation ? "mt-0.5" : "mt-2"
      )}
    >
      <div
        className={cn(
          "relative max-w-[85%] px-3 py-1.5 text-sm shadow-sm border border-black/5",
          // Bordas arredondadas com lógica de continuação
          "rounded-lg",
          !isContinuation && isAgent && "rounded-tr-none",
          !isContinuation && isClient && "rounded-tl-none",
          
          // Cores
          isAgent 
            ? "bg-[#d9fdd3] dark:bg-[#005c4b] text-black dark:text-white" 
            : "bg-white dark:bg-[#202c33] text-black dark:text-white"
        )}
      >
        {/* Cabeçalho da mensagem (apenas se não for continuação) */}
        {!isContinuation && name && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span
              className={cn(
                "text-xs font-bold",
                isAgent ? "text-green-700 dark:text-green-300" : "text-blue-600 dark:text-blue-300"
              )}
            >
              {name}
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-end gap-x-2">
          <span className="leading-relaxed whitespace-pre-wrap break-words">
            {message}
          </span>
          
          {/* Hora flutuando à direita inferior */}
          {time && (
            <span className="text-[10px] text-gray-500 dark:text-gray-400 ml-auto select-none min-w-fit">
              {time}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessageBubble;