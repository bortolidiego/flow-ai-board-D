import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';

interface ConversationSummaryProps {
  summary?: string;
  description?: string;
}

export const ConversationSummary = ({ summary, description }: ConversationSummaryProps) => {
  // Função para formatar mensagens com destaque visual
  const formatDescription = (text: string) => {
    if (!text) return null;
    
    const lines = text.split('\n');
    return lines.map((line, index) => {
      // Detectar se é mensagem do atendente ou cliente
      const isAgent = line.includes('🧑‍💼 Atendente');
      const isClient = line.includes('👤 Cliente');
      
      if (isAgent || isClient) {
        // Extrair timestamp, label e conteúdo
        const timestampMatch = line.match(/\[(\d{2}:\d{2})\]/);
        const timestamp = timestampMatch ? timestampMatch[1] : '';
        
        // Extrair nome e mensagem
        const contentMatch = line.match(/(?:🧑‍💼 Atendente|👤 Cliente)\s+([^:]+):\s*(.+)/);
        const name = contentMatch ? contentMatch[1].trim() : '';
        const message = contentMatch ? contentMatch[2].trim() : line;
        
        return (
          <div 
            key={index} 
            className={`mb-2 p-2 rounded-lg ${
              isAgent 
                ? 'bg-blue-50 dark:bg-blue-950/20 border-l-2 border-blue-500' 
                : 'bg-green-50 dark:bg-green-950/20 border-l-2 border-green-500'
            }`}
          >
            <div className="flex items-start gap-2">
              <span className="text-xs text-muted-foreground">{timestamp}</span>
              <span className={`text-xs font-semibold ${
                isAgent ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'
              }`}>
                {isAgent ? '🧑‍💼' : '👤'} {name}
              </span>
            </div>
            <p className="text-sm mt-1 ml-12">{message}</p>
          </div>
        );
      }
      
      // Linha sem formatação especial
      return (
        <p key={index} className="text-xs text-muted-foreground mb-1">
          {line}
        </p>
      );
    });
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
              <div className="space-y-1">
                {formatDescription(description)}
              </div>
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
};