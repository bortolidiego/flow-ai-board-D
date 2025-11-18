import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Settings, Zap, Target, Database, Clock, MessageSquare } from 'lucide-react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AIPromptBuilder } from '@/components/AIPromptBuilder';
import { CustomFieldsManager } from '@/components/CustomFieldsManager';
import { FunnelTypesManager } from '@/components/FunnelTypesManager';
import { FunnelLifecycleManager } from '@/components/FunnelLifecycleManager';
import { MovementRulesManager } from '@/components/MovementRulesManager';
import { InactivityRulesManager } from '@/components/InactivityRulesManager';
import { PipelineStagesManager } from '@/components/PipelineStagesManager';
import { CardMovementRulesManager } from '@/components/CardMovementRulesManager';
import { ChatwootSettings } from '@/components/ChatwootSettings';

interface Column {
  id: string;
  name: string;
  position: number;
}

interface CustomField {
  id: string;
  field_name: string;
  field_label: string;
  field_type: 'text' | 'number' | 'date' | 'select' | 'email' | 'phone';
  field_options?: any;
  is_required: boolean;
  position: number;
}

interface PipelineData {
  id: string;
  columns: Column[];
  customFields: CustomField[];
  aiConfig: any;
}

function BrainPage() {
  const { workspace, loading: workspaceLoading } = useWorkspace();
  const [pipelineData, setPipelineData] = useState<PipelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pipelineId, setPipelineId] = useState<string | null>(null);

  const fetchPipelineData = async (workspaceId: string) => {
    setLoading(true);
    try {
      // 1. Buscar a primeira pipeline do workspace
      const { data: pipeline, error: pipelineError } = await supabase
        .from('pipelines')
        .select('id')
        .eq('workspace_id', workspaceId)
        .limit(1)
        .maybeSingle();

      if (pipelineError) throw pipelineError;

      if (!pipeline) {
        setPipelineId(null);
        setPipelineData(null);
        return;
      }

      const currentPipelineId = pipeline.id;
      setPipelineId(currentPipelineId);

      // 2. Buscar colunas
      const { data: columnsData, error: columnsError } = await supabase
        .from('columns')
        .select('id, name, position')
        .eq('pipeline_id', currentPipelineId)
        .order('position');

      if (columnsError) throw columnsError;

      // 3. Buscar campos customizados
      const { data: customFieldsData, error: customFieldsError } = await supabase
        .from('pipeline_custom_fields')
        .select('*')
        .eq('pipeline_id', currentPipelineId)
        .order('position');

      if (customFieldsError) throw customFieldsError;

      // 4. Buscar AI Config (para passar para o AIPromptBuilder)
      const { data: aiConfigData, error: aiConfigError } = await supabase
        .from('pipeline_ai_config')
        .select('*')
        .eq('pipeline_id', currentPipelineId)
        .maybeSingle();

      if (aiConfigError) throw aiConfigError;

      setPipelineData({
        id: currentPipelineId,
        columns: columnsData || [],
        customFields: customFieldsData || [],
        aiConfig: aiConfigData,
      });

    } catch (error: any) {
      console.error('Error fetching pipeline data:', error);
      toast.error(`Erro ao carregar dados da pipeline: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!workspaceLoading && workspace) {
      fetchPipelineData(workspace.id);
    } else if (!workspaceLoading && !workspace) {
      setLoading(false);
    }
  }, [workspaceLoading, workspace]);

  if (loading || workspaceLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Workspace não encontrado</CardTitle>
            <CardDescription>
              Você precisa criar ou ser adicionado a um workspace para acessar as configurações.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!pipelineId) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Pipeline não configurada</CardTitle>
            <CardDescription>
              Nenhuma pipeline encontrada para este workspace. Por favor, crie uma pipeline.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { columns, customFields } = pipelineData!;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Brain da Pipeline</h1>
      <p className="text-muted-foreground">
        Configure a inteligência artificial, funis, etapas e integrações para otimizar o fluxo de trabalho.
      </p>

      <Tabs defaultValue="ai" className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-auto flex-wrap">
          <TabsTrigger value="ai" className="flex items-center gap-2"><Zap className="w-4 h-4" /> Inteligência Artificial</TabsTrigger>
          <TabsTrigger value="funnels" className="flex items-center gap-2"><Target className="w-4 h-4" /> Funis & Ciclo de Vida</TabsTrigger>
          <TabsTrigger value="stages" className="flex items-center gap-2"><Database className="w-4 h-4" /> Etapas & Campos</TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center gap-2"><Clock className="w-4 h-4" /> Regras de Movimentação</TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Integrações</TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="space-y-6 mt-6">
          <AIPromptBuilder 
            pipelineId={pipelineId} 
            customFields={customFields} 
            onUpdate={() => fetchPipelineData(workspace.id)}
          />
        </TabsContent>

        <TabsContent value="funnels" className="space-y-6 mt-6">
          <FunnelTypesManager 
            pipelineId={pipelineId} 
            onUpdate={() => fetchPipelineData(workspace.id)}
          />
          <FunnelLifecycleManager 
            pipelineId={pipelineId} 
            onUpdate={() => fetchPipelineData(workspace.id)}
          />
        </TabsContent>

        <TabsContent value="stages" className="space-y-6 mt-6">
          <PipelineStagesManager 
            pipelineId={pipelineId} 
            columns={columns} 
            onUpdate={() => fetchPipelineData(workspace.id)}
          />
          <CustomFieldsManager 
            pipelineId={pipelineId} 
            onUpdate={() => fetchPipelineData(workspace.id)}
          />
        </TabsContent>

        <TabsContent value="rules" className="space-y-6 mt-6">
          <MovementRulesManager 
            pipelineId={pipelineId} 
            onUpdate={() => fetchPipelineData(workspace.id)}
          />
          <InactivityRulesManager 
            pipelineId={pipelineId} 
            onUpdate={() => fetchPipelineData(workspace.id)}
          />
          <CardMovementRulesManager
            pipelineId={pipelineId}
            columns={columns}
            customFields={customFields}
            onUpdate={() => fetchPipelineData(workspace.id)}
          />
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6 mt-6">
          <ChatwootSettings pipelineId={pipelineId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default BrainPage;