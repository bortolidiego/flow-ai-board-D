import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Pause, AlertCircle } from 'lucide-react';

interface IntegrationStatusBadgeProps {
  status: 'active' | 'paused' | 'not-configured';
  label?: string;
  showPulse?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const IntegrationStatusBadge = ({ 
  status, 
  label, 
  showPulse = false,
  size = 'md' 
}: IntegrationStatusBadgeProps) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'active':
        return {
          icon: CheckCircle2,
          text: label || 'Sincronizando',
          className: 'bg-primary/10 text-primary border-primary/30',
          iconClassName: 'text-primary'
        };
      case 'paused':
        return {
          icon: Pause,
          text: label || 'Pausado',
          className: 'bg-orange-500/10 text-orange-600 border-orange-500/30 dark:text-orange-400',
          iconClassName: 'text-orange-600 dark:text-orange-400'
        };
      case 'not-configured':
        return {
          icon: AlertCircle,
          text: label || 'Não configurado',
          className: 'bg-muted text-muted-foreground border-border',
          iconClassName: 'text-muted-foreground'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={`${config.className} ${sizeClasses[size]} flex items-center gap-1.5 relative`}
    >
      <Icon className={`w-4 h-4 ${config.iconClassName}`} />
      {config.text}
      {showPulse && status === 'active' && (
        <span className="absolute -top-1 -right-1 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
        </span>
      )}
    </Badge>
  );
};
