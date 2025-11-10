import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, Clock, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TimelineEntry {
  id: string;
  analyzed_at: string;
  funnel_type: string | null;
  funnel_score: number | null;
  service_quality_score: number | null;
  service_quality_suggestions: any; // Json from Supabase
  conversation_summary: string | null;
  subject: string | null;
  product_item: string | null;
  value: number | null;
  conversation_status: string | null;
  win_confirmation: string | null;
  loss_reason: string | null;
  custom_fields_snapshot: any; // Json from Supabase
  lead_data_snapshot: any; // Json from Supabase
  trigger_source: string | null;
  conversation_length: number | null;
  model_used: string | null;
}

interface CardAnalysisTimelineProps {
  cardId: string;
}

export const CardAnalysisTimeline = ({ cardId }: CardAnalysisTimelineProps) => {
  const [history, setHistory] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [cardId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('card_analysis_history')
        .select('*')
        .eq('card_id', cardId)
        .order('analyzed_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching analysis history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (current: number | null, previous: number | null) => {
    if (!current || !previous) return <Minus className="w-4 h-4 text-muted-foreground" />;
    if (current > previous) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (current < previous) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const hasChanged = (currentValue: any, previousValue: any) => {
    return JSON.stringify(currentValue) !== JSON.stringify(previousValue);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Timeline de Análises
          </CardTitle>
          <CardDescription>Carregando histórico...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Timeline de Análises
          </CardTitle>
          <CardDescription>Nenhuma análise realizada ainda</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          Timeline de Análises
        </CardTitle>
        <CardDescription>
          Histórico completo de {history.length} análise{history.length > 1 ? 's' : ''} realizada{history.length > 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {history.map((entry, index) => {
            const previousEntry = history[index + 1];
            const isLatest = index === 0;

            return (
              <div
                key={entry.id}
                className={`relative border-l-2 pl-4 pb-4 ${
                  isLatest ? 'border-primary' : 'border-border'
                }`}
              >
                {/* Data e metadados */}
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(entry.analyzed_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                  </span>
                  {isLatest && (
                    <Badge variant="default" className="ml-2">
                      Mais recente
                    </Badge>
                  )}
                  {entry.conversation_length && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      {entry.conversation_length} mensagens
                    </span>
                  )}
                </div>

                {/* Funil */}
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">Funil</span>
                      {getTrendIcon(entry.funnel_score, previousEntry?.funnel_score)}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          hasChanged(entry.funnel_type, previousEntry?.funnel_type)
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {entry.funnel_type || 'N/A'}
                      </Badge>
                      <span className="text-sm font-semibold">
                        {entry.funnel_score}%
                      </span>
                    </div>
                    {entry.funnel_score && (
                      <Progress value={entry.funnel_score} className="mt-2 h-2" />
                    )}
                  </div>

                  {/* Qualidade */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">Qualidade</span>
                      {getTrendIcon(entry.service_quality_score, previousEntry?.service_quality_score)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {entry.service_quality_score}%
                      </span>
                    </div>
                    {entry.service_quality_score && (
                      <Progress value={entry.service_quality_score} className="mt-2 h-2" />
                    )}
                  </div>
                </div>

                {/* Resumo */}
                {entry.conversation_summary && (
                  <div className="mb-2">
                    <p className="text-sm text-foreground/80 italic">
                      "{entry.conversation_summary}"
                    </p>
                  </div>
                )}

                {/* Detalhes que mudaram */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {entry.subject && hasChanged(entry.subject, previousEntry?.subject) && (
                    <div className="bg-primary/10 px-2 py-1 rounded">
                      <span className="font-medium">Assunto:</span> {entry.subject}
                    </div>
                  )}
                  {entry.product_item && hasChanged(entry.product_item, previousEntry?.product_item) && (
                    <div className="bg-primary/10 px-2 py-1 rounded">
                      <span className="font-medium">Produto:</span> {entry.product_item}
                    </div>
                  )}
                  {entry.value && hasChanged(entry.value, previousEntry?.value) && (
                    <div className="bg-primary/10 px-2 py-1 rounded">
                      <span className="font-medium">Valor:</span>{' '}
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(entry.value)}
                    </div>
                  )}
                  {entry.win_confirmation && (
                    <div className="col-span-2 bg-green-500/10 px-2 py-1 rounded border border-green-500/20">
                      <span className="font-medium text-green-600">Ganho:</span> {entry.win_confirmation}
                    </div>
                  )}
                  {entry.loss_reason && (
                    <div className="col-span-2 bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
                      <span className="font-medium text-red-600">Perdido:</span> {entry.loss_reason}
                    </div>
                  )}
                </div>

                {/* Custom fields que mudaram */}
                {Object.keys(entry.custom_fields_snapshot).length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(entry.custom_fields_snapshot).map(([key, value]) => {
                        const changed = hasChanged(
                          value,
                          previousEntry?.custom_fields_snapshot?.[key]
                        );
                        if (changed && value) {
                          return (
                            <div key={key} className="text-xs bg-accent/50 px-2 py-1 rounded">
                              <span className="font-medium capitalize">{key}:</span>{' '}
                              {String(value)}
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                )}

                {/* Sugestões de qualidade */}
                {Array.isArray(entry.service_quality_suggestions) && entry.service_quality_suggestions.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <p className="text-xs font-medium mb-1">Sugestões:</p>
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                      {entry.service_quality_suggestions.map((suggestion: string, i: number) => (
                        <li key={i}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
