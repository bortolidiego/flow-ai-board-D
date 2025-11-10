import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface LifecycleStage {
  stage_name: string;
  progress_percent: number;
  is_initial?: boolean;
  is_terminal?: boolean;
  resolution_status?: 'won' | 'lost' | 'resolved' | 'unresolved';
}

interface FunnelConfig {
  funnel_type: string;
  funnel_name: string;
  color: string;
  lifecycle_stages: LifecycleStage[];
  is_monetary: boolean;
}

interface LifecycleProgressCardProps {
  funnelConfig: FunnelConfig;
  currentStage: string | null;
  progressPercent: number;
  isLocked: boolean;
  onStageChange?: (nextStage: string) => void;
}

export function LifecycleProgressCard({
  funnelConfig,
  currentStage,
  progressPercent,
  isLocked,
  onStageChange
}: LifecycleProgressCardProps) {
  const stages = funnelConfig.lifecycle_stages || [];
  const currentStageIndex = stages.findIndex(s => s.stage_name === currentStage);
  const currentStageData = stages[currentStageIndex];
  const isTerminalStage = currentStageData?.is_terminal || false;
  const nextStage = !isTerminalStage && currentStageIndex < stages.length - 1 
    ? stages[currentStageIndex + 1] 
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {isLocked && <Lock className="h-5 w-5 text-red-500" />}
          <span style={{ color: funnelConfig.color }}>
            🎯 {funnelConfig.funnel_name}
          </span>
          <Badge variant="outline" className="ml-auto">{progressPercent}%</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Barra de Progresso Grande */}
        <Progress 
          value={progressPercent} 
          className="h-4"
          style={{
            backgroundColor: `${funnelConfig.color}20`
          }}
        />
        
        {/* Fluxo de Etapas */}
        <div className="flex items-center justify-between gap-1 overflow-x-auto pb-2">
        {stages.filter(s => !s.is_terminal).map((stage, idx) => {
            const isActive = stage.stage_name === currentStage;
            const isPast = stage.progress_percent < progressPercent;
            
            return (
              <div key={idx} className="flex items-center gap-1 flex-shrink-0">
                <div className="flex flex-col items-center min-w-[60px]">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors",
                    isActive && "ring-2 ring-offset-2",
                    isPast ? "bg-primary text-primary-foreground" : 
                    isActive ? "bg-primary text-primary-foreground" : 
                    "bg-muted text-muted-foreground"
                  )}
                  style={isActive ? { backgroundColor: funnelConfig.color, color: 'white' } : undefined}
                  >
                    {isPast ? '✓' : idx + 1}
                  </div>
                  <span className={cn(
                    "text-xs mt-2 text-center",
                    isActive && "font-semibold"
                  )}>
                    {stage.stage_name}
                  </span>
                </div>
                {idx < stages.filter(s => !s.is_terminal).length - 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* Etapas Terminais */}
        {stages.filter(s => s.is_terminal).length > 0 && (
          <div className="border-t pt-3">
            <p className="text-xs text-muted-foreground mb-2">Etapas Finais:</p>
            <div className="flex gap-2">
              {stages.filter(s => s.is_terminal).map((stage, idx) => (
                <Badge 
                  key={idx}
                  variant={stage.stage_name === currentStage ? "default" : "outline"}
                  className={cn(
                    "text-xs",
                    stage.resolution_status === 'won' && "bg-green-500 hover:bg-green-600",
                    stage.resolution_status === 'lost' && "bg-red-500 hover:bg-red-600"
                  )}
                >
                  {stage.resolution_status === 'won' ? '✓' : 
                   stage.resolution_status === 'lost' ? '✗' : 
                   stage.resolution_status === 'resolved' ? '✓' : '○'} {stage.stage_name}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Botão para Avançar Etapa Manualmente */}
        {!isTerminalStage && nextStage && onStageChange && (
          <Button 
            onClick={() => onStageChange(nextStage.stage_name)} 
            variant="outline" 
            className="w-full"
            size="sm"
          >
            Avançar para: {nextStage.stage_name}
          </Button>
        )}

        {isTerminalStage && (
          <div className="text-center text-sm text-muted-foreground">
            Ciclo concluído
          </div>
        )}
      </CardContent>
    </Card>
  );
}
