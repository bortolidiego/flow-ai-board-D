import { SLABadge } from '@/components/SLABadge';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Bot, User, MessageSquare, TrendingUp, Star, CheckCircle2, XCircle, ExternalLink, Clock, History, Lock, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
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
  const priorityColors = {
    low: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    high: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
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
    // Não abrir dialog se estiver arrastando ou clicando no handle
    if (isDragging || (e.target as HTMLElement).closest('[data-drag-handle]')) {
      return;
    }

    // Se estiver no modo de seleção, alternar seleção
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
  return <Card ref={setNodeRef} style={style} onClick={handleClick} className={cn(
    "group relative backdrop-blur-md transition-all duration-300",
    selectionMode ? 'cursor-pointer' : 'active:cursor-grabbing cursor-pointer',
    isDragging ? 'opacity-50 shadow-glow-primary' : isMobile ? 'active:shadow-md' : 'hover:shadow-glow-primary/50',
    isSelected ? 'border-primary/80 bg-primary/5 shadow-glow-primary/30 ring-2 ring-primary/30' : 'border-border/50 hover:border-primary/50'
  )}>
      <div className={cn("space-y-2.5", isMobile ? "p-5" : "p-4")}>
        {/* Checkbox de seleção quando em modo de seleção */}
        {selectionMode && <div className={cn("absolute z-10", isMobile ? "top-4 right-4" : "top-3 right-3")} onClick={handleCheckboxClick}>
            <Checkbox checked={isSelected} onCheckedChange={onSelectToggle} className={cn(isMobile ? "h-6 w-6" : "h-5 w-5")} />
          </div>}
        {/* Header - Nome do Lead + AI Badge + Drag Handle */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {aiSuggested && <Bot className={cn("text-primary animate-pulse flex-shrink-0", isMobile ? "w-5 h-5" : "w-4 h-4")} />}
            <h3 className={cn("font-semibold text-foreground leading-tight truncate", isMobile ? "text-lg" : "text-base", selectionMode && 'pr-8')}>
              {chatwootContactName || title}
            </h3>
          </div>
          {!selectionMode && <button {...attributes} {...listeners} data-drag-handle className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground flex-shrink-0" onClick={e => e.stopPropagation()}>
              <GripVertical className={cn(isMobile ? "w-6 h-6" : "w-5 h-5")} />
            </button>}
        </div>

        {/* Linha de Contexto - Funil + Assunto/Intenção + Link Chatwoot + Tempo */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {inboxName && <div className={cn("flex items-center gap-1", isMobile ? "text-sm" : "text-xs")}>
                <MessageSquare className={cn("text-muted-foreground", isMobile ? "w-4 h-4" : "w-3 h-3")} />
                <span className="text-muted-foreground">{inboxName}</span>
              </div>}
            {funnelType && (
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className={cn(isMobile ? "text-sm px-2 py-1" : "text-xs")}>
                  {funnelType}
                </Badge>
                {currentLifecycleStage && (
                  <>
                    <ArrowRight className={cn("text-muted-foreground", isMobile ? "w-3.5 h-3.5" : "w-3 h-3")} />
                    <Badge variant="secondary" className={cn(isMobile ? "text-sm px-2 py-1" : "text-xs")}>
                      {currentLifecycleStage}
                    </Badge>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className={cn("flex items-center gap-1 text-muted-foreground", isMobile ? "text-sm" : "text-xs")}>
              <Clock className={cn(isMobile ? "w-4 h-4" : "w-3 h-3")} />
              <span>Criado há {formatTimeAgo(createdAt)}</span>
            </div>
            {chatwootConversationId && chatwootUrl && (
              <Button
                variant="ghost"
                size="icon"
                className={cn("opacity-70 hover:opacity-100", isMobile ? "h-8 w-8" : "h-6 w-6")}
                onClick={openChatwootConversation}
              >
                <ExternalLink className={cn(isMobile ? "w-4 h-4" : "w-3 h-3")} />
              </Button>
            )}
          </div>
        </div>

        {/* Métricas Grid - Qualidade + Probabilidade (apenas se AI config existir) */}
        {pipelineConfig?.aiConfig && (funnelScore !== undefined || serviceQualityScore !== undefined) && <div className={cn("gap-2 py-2", isMobile ? "grid grid-cols-1" : "grid grid-cols-2")}>
            {serviceQualityScore !== undefined && <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1">
                  <Star className={cn(getScoreColor(serviceQualityScore), isMobile ? "w-4 h-4" : "w-3 h-3")} />
                  <span className={cn("font-bold", getScoreColor(serviceQualityScore), isMobile ? "text-base" : "text-sm")}>
                    {serviceQualityScore}%
                  </span>
                </div>
                <span className={cn("text-muted-foreground", isMobile ? "text-sm" : "text-xs")}>Qualidade</span>
              </div>}
            {funnelScore !== undefined && <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1">
                  <TrendingUp className={cn(getScoreColor(funnelScore), isMobile ? "w-4 h-4" : "w-3 h-3")} />
                  <span className={cn("font-bold", getScoreColor(funnelScore), isMobile ? "text-base" : "text-sm")}>
                    {funnelScore}%
                  </span>
                </div>
                <span className={cn("text-muted-foreground", isMobile ? "text-sm" : "text-xs")}>Chance</span>
              </div>}
          </div>}

        {/* Seção Valor + Produto */}
        {(value || productItem) && <div className="space-y-1 py-2 border-t border-border/30">
            {value && <div className={cn("font-bold text-primary", isMobile ? "text-xl" : "text-lg")}>
                {formatCurrency(value)}
              </div>}
            {productItem && <div className={cn("text-muted-foreground truncate", isMobile ? "text-sm" : "text-xs")}>
                📦 {productItem}
              </div>}
          </div>}

        {/* Progresso do Ciclo de Vida */}
        {funnelType && currentLifecycleStage && lifecycleProgressPercent !== undefined && (
          <div className="space-y-1.5 border-t pt-2 mt-2">
            {(() => {
              const funnelConfig = pipelineConfig?.funnelTypes?.find((f: any) => f.funnel_type === funnelType);
              if (!funnelConfig) return null;
              return (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {isMonetaryLocked && <Lock className="h-3 w-3 text-red-500" />}
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs font-medium", isMonetaryLocked && "border-red-300 bg-red-50")}
                        style={{ borderColor: funnelConfig.color }}
                      >
                        🎯 {funnelConfig.funnel_name}
                      </Badge>
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground">
                      {lifecycleProgressPercent}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>📍 {currentLifecycleStage}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div 
                      className="h-1.5 rounded-full transition-all" 
                      style={{ 
                        width: `${lifecycleProgressPercent}%`,
                        backgroundColor: funnelConfig.color
                      }}
                    />
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* Campos Customizados */}
        {pipelineConfig?.customFields && pipelineConfig.customFields.length > 0 && <div className="space-y-1.5 py-2 border-t border-border/30">
            {pipelineConfig.customFields.slice(0, 2).map(field => {
          const fieldValue = customFieldsData[field.field_name];
          if (!fieldValue) return null;
          return <div key={field.id} className="flex items-center justify-between gap-2">
                  <span className={cn("text-muted-foreground truncate", isMobile ? "text-sm" : "text-xs")}>
                    {field.field_label}:
                  </span>
                  <span className={cn("font-medium truncate max-w-[60%]", isMobile ? "text-sm" : "text-xs")}>
                    {field.field_type === 'boolean' ? fieldValue ? 'Sim' : 'Não' : String(fieldValue)}
                  </span>
                </div>;
        })}
            {pipelineConfig.customFields.length > 2 && <p className={cn("text-muted-foreground italic", isMobile ? "text-sm" : "text-xs")}>
                +{pipelineConfig.customFields.length - 2} campos
              </p>}
          </div>}

        {/* Status de Finalização - Mostra justificativa para todos os tipos de conclusão */}
        {(winConfirmation || lossReason || (completionType && completionReason)) && <div className={cn("mt-3 rounded-md bg-muted/30 border border-border/20", isMobile ? "p-3" : "p-2.5")}>
            <div className="flex items-start gap-2">
              {winConfirmation ? <>
                  <CheckCircle2 className={cn("text-green-500 mt-0.5 flex-shrink-0", isMobile ? "w-5 h-5" : "w-4 h-4")} />
                  <div className="flex-1 min-w-0">
                    <p className={cn("font-medium text-green-600", isMobile ? "text-sm" : "text-xs")}>Negócio Ganho</p>
                    <p className={cn("text-muted-foreground mt-1 line-clamp-2", isMobile ? "text-sm" : "text-xs")}>{winConfirmation}</p>
                  </div>
                </> : lossReason ? <>
                  <XCircle className={cn("text-red-500 mt-0.5 flex-shrink-0", isMobile ? "w-5 h-5" : "w-4 h-4")} />
                  <div className="flex-1 min-w-0">
                    <p className={cn("font-medium text-red-600", isMobile ? "text-sm" : "text-xs")}>Negócio Perdido</p>
                    <p className={cn("text-muted-foreground mt-1 line-clamp-2", isMobile ? "text-sm" : "text-xs")}>{lossReason}</p>
                  </div>
                </> : completionType === 'completed' && completionReason ? <>
                  <CheckCircle2 className={cn("text-blue-500 mt-0.5 flex-shrink-0", isMobile ? "w-5 h-5" : "w-4 h-4")} />
                  <div className="flex-1 min-w-0">
                    <p className={cn("font-medium text-blue-600", isMobile ? "text-sm" : "text-xs")}>Concluído</p>
                    <p className={cn("text-muted-foreground mt-1 line-clamp-2", isMobile ? "text-sm" : "text-xs")}>{completionReason}</p>
                  </div>
                </> : null}
            </div>
          </div>}

        {/* Footer - Atendente + Prioridade */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/30">
          {assignee ? <div className={cn("flex items-center gap-1 text-muted-foreground", isMobile ? "text-sm" : "text-xs")}>
              <User className={cn(isMobile ? "w-4 h-4" : "w-3 h-3")} />
              <span className="truncate">{assignee}</span>
            </div> : <div />}
          <div className="flex items-center gap-2">
            {/* SLA Badge */}
            <SLABadge 
              cardId={id}
              cardCreatedAt={createdAt}
              completionType={completionType}
              className={isMobile ? "text-sm" : "text-xs"}
            />
            
            {/* Badge de cliente retornando */}
            {customerProfileId && (
              <Badge variant="outline" className={cn("text-purple-600 border-purple-300", isMobile ? "text-sm px-2 py-1" : "text-xs")}>
                <History className="w-3 h-3 mr-1" />
                Cliente
              </Badge>
            )}
            
            {conversationStatus === 'closed' && <Badge variant="outline" className={cn(isMobile ? "text-sm px-2 py-1" : "text-xs")}>
                Fechada
              </Badge>}
            
          </div>
        </div>
      </div>
    </Card>;
};