import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Settings, Brain, Wifi, MessageSquare, Sparkles } from 'lucide-react';
import { AIPromptBuilder } from '@/components/AIPromptBuilder';
import { CustomFieldsManager } from '@/components/CustomFieldsManager';
import { FunnelTypesManager } from '@/components/FunnelTypesManager';
import { PipelineStagesManager } from '@/components/PipelineStagesManager';
import { EvolutionSettings } from '@/components/EvolutionSettings';
import { ChatwootSettings } from '@/components/ChatwootSettings';
import { InactivityRulesManager } from '@/components/InactivityRulesManager';
import { MovementRulesManager } from '@/components/MovementRulesManager';
import { BehaviorTemplateSelector } from '@/components/BehaviorTemplateSelector';
import { BehaviorTemplatePreview } from '@/components/BehaviorTemplatePreview';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

// Ajustar a interface CustomField para corresponder à de promptBuilder
interface CustomField {
  id: string;
  field_name: string;
  field_label: string;
  field_type: 'text' | 'number' | 'date' | 'select' | 'email' | 'phone'; // Tipos específicos
  field_options?: any;
  is_required: boolean;
  position: number;
}

interface Column {
  id: string;
  name: string;
  position: number;
}

interface FunnelConfig {
  id: string;
  funnel_type: string;
  funnel_name: string;
  color: string;
  position: number;
}

interface BehaviorTemplate {
  id: string;
  name: string;
  business_type: string;
  description: string;
  config: any;
}

