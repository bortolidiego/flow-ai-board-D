"use client";

import { useState, useEffect } from 'react';
import { Brain as BrainIcon, Settings, Database, GitBranch, Sparkles, Columns3, Target, CheckCircle2, Zap, MessageSquare } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PipelineStagesManager } from '@/components/PipelineStagesManager';
import { CustomFieldsManager } from '@/components/CustomFieldsManager';
import { FunnelTypesManager } from '@/components/FunnelTypesManager';
import { FunnelLifecycleManager } from '@/components/FunnelLifecycleManager';
import { AIPromptBuilder } from '@/components/AIPromptBuilder';
import { CardMovementRulesManager } from '@/components/CardMovementRulesManager';
import { InactivityRulesManager } from '@/components/InactivityRulesManager';
import { MovementRulesManager } from '@/components/MovementRulesManager';
import { ChatwootSettings } from '@/components/ChatwootSettings';
import { EvolutionSettings } from '@/components/EvolutionSettings';
import { IntegrationStatusBadge } from '@/components/IntegrationStatusBadge';
import { Badge } from '@/components/ui/badge';

interface Column {
  id: string;
  name: string;
  position: number;
}

// Updated CustomField interface to match the expected type
interface CustomField {
  id: string;
  field_name: string;
  field_label: string;
  field_type: "number" | "select" | "text" | "date" | "email" | "phone";
  is_required: boolean;
}

interface FunnelType {
  id: string;
  funnel_type: string;
  funnel_name: string;
  color: string;
  is_monetary: boolean;
  priority: number;
  lifecycle_stages: any[];
}

