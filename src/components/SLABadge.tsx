import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, AlertCircle, CheckCircle2, XCircle, CheckCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface SLABadgeProps {
  cardId: string;
  cardCreatedAt: string;
  completionType?: string | null;
  className?: string;
}

// Helper para formatar tempo em unidades apropriadas
function formatTimeUnit(minutes: number): string {
  const absMinutes = Math.abs(minutes);
  
  // Após 30 dias (43200 min) → meses
  if (absMinutes >= 43200) {
    const months = Math.floor(absMinutes / 43200);
    return `${months} ${months === 1 ? 'mês' : 'meses'}`;
  }
  
  // Após 24 horas (1440 min) → dias
  if (absMinutes >= 1440) {
    const days = Math.floor(absMinutes / 1440);
    return `${days} ${days === 1 ? 'dia' : 'dias'}`;
  }
  
  // Após 60 minutos → horas
  if (absMinutes >= 60) {
    const hours = Math.floor(absMinutes / 60);
    return `${hours}h`;
  }
  
  // Menos de 60 minutos → minutos
  return `${absMinutes}min`;
}

export function SLABadge({ cardId, cardCreatedAt, completionType, className }: SLABadgeProps) {
  const [sla, setSla] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (completionType) {
      setLoading(false);
      return;
    }

    const calculateSLA = async () => {
      try {
        // First try to get SLA from card data directly
        const { data: cardData, error: cardError } = await supabase
          .from('cards')
          .select('sla_status, sla_target_minutes, sla_elapsed_minutes, sla_remaining_minutes')
          .eq('id', cardId)
          .single();

        if (cardError) throw cardError;

        // If SLA data exists on card, use it
        if (cardData.sla_status) {
          setSla({
            status: cardData.sla_status,
            targetMinutes: cardData.sla_target_minutes,
            elapsedMinutes: cardData.sla_elapsed_minutes,
            remainingMinutes: cardData.sla_remaining_minutes
          });
        } else {
          // Fallback to local calculation if no SLA data on card
          const createdDate = new Date(cardCreatedAt);
          const now = new Date();
          const elapsedMinutes = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60));
          // Default SLA target of 4 hours (240 minutes)
          const targetMinutes = 240;
          const remainingMinutes = targetMinutes - elapsedMinutes;
          
          let status: 'ok' | 'warning' | 'overdue' = 'ok';
          if (remainingMinutes < 0) {
            status = 'overdue';
          } else if (remainingMinutes < 60) {
            status = 'warning';
          }
          
          setSla({
            status,
            targetMinutes,
            elapsedMinutes,
            remainingMinutes
          });
        }
      } catch (error) {
        console.warn('Error calculating SLA, using fallback:', error);
        // Fallback calculation if anything fails
        const createdDate = new Date(cardCreatedAt);
        const now = new Date();
        const elapsedMinutes = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60));
        const targetMinutes = 240; // 4 hours default
        const remainingMinutes = targetMinutes - elapsedMinutes;
        
        let status: 'ok' | 'warning' | 'overdue' = 'ok';
        if (remainingMinutes < 0) {
          status = 'overdue';
        } else if (remainingMinutes < 60) {
          status = 'warning';
        }
        
        setSla({
          status,
          targetMinutes,
          elapsedMinutes,
          remainingMinutes
        });
      } finally {
        setLoading(false);
      }
    };

    calculateSLA();
    const interval = setInterval(calculateSLA, 60000); // Atualizar a cada 1min

    return () => clearInterval(interval);
  }, [cardId, cardCreatedAt, completionType]);

  if (loading) return null;

  // Se card finalizado, mostrar badge de finalização
  if (completionType) {
    const completionConfig = {
      won: { label: 'Ganho', variant: 'default' as const, icon: CheckCircle2, className: 'bg-green-600 hover:bg-green-700 text-white' },
      lost: { label: 'Perdido', variant: 'destructive' as const, icon: XCircle, className: 'bg-red-600 hover:bg-red-700 text-white' },
      completed: { label: 'Concluído', variant: 'secondary' as const, icon: CheckCheck, className: 'bg-blue-600 hover:bg-blue-700 text-white' }
    };

    const config = completionConfig[completionType as keyof typeof completionConfig];
    if (!config) return null;

    const Icon = config.icon;

    return (
      <Badge className={cn(className, config.className)}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  }

  // Mostrar SLA
  if (!sla) return null;

  // Se SLA está completed, não mostrar badge (card já deve estar finalizado)
  if (sla.status === 'completed') return null;

  const slaConfig = {
    ok: { 
      variant: 'outline' as const, 
      icon: Clock, 
      className: 'text-green-600 border-green-300',
      label: `SLA: ${formatTimeUnit(sla.remainingMinutes)}`
    },
    warning: { 
      variant: 'outline' as const, 
      icon: AlertTriangle, 
      className: 'text-amber-600 border-amber-300',
      label: `SLA: ${formatTimeUnit(sla.remainingMinutes)}`
    },
    overdue: { 
      variant: 'destructive' as const, 
      icon: AlertCircle, 
      className: 'bg-red-600 hover:bg-red-700 text-white',
      label: `SLA: +${formatTimeUnit(Math.abs(sla.remainingMinutes))}`
    }
  };

  const config = slaConfig[sla.status as keyof typeof slaConfig];
  
  // Se status não reconhecido, não mostrar badge
  if (!config) return null;
  
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={cn(className, config.className)}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
}