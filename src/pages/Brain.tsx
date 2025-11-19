import { useState, useEffect } from 'react';
import { Brain as BrainIcon, Settings, Database, GitBranch, Sparkles, Columns3, Target, CheckCircle2, AlertCircle, Building2, Plug, Timer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useUserRole } from '@/hooks/useUserRole';
import { useKanbanData } from '@/hooks/useKanbanData';
import { PipelineStagesManager } from '@/components/PipelineStagesManager';
import { CustomFieldsManager } from '@/components/CustomFieldsManager';
import { FunnelLifecycleManager } from '@/components/FunnelLifecycleManager';
import { MovementRulesManager } from '@/components/MovementRulesManager';
import { InactivityRulesManager } from '@/components/InactivityRulesManager';
import { AIPromptBuilder } from '@/components/AIPromptBuilder';
import { ChatwootSettings } from '@/components/ChatwootSettings';
import { SLAConfigManager } from '@/components/SLAConfigManager';
import { IntegrationStatusBadge } from '@/components/IntegrationStatusBadge';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Brain = () => {
  const { workspace, loading: workspaceLoading, updateWorkspaceName } = useWorkspace();
  const { isAdmin } = useUserRole();
  const { pipeline, loading, fetchPipeline } = useKanbanData(workspace?.id);
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [templateInfo, setTemplateInfo] = useState<any>(null);
  const [funnelTypes, setFunnelTypes] = useState<any[]>([]);
  const [aiConfig, setAiConfig] = useState<any>(null);
  const [chatwootIntegration, setChatwootIntegration] = useState<any>(null);
  const [workspaceName, setWorkspaceName] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (workspace) {
      setWorkspaceName(workspace.name);
    }
  }, [workspace]);

  useEffect(() => {
    if (pipeline) {
      loadCustomFields();
      loadTemplateInfo();
      loadFunnelTypes();
      loadAiConfig();
      loadChatwootIntegration();
    }
  }, [pipeline]);

  const handleUpdateWorkspaceName = async () => {
    if (!workspace || workspaceName === workspace.name) return;
    
    const { error } = await updateWorkspaceName(workspaceName);
    if (error) {
      toast({
        title: 'Erro ao atualizar nome',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Nome atualizado',
        description: 'O nome do workspace foi atualizado com sucesso.',
      });
    }
  };

  const loadCustomFields = async () => {
    if (!pipeline) return;
    
    try {
      const { data, error } = await supabase
        .from('pipeline_custom_fields')
        .select('*')
        .eq('pipeline_id', pipeline.id)
        .order('position');

      if (error) throw error;
      setCustomFields(data || []);
    } catch (error) {
      console.error('Error loading custom fields:', error);
    }
  };

  const loadTemplateInfo = async () => {
    if (!pipeline) return;
    
    try {
      const { data, error } = await supabase
        .from('pipeline_behaviors')
        .select('*, behavior_templates(*)')
        .eq('pipeline_id', pipeline.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setTemplateInfo(data);
    } catch (error) {
      console.error('Error loading template info:', error);
    }
  };

  const loadFunnelTypes = async () => {
    if (!pipeline) return;
    
    try {
      const { data, error } = await supabase
        .from('funnel_config')
        .select('*')
        .eq('pipeline_id', pipeline.id);

      if (error) throw error;
      setFunnelTypes(data || []);
    } catch (error) {
      console.error('Error loading funnel types:', error);
    }
  };

  const loadAiConfig = async () => {
    if (!pipeline) return;
    
    try {
      const { data, error } = await supabase
        .from('pipeline_ai_config')
        .select('*')
        .eq('pipeline_id', pipeline.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setAiConfig(data);
    } catch (error) {
      console.error('Error loading AI config:', error);
    }
  };

  const loadChatwootIntegration = async () => {
    if (!pipeline) return;
    
    try {
      const { data, error } = await supabase
        .from('chatwoot_integrations')
        .select('*')
        .eq('pipeline_id', pipeline.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setChatwootIntegration(data);
    } catch (error) {
      console.error('Error loading Chatwoot integration:', error);
    }
  };

  const getChatwootStatus = () => {
    if (!chatwootIntegration) return 'not-configured';
    return chatwootIntegration.active ? 'active' : 'paused';
  };

  if (workspaceLoading || loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!pipeline) {
    return (
      <div className="h-full bg-gradient-to-br from-background via-background to-primary/5 overflow-y-auto">
        <div className="container mx-auto px-6 py-8">
          <Card className="border-2 border-dashed border-primary/30">
            <CardContent className="flex flex-col items-center justify-center py-16 px-6">
              <div className="relative mb-6">
                <BrainIcon className="w-20 h-20 text-primary/30" />
                <Sparkles className="w-8 h-8 text-secondary absolute -top-2 -right-2 animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Nenhum pipeline configurado</h2>
              <p className="text-muted-foreground text-center mb-6 max-w-md">
                Comece criando seu primeiro pipeline usando um template inteligente.
              </p>
              <Button onClick={() => navigate('/brain/new')} size="lg" className="gap-2">
                <Sparkles className="w-5 h-5" />
                Criar Pipeline
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    // Adicionado h-full e overflow-y-auto para permitir scroll independente nesta página
    <div className="h-full bg-gradient-to-br from-background via-background to-primary/5 overflow-y-auto">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <BrainIcon className="w-10 h-10 text-primary" />
                <Sparkles className="w-4 h-4 text-secondary absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  AI Brain Configuration
                </h1>
                <p className="text-sm text-muted-foreground">
                  Configure como a IA analisa e gerencia seus cards
                </p>
              </div>
            </div>
            {workspace && (
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-muted-foreground" />
                {isAdmin ? (
                  <Input
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    onBlur={handleUpdateWorkspaceName}
                    className="max-w-xs"
                  />
                ) : (
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    {workspace.name}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Etapas</p>
                    <p className="text-2xl font-bold">{pipeline.columns?.length || 0}</p>
                  </div>
                  <Columns3 className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-secondary/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Campos</p>
                    <p className="text-2xl font-bold">{customFields.length}</p>
                  </div>
                  <Database className="w-8 h-8 text-secondary" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-accent/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Funis</p>
                    <p className="text-2xl font-bold">{funnelTypes.length}</p>
                  </div>
                  <Target className="w-8 h-8 text-accent" />
                </div>
              </CardContent>
            </Card>

            <Card className={aiConfig ? "border-primary/20" : "border-destructive/20"}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">IA Config</p>
                    <p className="text-sm font-semibold flex items-center gap-1">
                      {aiConfig ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                          Ativo
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-destructive" />
                          Inativo
                        </>
                      )}
                    </p>
                  </div>
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className={
              getChatwootStatus() === 'active' 
                ? "border-primary/20" 
                : getChatwootStatus() === 'paused'
                ? "border-orange-500/20"
                : "border-muted"
            }>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Chatwoot</p>
                    <IntegrationStatusBadge status={getChatwootStatus()} size="sm" />
                  </div>
                  <Plug className={`w-8 h-8 ${
                    getChatwootStatus() === 'active' 
                      ? 'text-primary' 
                      : getChatwootStatus() === 'paused'
                      ? 'text-orange-500'
                      : 'text-muted-foreground'
                  }`} />
                </div>
              </CardContent>
            </Card>
          </div>

          {templateInfo && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-semibold">
                      Template: {templateInfo.behavior_templates?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {templateInfo.behavior_templates?.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="stages" className="space-y-6">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="stages" className="flex items-center gap-2">
                <Columns3 className="w-4 h-4" />
                Etapas
              </TabsTrigger>
              <TabsTrigger value="custom-fields" className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                Campos
              </TabsTrigger>
              <TabsTrigger value="funnels" className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Funis
              </TabsTrigger>
              <TabsTrigger value="sla" className="flex items-center gap-2">
                <Timer className="w-4 h-4" />
                SLA / Prazos
              </TabsTrigger>
              <TabsTrigger value="card-movement" className="flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                Movimentação
              </TabsTrigger>
              <TabsTrigger value="ai-behavior" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Comportamento IA
              </TabsTrigger>
              <TabsTrigger value="integrations" className="flex items-center gap-2">
                <Plug className="w-4 h-4" />
                Integrações
              </TabsTrigger>
            </TabsList>

            <TabsContent value="stages" className="space-y-4">
              <PipelineStagesManager 
                pipelineId={pipeline.id}
                columns={pipeline.columns || []}
                onUpdate={fetchPipeline}
              />
            </TabsContent>

            <TabsContent value="custom-fields" className="space-y-4">
              <CustomFieldsManager 
                pipelineId={pipeline.id}
                onUpdate={() => {
                  fetchPipeline();
                  loadCustomFields();
                }}
              />
            </TabsContent>

            <TabsContent value="funnels" className="space-y-4">
              <FunnelLifecycleManager 
                pipelineId={pipeline.id}
                onUpdate={fetchPipeline}
              />
            </TabsContent>

            <TabsContent value="sla" className="space-y-4">
              <SLAConfigManager 
                pipelineId={pipeline.id}
              />
            </TabsContent>

            <TabsContent value="card-movement" className="space-y-4">
              <MovementRulesManager
                pipelineId={pipeline.id}
                onUpdate={fetchPipeline}
              />
              <InactivityRulesManager
                pipelineId={pipeline.id}
                onUpdate={fetchPipeline}
              />
            </TabsContent>

            <TabsContent value="ai-behavior" className="space-y-4">
              <AIPromptBuilder
                pipelineId={pipeline.id}
                customFields={customFields}
                onUpdate={fetchPipeline}
              />
            </TabsContent>

            <TabsContent value="integrations" className="space-y-4">
              <ChatwootSettings 
                pipelineId={pipeline.id}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Brain;