export default function Brain() {
  const [activeTab, setActiveTab] = useState('pipeline');
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [pipelineId, setPipelineId] = useState<string | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [funnelTypes, setFunnelTypes] = useState<FunnelType[]>([]);
  const [hasChatwootIntegration, setHasChatwootIntegration] = useState(false);
  const [hasEvolutionIntegration, setHasEvolutionIntegration] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    initializeWorkspace();
  }, []);

  const initializeWorkspace = async () => {
    try {
      // Get user's workspace
      const { data: workspaceData, error: workspaceError } = await supabase
        .from('workspaces')
        .select('id')
        .limit(1)
        .single();

      if (workspaceError) throw workspaceError;
      setWorkspaceId(workspaceData.id);

      // Get or create pipeline
      let pipelineData;
      const { data: existingPipeline, error: pipelineError } = await supabase
        .from('pipelines')
        .select('id')
        .eq('workspace_id', workspaceData.id)
        .limit(1)
        .maybeSingle();

      if (pipelineError) throw pipelineError;

      if (existingPipeline) {
        pipelineData = existingPipeline;
      } else {
        const { data: newPipeline, error: createError } = await supabase
          .from('pipelines')
          .insert({ workspace_id: workspaceData.id })
          .select()
          .single();

        if (createError) throw createError;
        pipelineData = newPipeline;
      }

      setPipelineId(pipelineData.id);
      loadPipelineData(pipelineData.id);
    } catch (error: any) {
      console.error('Error initializing workspace:', error);
      toast({
        title: 'Erro',
        description: `Falha ao inicializar workspace: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  const loadPipelineData = async (pipelineId: string) => {
    try {
      // Load columns
      const { data: columnsData, error: columnsError } = await supabase
        .from('columns')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .order('position');

      if (columnsError) throw columnsError;
      setColumns(columnsData || []);

      // Load custom fields
      const { data: fieldsData, error: fieldsError } = await supabase
        .from('pipeline_custom_fields')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .order('position');

      if (fieldsError) throw fieldsError;
      setCustomFields(fieldsData || []);

      // Load funnel types
      const { data: funnelData, error: funnelError } = await supabase
        .from('funnel_config')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .order('position');

      if (funnelError) throw funnelError;
      setFunnelTypes(funnelData || []);

      // Check integrations
      const { data: chatwootData } = await supabase
        .from('chatwoot_integrations')
        .select('id')
        .eq('pipeline_id', pipelineId)
        .maybeSingle();

      setHasChatwootIntegration(!!chatwootData);

      const { data: evolutionData } = await supabase
        .from('evolution_integrations')
        .select('id')
        .eq('pipeline_id', pipelineId)
        .maybeSingle();

      setHasEvolutionIntegration(!!evolutionData);
    } catch (error: any) {
      console.error('Error loading pipeline data:', error);
      toast({
        title: 'Erro',
        description: `Falha ao carregar dados: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  const handlePipelineUpdate = () => {
    if (pipelineId) {
      loadPipelineData(pipelineId);
    }
  };

  if (!pipelineId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-3">
        <BrainIcon className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Brain - Configurações Inteligentes</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
          <TabsTrigger value="pipeline" className="flex items-center gap-2">
            <Columns3 className="h-4 w-4" />
            <span className="hidden sm:inline">Pipeline</span>
          </TabsTrigger>
          <TabsTrigger value="funnels" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Funis</span>
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">IA</span>
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            <span className="hidden sm:inline">Regras</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Integrações</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Avançado</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <PipelineStagesManager
              pipelineId={pipelineId}
              columns={columns}
              onUpdate={handlePipelineUpdate}
            />
            <CustomFieldsManager
              pipelineId={pipelineId}
              onUpdate={handlePipelineUpdate}
            />
          </div>
        </TabsContent>

        <TabsContent value="funnels" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <FunnelTypesManager
              pipelineId={pipelineId}
              onUpdate={handlePipelineUpdate}
            />
            <FunnelLifecycleManager
              pipelineId={pipelineId}
              onUpdate={handlePipelineUpdate}
            />
          </div>
        </TabsContent>

        <TabsContent value="ai" className="space-y-6">
          <AIPromptBuilder
            pipelineId={pipelineId}
            customFields={customFields}
            onUpdate={handlePipelineUpdate}
          />
        </TabsContent>

        <TabsContent value="rules" className="space-y-6">
          <div className="grid gap-6">
            <CardMovementRulesManager
              pipelineId={pipelineId}
              columns={columns}
              customFields={customFields}
              onUpdate={handlePipelineUpdate}
            />
            <div className="grid gap-6 md:grid-cols-2">
              <InactivityRulesManager
                pipelineId={pipelineId}
                onUpdate={handlePipelineUpdate}
              />
              <MovementRulesManager
                pipelineId={pipelineId}
                onUpdate={handlePipelineUpdate}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Integrações
              </CardTitle>
              <CardDescription>
                Conecte sua pipeline com outras ferramentas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-blue-500" />
                      Chatwoot
                    </CardTitle>
                    <CardDescription>
                      Sincronize conversas do Chatwoot com sua pipeline
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Chatwoot</p>
                          <p className="text-sm text-muted-foreground">Sistema de atendimento</p>
                        </div>
                        <IntegrationStatusBadge 
                          status={hasChatwootIntegration ? "active" : "not-configured"} 
                          size="sm" 
                        />
                      </div>
                      <ChatwootSettings pipelineId={pipelineId} />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-green-500" />
                      WhatsApp (Evolution)
                    </CardTitle>
                    <CardDescription>
                      Conecte seu WhatsApp via Evolution API
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">WhatsApp (Evolution)</p>
                          <IntegrationStatusBadge 
                            status={hasEvolutionIntegration ? "active" : "not-configured"} 
                            size="sm" 
                          />
                        </div>
                      </div>
                      <EvolutionSettings pipelineId={pipelineId} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurações Avançadas
              </CardTitle>
              <CardDescription>
                Ajustes finos do comportamento da IA e sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Comportamento Padrão</CardTitle>
                    <CardDescription>
                      Configure como a IA deve se comportar por padrão
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Em desenvolvimento: Templates de comportamento pré-configurados
                    </p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}