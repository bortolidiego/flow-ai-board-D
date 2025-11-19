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
        <span className="text-[11px] bg-white/90 dark:bg-slate-800/90 text-gray-600 dark:text-gray-300 px-2 py-1 rounded shadow-sm uppercase tracking-wide border border-gray-200 dark:border-gray-700">
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
          "relative max-w-[85%] px-2 py-1.5 text-sm shadow-sm",
          // Bordas arredondadas com lógica de continuação
          "rounded-lg",
          !isContinuation && isAgent && "rounded-tr-none",
          !isContinuation && isClient && "rounded-tl-none",
          
          // Cores WhatsApp style
          isAgent 
            ? "bg-[#dcf8c6] dark:bg-[#056162] text-black dark:text-white" 
            : "bg-white dark:bg-[#262d31] text-black dark:text-white"
        )}
      >
        {/* Cabeçalho da mensagem (Nome) */}
        {/* Mostra o nome se não for continuação OU se tiver um nome explícito passado (mesmo em continuação, às vezes queremos mostrar) */}
        {(!isContinuation || name) && name && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span
              className={cn(
                "text-[12.5px] font-medium leading-tight",
                isAgent ? "text-[#075e54] dark:text-[#00af9c]" : "text-[#128c7e] dark:text-[#34b7f1]"
              )}
            >
              {name}
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-end gap-x-2 relative pr-2">
          <span className="leading-relaxed whitespace-pre-wrap break-words text-[14px]">
            {message}
          </span>
          
          {/* Hora flutuando à direita inferior */}
          {/* Garante espaço para a hora não sobrepor o texto */}
          <span className="text-[10px] text-gray-500 dark:text-gray-400 ml-auto select-none min-w-[45px] text-right h-3 self-end mb-[-2px]">
            {time || ""}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatMessageBubble;