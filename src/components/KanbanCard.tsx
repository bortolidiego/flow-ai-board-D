import { SLABadge } from '@/components/SLABadge';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Bot, User, MessageSquare, TrendingUp, Star, CheckCircle2, XCircle, ExternalLink, Clock, History, Lock, ArrowRight, Headphones } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface CustomField {
  id: string;
  field_name: string;
  field_label: string;
  field_type: string;
}
interface PipelineConfig {
  customFields: CustomField[];
  funnelTypes?: any[];
  aiConfig?: {
    id: string;
  };
}
interface KanbanCardProps {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  assignee?: string;
  aiSuggested?: boolean;
  createdAt: string;
  onCardClick?: () => void;
  chatwootContactName?: string;
  chatwootAgentName?: string;
  chatwootConversationId?: string;
  chatwootUrl?: string;
  chatwootAccountId?: string;
  inboxName?: string;
  funnelScore?: number;
  serviceQualityScore?: number;
  value?: number;
  productItem?: string;
  subject?: string;
  funnelType?: string;
  conversationStatus?: 'open' | 'closed';
  winConfirmation?: string;
  lossReason?: string;
  customFieldsData?: Record<string, any>;
  pipelineConfig?: PipelineConfig | null;
  selectionMode?: boolean;
  isSelected?: boolean;
  onSelectToggle?: () => void;
  completionType?: 'won' | 'lost' | 'completed' | null;
  completionReason?: string | null;
  completedAt?: string | null;
  completedBy?: string | null;
  customerProfileId?: string | null;
  currentLifecycleStage?: string | null;
  lifecycleProgressPercent?: number;
  resolutionStatus?: string | null;
  isMonetaryLocked?: boolean;
  lastActivityAt?: string | null;
}
export const KanbanCard = ({
  id,
  title,
  description,
  priority,
  assignee,
  aiSuggested,
  createdAt,
  onCardClick,
  chatwootContactName,
  chatwootAgentName,
  chatwootConversationId,
  chatwootUrl,
  chatwootAccountId,
  inboxName,
  funnelScore,
  serviceQualityScore,
  value,
  productItem,
  subject,
  funnelType,
  conversationStatus,
  winConfirmation,
  lossReason,
  customFieldsData = {},
  pipelineConfig,
  selectionMode = false,
  isSelected = false,
  onSelectToggle,
  completionType,
  completionReason,
  completedAt,
  completedBy,
  customerProfileId,
  currentLifecycleStage,
  lifecycleProgressPercent,
  resolutionStatus,
  isMonetaryLocked,
  lastActivityAt,
}: KanbanCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id
  });
  
  const isMobile = useIsMobile();
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };
  
  const getScoreColor = (score?: number) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 70) return 'text-green-600 dark:text-green-400';
    if (score >= 40) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };
  
  const formatCurrency = (value?: number) => {
    if (!value) return null;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) return 'agora';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInHours < 24) return `${diffInHours}h`;
    return `${diffInDays}d`;
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isDragging || (e.target as HTMLElement).closest('[data-drag-handle]')) {
      return;
    }
    if (selectionMode && onSelectToggle) {
      e.stopPropagation();
      onSelectToggle();
      return;
    }
    onCardClick?.();
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const openChatwootConversation = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (chatwootUrl && chatwootConversationId && chatwootAccountId) {
      const conversationUrl = `${chatwootUrl}/app/accounts/${chatwootAccountId}/conversations/${chatwootConversationId}`;
      window.open(conversationUrl, '_blank');
    }
  };

  // Logic to determine display name (Prioritize Contact Name)
  const displayTitle = chatwootContactName && chatwootContactName !== chatwootAgentName 
    ? chatwootContactName 
    : title;

  // Logic to determine responsible agent
  const displayAssignee = assignee || chatwootAgentName;

  // Get funnel color
  const funnelConfig = pipelineConfig?.funnelTypes?.find((f: any) => f.funnel_type === funnelType);

  return (
    <Card ref={setNodeRef} style={style} onClick={handleClick} className={cn(
      "group relative backdrop-blur-md transition-all duration-300",
      selectionMode ? 'cursor-pointer' : 'active:cursor-grabbing cursor-pointer',
      isDragging ? 'opacity-50 shadow-glow-primary' : isMobile ? 'active:shadow-md' : 'hover:shadow-glow-primary/50',
      isSelected ? 'border-primary/80 bg-primary/5 shadow-glow-primary/30 ring-2 ring-primary/30' : 'border-border/50 hover:border-primary/50'
    )}>
      <div className={cn("space-y-2.5", isMobile ? "p-5" : "p-4")}>
        {/* Checkbox de seleção */}
        {selectionMode && (
          <div className={cn("absolute z-10", isMobile ? "top-4 right-4" : "top-3 right-3")} onClick={handleCheckboxClick}>
            <Checkbox checked={isSelected} onCheckedChange={onSelectToggle} className={cn(isMobile ? "h-6 w-6" : "h-5 w-5")} />
          </div>
        )}

        {/* Header - Nome do Lead + AI Badge + Drag Handle */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {aiSuggested && (
              <Tooltip>
                <TooltipTrigger>
                   <Bot className={cn("text-primary animate-pulse flex-shrink-0", isMobile ? "w-5 h-5" : "w-4 h-4")} />
                </TooltipTrigger>
                <TooltipContent>Sugerido por IA</TooltipContent>
              </Tooltip>
            )}
            <h3 className={cn("font-semibold text-foreground leading-tight truncate", isMobile ? "text-lg" : "text-base", selectionMode && 'pr-8')}>
              {displayTitle}
            </h3>
          </div>
          {!selectionMode && (
            <button {...attributes} {...listeners} data-drag-handle className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground flex-shrink-0" onClick={e => e.stopPropagation()}>
              <GripVertical className={cn(isMobile ? "w-6 h-6" : "w-5 h-5")} />
            </button>
          )}
        </div>

        {/* Linha de Contexto - Funil + Inbox + Link */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {inboxName && (
              <div className={cn("flex items-center gap-1", isMobile ? "text-sm" : "text-xs")}>
                <MessageSquare className={cn("text-muted-foreground", isMobile ? "w-4 h-4" : "w-3 h-3")} />
                <span className="text-muted-foreground max-w-[100px] truncate">{inboxName}</span>
              </div>
            )}
            
            {/* Funil e Etapa */}
            {(funnelType || currentLifecycleStage) && (
              <div className="flex items-center gap-1.5 bg-muted/40 rounded-full px-2 py-0.5 border border-border/40">
                {funnelType && (
                  <span 
                    className={cn("font-medium truncate max-w-[120px]", isMobile ? "text-sm" : "text-xs")}
                    style={{ color: funnelConfig?.color }}
                  >
                    {funnelType}
                  </span>
                )}
                {funnelType && currentLifecycleStage && (
                   <ArrowRight className="w-3 h-3 text-muted-foreground/50" />
                )}
                {currentLifecycleStage && (
                  <span className={cn("text-muted-foreground truncate max-w-[120px]", isMobile ? "text-sm" : "text-xs")}>
                    {currentLifecycleStage}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Link e Tempo */}
          <div className="flex items-center gap-2">
            <div className={cn("flex items-center gap-1 text-muted-foreground", isMobile ? "text-sm" : "text-xs")}>
              <Clock className={cn(isMobile ? "w-4 h-4" : "w-3 h-3")} />
              <span>{formatTimeAgo(createdAt)}</span>
            </div>
            {chatwootConversationId && chatwootUrl && (
              <Button
                variant="ghost"
                size="icon"
                className={cn("opacity-70 hover:opacity-100 h-6 w-6", isMobile && "h-8 w-8")}
                onClick={openChatwootConversation}
              >
                <ExternalLink className={cn(isMobile ? "w-4 h-4" : "w-3 h-3")} />
              </Button>
            )}
          </div>
        </div>

        {/* Métricas Grid - Qualidade + Probabilidade */}
        {pipelineConfig?.aiConfig && (funnelScore !== undefined || serviceQualityScore !== undefined) && (
          <div className={cn("gap-2 py-2", isMobile ? "grid grid-cols-1" : "grid grid-cols-2")}>
            {serviceQualityScore !== undefined && (
              <div className="flex items-center justify-between bg-card/50 px-2 py-1 rounded border border-border/30">
                <div className="flex items-center gap-1.5">
                  <Star className={cn(getScoreColor(serviceQualityScore), isMobile ? "w-4 h-4" : "w-3.5 h-3.5")} />
                  <span className={cn("text-muted-foreground", isMobile ? "text-sm" : "text-xs")}>Qualidade</span>
                </div>
                <span className={cn("font-bold", getScoreColor(serviceQualityScore), isMobile ? "text-base" : "text-sm")}>
                  {serviceQualityScore}%
                </span>
              </div>
            )}
            {funnelScore !== undefined && (
              <div className="flex items-center justify-between bg-card/50 px-2 py-1 rounded border border-border/30">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className={cn(getScoreColor(funnelScore), isMobile ? "w-4 h-4" : "w-3.5 h-3.5")} />
                  <span className={cn("text-muted-foreground", isMobile ? "text-sm" : "text-xs")}>Chance</span>
                </div>
                <span className={cn("font-bold", getScoreColor(funnelScore), isMobile ? "text-base" : "text-sm")}>
                  {funnelScore}%
                </span>
              </div>
            )}
          </div>
        )}

        {/* Seção Valor + Produto */}
        {(value || productItem) && (
          <div className="space-y-1 py-2 border-t border-border/30">
            {value && (
              <div className={cn("font-bold text-primary", isMobile ? "text-xl" : "text-lg")}>
                {formatCurrency(value)}
              </div>
            )}
            {productItem && (
              <div className={cn("text-muted-foreground truncate flex items-center gap-1.5", isMobile ? "text-sm" : "text-xs")}>
                <span>📦</span>
                {productItem}
              </div>
            )}
          </div>
        )}

        {/* Barra de Progresso do Ciclo de Vida */}
        {lifecycleProgressPercent !== undefined && (
          <div className="space-y-1.5 border-t pt-2 mt-1">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
               <span>Progresso</span>
               <span className="flex items-center gap-1">
                 {isMonetaryLocked && <Lock className="w-3 h-3 text-red-500" />}
                 {lifecycleProgressPercent}%
               </span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div 
                className="h-1.5 rounded-full transition-all" 
                style={{ 
                  width: `${lifecycleProgressPercent}%`,
                  backgroundColor: funnelConfig?.color || 'hsl(var(--primary))'
                }}
              />
            </div>
          </div>
        )}

        {/* Campos Customizados (Max 2) */}
        {pipelineConfig?.customFields && pipelineConfig.customFields.length > 0 && (
          <div className="space-y-1 py-2 border-t border-border/30">
            {pipelineConfig.customFields.slice(0, 2).map(field => {
              const fieldValue = customFieldsData[field.field_name];
              if (!fieldValue) return null;
              return (
                <div key={field.id} className="flex items-center justify-between gap-2">
                  <span className={cn("text-muted-foreground truncate", isMobile ? "text-sm" : "text-xs")}>
                    {field.field_label}:
                  </span>
                  <span className={cn("font-medium truncate max-w-[60%]", isMobile ? "text-sm" : "text-xs")}>
                    {field.field_type === 'boolean' ? fieldValue ? 'Sim' : 'Não' : String(fieldValue)}
                  </span>
                </div>
              );
            })}
            {pipelineConfig.customFields.length > 2 && (
              <p className={cn("text-muted-foreground italic text-[10px]", isMobile && "text-xs")}>
                +{pipelineConfig.customFields.length - 2} campos ocultos
              </p>
            )}
          </div>
        )}

        {/* Status de Finalização */}
        {(winConfirmation || lossReason || (completionType && completionReason)) && (
          <div className={cn("mt-2 rounded-md bg-muted/30 border border-border/20", isMobile ? "p-3" : "p-2.5")}>
            <div className="flex items-start gap-2">
              {winConfirmation ? (
                <>
                  <CheckCircle2 className={cn("text-green-500 mt-0.5 flex-shrink-0", isMobile ? "w-5 h-5" : "w-4 h-4")} />
                  <div className="flex-1 min-w-0">
                    <p className={cn("font-medium text-green-600", isMobile ? "text-sm" : "text-xs")}>Negócio Ganho</p>
                  </div>
                </>
              ) : lossReason ? (
                <>
                  <XCircle className={cn("text-red-500 mt-0.5 flex-shrink-0", isMobile ? "w-5 h-5" : "w-4 h-4")} />
                  <div className="flex-1 min-w-0">
                    <p className={cn("font-medium text-red-600", isMobile ? "text-sm" : "text-xs")}>Negócio Perdido</p>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}

        {/* Footer - Atendente + SLA */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/30 mt-auto">
          {displayAssignee ? (
            <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/50 px-2 py-1 rounded-full max-w-[50%]">
              {assignee ? (
                <User className={cn(isMobile ? "w-4 h-4" : "w-3 h-3")} />
              ) : (
                <Headphones className={cn(isMobile ? "w-4 h-4" : "w-3 h-3")} />
              )}
              <span className={cn("truncate font-medium", isMobile ? "text-sm" : "text-xs")}>{displayAssignee}</span>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground/50 italic">Sem responsável</div>
          )}
          
          <div className="flex items-center gap-2">
            <SLABadge 
              cardId={id}
              cardCreatedAt={createdAt}
              completionType={completionType}
              className={isMobile ? "text-sm" : "text-[10px] px-1.5 py-0.5 h-5"}
            />
            
            {customerProfileId && (
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="outline" className={cn("text-purple-600 border-purple-300 px-1.5", isMobile ? "h-6" : "h-5")}>
                    <History className={cn("w-3 h-3", !isMobile && "w-2.5 h-2.5")} />
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>Cliente Recorrente</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};