export default function BrainPage() {
  const { workspace, loading: workspaceLoading, fetchWorkspace } = useWorkspace(); // Desestruturação correta
  const { toast } = useToast();
  const [pipelineId, setPipelineId] = useState<string | null>(null);
  const [loadingPipeline, setLoadingPipeline] = useState(true);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [funnelTypes, setFunnelTypes] = useState<FunnelConfig[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<BehaviorTemplate | null>(null);
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);

  useEffect(() => {
    if (workspace && !workspaceLoading) {
      if (workspace.active_pipeline_id) { // active_pipeline_id pode ser string ou null
        setPipelineId(workspace.active_pipeline_id);
        fetchPipelineData(workspace.active_pipeline_id);
      } else {
        setLoadingPipeline(false);
      }
    }
  }, [workspace, workspaceLoading, fetchWorkspace]); // Adicionar fetchWorkspace como dependência

  const fetchPipelineData = async (currentPipelineId: string) => {
    setLoadingPipeline(true);
    try {
      // Fetch custom fields
      const { data: customFieldsData, error: customFieldsError } = await supabase
        .from('pipeline_custom_fields')
        .select('*')
        .eq('pipeline_id', currentPipelineId)
        .order('position');
      if (customFieldsError) throw customFieldsError;
      setCustomFields(customFieldsData || []);

      // Fetch columns
      const { data: columnsData, error: columnsError } = await supabase
        .from('columns')
        .select('*')
        .eq('pipeline_id', currentPipelineId)
        .order('position');
      if (columnsError) throw columnsError;
      setColumns(columnsData || []);

      // Fetch funnel types
      const { data: funnelTypesData, error: funnelTypesError } = await supabase
        .from('funnel_config')
        .select('*')
        .eq('pipeline_id', currentPipelineId)
        .order('position');
      if (funnelTypesError) throw funnelTypesError;
      setFunnelTypes(funnelTypesData || []);

    } catch (error: any) {
      console.error('Error fetching pipeline data:', error);
      toast({
        title: 'Erro ao carregar dados do pipeline',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoadingPipeline(false);
    }
  };

  const handlePipelineDataUpdate = () => {
    if (pipelineId) {
      fetchPipelineData(pipelineId);
    }
  };

  const handleCreatePipeline = async () => {
    if (!workspace) {
      toast({
        title: 'Erro',
        description: 'Nenhum workspace ativo para criar pipeline.',
        variant: 'destructive',
      });
      return;
    }

    setLoadingPipeline(true);
    try {
      // Create pipeline
      const { data: pipelineData, error: pipelineError } = await supabase
        .from('pipelines')
        .insert({ workspace_id: workspace.id })
        .select()
        .single();

      if (pipelineError) throw pipelineError;

      // Set as active pipeline for the workspace
      await supabase
        .from('workspaces')
        .update({ active_pipeline_id: pipelineData.id })
        .eq('id', workspace.id);

      setPipelineId(pipelineData.id);
      await fetchWorkspace(); // Re-fetch workspace to update active_pipeline_id
      await fetchPipelineData(pipelineData.id);

      toast({
        title: 'Pipeline criado',
        description: 'Um novo pipeline foi criado e definido como ativo.',
      });
    } catch (error: any) {
      console.error('Error creating pipeline:', error);
      toast({
        title: 'Erro ao criar pipeline',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoadingPipeline(false);
    }
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplate || !pipelineId) return;

    setIsApplyingTemplate(true);
    try {
      // Apply custom fields
      const customFieldsToInsert = selectedTemplate.config.custom_fields.map((field: any, index: number) => ({
        pipeline_id: pipelineId,
        field_name: field.field_name,
        field_label: field.field_label,
        field_type: field.field_type,
        field_options: field.field_options || null,
        is_required: field.is_required || false,
        position: index,
      }));
      if (customFieldsToInsert.length > 0) {
        const { error } = await supabase.from('pipeline_custom_fields').insert(customFieldsToInsert);
        if (error) throw error;
      }

      // Apply funnel types
      const funnelTypesToInsert = selectedTemplate.config.funnel_types.map((funnel: any, index: number) => ({
        pipeline_id: pipelineId,
        funnel_type: funnel.funnel_type,
        funnel_name: funnel.funnel_name,
        color: funnel.color,
        is_monetary: funnel.is_monetary || false,
        priority: funnel.priority || 0,
        lifecycle_stages: funnel.lifecycle_stages || [],
        inactivity_days: funnel.inactivity_days || 0,
        position: index,
      }));
      if (funnelTypesToInsert.length > 0) {
        const { error } = await supabase.from('funnel_config').insert(funnelTypesToInsert);
        if (error) throw error;
      }

      // Apply AI config
      const aiConfigToInsert = {
        pipeline_id: pipelineId,
        business_type: selectedTemplate.config.ai_config.business_type,
        objectives: selectedTemplate.config.ai_config.objectives,
        analyze_on_close: selectedTemplate.config.ai_config.analyze_on_close,
        analyze_on_message: selectedTemplate.config.ai_config.analyze_on_message,
        generated_prompt: '', // Will be generated by AIPromptBuilder
        model_name: 'google/gemini-2.5-flash',
        use_custom_prompt: false,
        template_id: selectedTemplate.id,
      };
      const { error: aiConfigError } = await supabase.from('pipeline_ai_config').insert(aiConfigToInsert);
      if (aiConfigError) throw aiConfigError;

      // Apply pipeline behaviors (if any)
      const pipelineBehaviorsToInsert = selectedTemplate.config.pipeline_behaviors?.map((behavior: any) => ({
        pipeline_id: pipelineId,
        behavior_template_id: behavior.behavior_template_id,
        is_customized: behavior.is_customized || false,
      })) || [];
      if (pipelineBehaviorsToInsert.length > 0) {
        const { error } = await supabase.from('pipeline_behaviors').insert(pipelineBehaviorsToInsert);
        if (error) throw error;
      }

      toast({
        title: 'Template aplicado',
        description: 'As configurações do template foram aplicadas ao seu pipeline.',
      });
      handlePipelineDataUpdate();
      setSelectedTemplate(null); // Clear selection after applying
    } catch (error: any) {
      console.error('Error applying template:', error);
      toast({
        title: 'Erro ao aplicar template',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsApplyingTemplate(false);
    }
  };


  if (workspaceLoading || loadingPipeline) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Nenhum Workspace Encontrado</CardTitle>
            <CardDescription>
              Parece que você não faz parte de nenhum workspace. Por favor, crie um ou peça para ser convidado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => toast({ title: "Funcionalidade em desenvolvimento" })}>Criar Workspace</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!pipelineId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Nenhum Pipeline Ativo</CardTitle>
            <CardDescription>
              Seu workspace não possui um pipeline ativo. Crie um novo pipeline para começar a usar o Brain.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleCreatePipeline} disabled={loadingPipeline}>
              {loadingPipeline ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Criar Novo Pipeline
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (pipelineId && customFields.length === 0 && funnelTypes.length === 0 && !selectedTemplate) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
        <Card className="w-full max-w-4xl">
          <CardHeader>
            <CardTitle>Selecione um Template de Comportamento</CardTitle>
            <CardDescription>
              Escolha um template para configurar rapidamente seu pipeline com campos personalizados, funis e configurações de IA.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <BehaviorTemplateSelector onSelect={setSelectedTemplate} />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedTemplate) {
    return (
      <div className="container mx-auto py-8">
        <h2 className="text-2xl font-bold mb-6">Prévia do Template: {selectedTemplate.name}</h2>
        <BehaviorTemplatePreview template={selectedTemplate} />
        <div className="flex justify-end gap-4 mt-6">
          <Button variant="outline" onClick={() => setSelectedTemplate(null)} disabled={isApplyingTemplate}>
            Cancelar
          </Button>
          <Button onClick={handleApplyTemplate} disabled={isApplyingTemplate}>
            {isApplyingTemplate ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Aplicar Template
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
        <Brain className="w-8 h-8 text-primary" />
        Configurações do Brain
      </h1>

      <Tabs defaultValue="ai-prompt" className="w-full">
        <TabsList className="grid w-full grid-cols-7"> {/* Aumentado para 7 colunas */}
          <TabsTrigger value="ai-prompt" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            IA
          </TabsTrigger>
          <TabsTrigger value="custom-fields" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Campos
          </TabsTrigger>
          <TabsTrigger value="funnel-types" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Funis
          </TabsTrigger>
          <TabsTrigger value="pipeline-stages" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Etapas
          </TabsTrigger>
          <TabsTrigger value="inactivity-rules" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Inatividade
          </TabsTrigger>
          <TabsTrigger value="movement-rules" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Movimentação
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Wifi className="w-4 h-4" />
            Integrações
          </TabsTrigger>
        </TabsList>

        <div className="mt-6 space-y-8">
          <TabsContent value="ai-prompt">
            <AIPromptBuilder pipelineId={pipelineId} customFields={customFields} onUpdate={handlePipelineDataUpdate} />
          </TabsContent>

          <TabsContent value="custom-fields">
            <CustomFieldsManager pipelineId={pipelineId} onUpdate={handlePipelineDataUpdate} />
          </TabsContent>

          <TabsContent value="funnel-types">
            <FunnelTypesManager pipelineId={pipelineId} onUpdate={handlePipelineDataUpdate} />
          </TabsContent>

          <TabsContent value="pipeline-stages">
            <PipelineStagesManager pipelineId={pipelineId} columns={columns} onUpdate={handlePipelineDataUpdate} />
          </TabsContent>

          <TabsContent value="inactivity-rules">
            <InactivityRulesManager pipelineId={pipelineId} onUpdate={handlePipelineDataUpdate} />
          </TabsContent>

          <TabsContent value="movement-rules">
            <MovementRulesManager pipelineId={pipelineId} onUpdate={handlePipelineDataUpdate} />
          </TabsContent>

          <TabsContent value="integrations">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wifi className="w-5 h-5" />
                  Gerenciar Integrações
                </CardTitle>
                <CardDescription>
                  Conecte seu pipeline a outras plataformas para automatizar a criação e atualização de cards.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Tabs defaultValue="chatwoot">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="chatwoot" className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Chatwoot
                    </TabsTrigger>
                    <TabsTrigger value="evolution" className="flex items-center gap-2">
                      <Wifi className="w-4 h-4" />
                      Evolution API
                    </TabsTrigger>
                  </TabsList>
                  <div className="mt-6">
                    <TabsContent value="chatwoot">
                      <ChatwootSettings pipelineId={pipelineId} />
                    </TabsContent>
                    <TabsContent value="evolution">
                      <EvolutionSettings pipelineId={pipelineId} />
                    </TabsContent>
                  </div>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}