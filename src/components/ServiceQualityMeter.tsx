import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Lightbulb } from 'lucide-react';

interface ServiceQualityMeterProps {
  score?: number;
  suggestions?: string[];
}

export const ServiceQualityMeter = ({ score, suggestions = [] }: ServiceQualityMeterProps) => {
  const getColor = (value: number) => {
    if (value >= 70) return 'from-green-500 to-green-600';
    if (value >= 40) return 'from-yellow-500 to-yellow-600';
    return 'from-red-500 to-red-600';
  };

  const getIcon = (value: number) => {
    if (value >= 70) return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    return <AlertCircle className="w-5 h-5 text-yellow-600" />;
  };

  const getQualityLabel = (value: number) => {
    if (value >= 80) return 'Excelente';
    if (value >= 70) return 'Bom';
    if (value >= 50) return 'Regular';
    if (value >= 30) return 'Necessita Atenção';
    return 'Crítico';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lightbulb className="w-5 h-5 text-primary" />
          Qualidade do Atendimento
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

            <div className="flex items-center justify-between">
              {getIcon(score)}
              <Badge variant="outline" className="font-medium">
                {getQualityLabel(score)}
              </Badge>
            </div>

            {suggestions.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-sm font-medium text-foreground">Sugestões de Melhoria:</p>
                <ul className="space-y-2">
                  {suggestions.map((suggestion, index) => (
                    <li key={index} className="flex gap-2 text-sm text-muted-foreground">
                      <span className="text-primary">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground italic text-center py-4">
            Análise de qualidade não disponível
          </p>
        )}
      </CardContent>
    </Card>
  );
};