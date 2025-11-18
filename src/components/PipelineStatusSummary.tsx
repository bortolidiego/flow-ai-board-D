import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Zap, Target, MessageSquare, CheckCircle2, AlertCircle, Settings, Database } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { IntegrationStatusBadge } from './IntegrationStatusBadge';
import { toast } from 'sonner';

interface PipelineStatusSummaryProps {
  pipelineId: string;
  onDataLoaded: (data: any) => void;
}

interface StatusData {
  templateName: string;
  aiStatus: 'configured' | 'not-configured';
  chatwootStatus: 'active' | 'paused' | 'not-configured';
  funnelCount: number;
  customFieldCount: number;
}

export function PipelineStatusSummary({ pipelineId, onDataLoaded }: PipelineStatusSummaryProps) {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
  }, [pipelineId]);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      // 1. Behavior Template (para nome do template)
      const { data: behaviorData } = await supabase
        .from('pipeline_behaviors')
        .select('behavior_templates(name)')
        .eq('pipeline_id', pipelineId)
        .maybeSingle();
      
      const templateName = (behaviorData?.behavior_templates as any)?.name || 'Customizado';

      // 2. AI Config Status
      const { data: aiConfigData } = await supabase
        .from('pipeline_ai_config')
        .select('id')
        .eq('pipeline_id', pipelineId)
        .maybeSingle();
      
      const aiStatus = aiConfigData ? 'configured' : 'not-configured';

      // 3. Chatwoot Integration Status
      const { data: chatwootData } = await supabase
        .from('chatwoot_integrations')
        .select('active')
        .eq('pipeline_id', pipelineId)
        .maybeSingle();
      
      let chatwootStatus: 'active' | 'paused' | 'not-configured' = 'not-configured';
      if (chatwootData) {
        chatwootStatus = chatwootData.active ? 'active' : 'paused';
      }

      // 4. Funnel Count
      const { count: funnelCount } = await supabase
        .from('funnel_config')
        .select('id', { count: 'exact' })
        .eq('pipeline_id', pipelineId);

      // 5. Custom Field Count
      const { count: customFieldCount } = await supabase
        .from('pipeline_custom_fields')
        .select('id', { count: 'exact' })
        .eq('pipeline_id', pipelineId);

      const newStatus: StatusData = {
        templateName,
        aiStatus,
        chatwootStatus,
        funnelCount: funnelCount || 0,
        customFieldCount: customFieldCount || 0,
      };

      setStatus(newStatus);
      onDataLoaded(newStatus);

    } catch (error) {
      console.error('Error fetching pipeline status:', error);
      toast.error('Erro ao carregar status da pipeline.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Carregando status da pipeline...</span>
        </CardContent>
      </Card>
    );
  }

  if (!status) return null;

  return (
    <Card className="border-2 border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Status Atual da Pipeline
        </CardTitle>
        <CardDescription>
          Resumo das configurações ativas e integrações.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Template */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Template Aplicado</p>
            <Badge variant="secondary" className="text-sm">
              <Settings className="w-3 h-3 mr-1" />
              {status.templateName}
            </Badge>
          </div>

          {/* AI Status */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Análise de IA</p>
            <Badge 
              variant={status.aiStatus === 'configured' ? 'default' : 'destructive'} 
              className="text-sm"
            >
              {status.aiStatus === 'configured' ? (
                <CheckCircle2 className="w-3 h-3 mr-1" />
              ) : (
                <AlertCircle className="w-3 h-3 mr-1" />
              )}
              {status.aiStatus === 'configured' ? 'Configurada' : 'Pendente'}
            </Badge>
          </div>

          {/* Funnel Count */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Funis Configurados</p>
            <Badge variant="outline" className="text-sm">
              <Target className="w-3 h-3 mr-1" />
              {status.funnelCount} Funil{status.funnelCount !== 1 ? 's' : ''}
            </Badge>
          </div>

          {/* Custom Fields Count */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Campos Customizados</p>
            <Badge variant="outline" className="text-sm">
              <Database className="w-3 h-3 mr-1" />
              {status.customFieldCount} Campo{status.customFieldCount !== 1 ? 's' : ''}
            </Badge>
          </div>

          {/* Chatwoot Status */}
          <div className="space-y-1 col-span-2 md:col-span-1">
            <p className="text-xs font-medium text-muted-foreground">Integração Chatwoot</p>
            <IntegrationStatusBadge status={status.chatwootStatus} size="md" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}