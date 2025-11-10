import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target } from 'lucide-react';

interface FunnelMeterProps {
  score?: number;
  type?: string;
}

export const FunnelMeter = ({ score, type }: FunnelMeterProps) => {
  const getColor = (value: number) => {
    if (value >= 70) return 'from-green-500 to-green-600';
    if (value >= 40) return 'from-yellow-500 to-yellow-600';
    return 'from-red-500 to-red-600';
  };

  const getTextColor = (value: number) => {
    if (value >= 70) return 'text-green-600';
    if (value >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="w-5 h-5 text-primary" />
          Score de Conversão
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {score !== undefined && score !== null ? (
          <>
            <div className="relative">
              <div className="h-8 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${getColor(score)} transition-all duration-500 flex items-center justify-end pr-3`}
                  style={{ width: `${score}%` }}
                >
                  <span className="text-xs font-bold text-white drop-shadow-md">
                    {score}%
                  </span>
                </div>
              </div>
            </div>
            
            {type && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Funil:</span>
                <span className={`text-sm font-semibold ${getTextColor(score)}`}>
                  {type}
                </span>
              </div>
            )}

            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Baixa</span>
              <span>Média</span>
              <span>Alta</span>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground italic text-center py-4">
            Análise de funil não disponível
          </p>
        )}
      </CardContent>
    </Card>
  );
};
