import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

interface FunnelFieldsCardProps {
  funnelType: string;
  funnelName: string;
  color: string;
  isMonetary: boolean;
  priority: 'low' | 'medium' | 'high';
}

export const FunnelFieldsCard = ({
  funnelType,
  funnelName,
  color,
  isMonetary,
  priority
}: FunnelFieldsCardProps) => {
  const priorityColors = {
    high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  };

  return (
    <Card className="border-l-4" style={{ borderLeftColor: color }}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span>Funil: {funnelName}</span>
          <div className="flex gap-2">
            {isMonetary && (
              <Badge variant="outline" className="text-xs">
                💰 Monetário
              </Badge>
            )}
            <Badge className={`text-xs ${priorityColors[priority]}`}>
              {priority === 'high' ? '🔴' : priority === 'medium' ? '🟡' : '🟢'} {
                priority === 'high' ? 'Alta' : priority === 'medium' ? 'Média' : 'Baixa'
              }
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Tipo: <span className="font-medium">{funnelType}</span>
        </p>
      </CardContent>
    </Card>
  );
};
