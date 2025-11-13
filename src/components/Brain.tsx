"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Brain as BrainIcon, Zap, Settings, Bot, Target, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AIPromptBuilder } from '@/components/AIPromptBuilder';
import { FunnelTypesManager } from '@/components/FunnelTypesManager';
import { CustomFieldsManager } from '@/components/CustomFieldsManager';
import { InactivityRulesManager } from '@/components/InactivityRulesManager';
import { MovementRulesManager } from '@/components/MovementRulesManager';
import { EvolutionSettings } from '@/components/EvolutionSettings';
import { ChatwootSettings } from '@/components/ChatwootSettings';

interface Pipeline {
  id: string;
  name?: string;
  workspace_id: string;
  created_at: string;
}

export default function Brain() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPipelines();
  }, []);

  const loadPipelines = async () => {
    try {
      const { data, error } = await supabase
        .from('pipelines')
        .select('id, workspace_id, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transformar dados para incluir name baseado em outros campos
      const pipelinesWithName = (data || []).map((pipeline, index) => ({
        ...pipeline,
        name: `Pipeline ${index + 1}`
      }));

      setPipelines(pipelinesWithName);
      if (data && data.length > 0 && !selectedPipeline) {
        setSelectedPipeline(data[0].id);
      }
    } catch (error) {
      console.error('Error loading pipelines:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePipelineChange = (pipelineId: string) => {
    setSelectedPipeline(pipelineId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentPipeline = pipelines.find(p => p.id === selectedPipeline);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <BrainIcon className="w-8 h-8 text-primary" />
              Central de Inteligência
            </h1>
            <p className="text-muted-foreground mt-2">
              Configure a IA e automatize seu funil de vendas
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Bot className="w-3 h-3" />
              IA Ativada
            </Badge>
          </div>
        </div>

        {/* Pipeline Selector */}
        {pipelines.length > 1 && (
          <div className="flex gap-2">
            {pipelines.map(pipeline => (
              <Button
                key={pipeline.id}
                variant={selectedPipeline === pipeline.id ? "default" : "outline"}
                onClick={() => handlePipelineChange(pipeline.id)}
                className="text-sm"
              >
                {pipeline.name || `Pipeline ${pipeline.id.slice(-4)}`}
              </Button>
            ))}
          </div>
        )}
      </div>

      {currentPipeline ? (
        <Tabs defaultValue="ai" className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="ai">🤖 IA</TabsTrigger>
            <TabsTrigger value="funnels">🎯 Funis</TabsTrigger>
            <TabsTrigger value="fields">📝 Campos</TabsTrigger>
            <TabsTrigger value="rules">⚡ Regras</TabsTrigger>
            <TabsTrigger value="integrations">🔌 Integrações</TabsTrigger>
            <TabsTrigger value="advanced">🔧 Avançado</TabsTrigger>
          </TabsList>

          <TabsContent value="ai" className="space-y-6">
            <AIPromptBuilder
              pipelineId={selectedPipeline}
              customFields={[]} // Será carregado pelo componente
              onUpdate={() => loadPipelines()}
            />
          </TabsContent>

          <TabsContent value="funnels" className="space-y-6">
            <FunnelTypesManager
              pipelineId={selectedPipeline}
              onUpdate={() => loadPipelines()}
            />
          </TabsContent>

          <TabsContent value="fields" className="space-y-6">
            <CustomFieldsManager
              pipelineId={selectedPipeline}
              onUpdate={() => loadPipelines()}
            />
          </TabsContent>

          <TabsContent value="rules" className="space-y-6">
            <div className="grid gap-6">
              <MovementRulesManager
                pipelineId={selectedPipeline}
                onUpdate={() => loadPipelines()}
              />
              
              <InactivityRulesManager
                pipelineId={selectedPipeline}
                onUpdate={() => loadPipelines()}
              />
            </div>
          </TabsContent>

          <TabsContent value="integrations" className="space-y-6">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <Zap className="w-8 h-8 text-green-500" />
                      <div>
                        <h3 className="font-semibold">Evolution API</h3>
                        <p className="text-sm text-muted-foreground">
                          WhatsApp direto e confiável
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-8 h-8 text-blue-500" />
                      <div>
                        <h3 className="font-semibold">Chatwoot</h3>
                        <p className="text-sm text-muted-foreground">
                          Integração existente
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <Bot className="w-8 h-8 text-purple-500" />
                      <div>
                        <h3 className="font-semibold">Análise Automática</h3>
                        <p className="text-sm text-muted-foreground">
                          IA analisa todas as mensagens
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Tabs defaultValue="evolution" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="evolution">🚀 Evolution API</TabsTrigger>
                  <TabsTrigger value="chatwoot">💬 Chatwoot</TabsTrigger>
                </TabsList>

                <TabsContent value="evolution" className="space-y-6">
                  <div className="space-y-4">
                    <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Zap className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-green-800 dark:text-green-200">
                            Evolution API - Nova Geração
                          </h4>
                          <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                            Conecte suas instâncias WhatsApp já sincronizadas para receber mensagens automaticamente 
                            com maior confiabilidade e dados mais ricos.
                          </p>
                        </div>
                      </div>
                    </div>

                    <EvolutionSettings pipelineId={selectedPipeline} />
                  </div>
                </TabsContent>

                <TabsContent value="chatwoot" className="space-y-6">
                  <div className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-blue-800 dark:text-blue-200">
                            Chatwoot - Integração Estabelecida
                          </h4>
                          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                            Configure sua integração existente com Chatwoot para continuar receiving 
                            conversas automaticamente no kanban.
                          </p>
                        </div>
                      </div>
                    </div>

                    <ChatwootSettings pipelineId={selectedPipeline} />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configurações Avançadas</CardTitle>
                <CardDescription>
                  Opções avançadas para usuários experientes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-8">
                  <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Configurações avançadas em desenvolvimento
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma pipeline encontrada</h3>
            <p className="text-muted-foreground">
              Você precisa criar uma pipeline primeiro para configurar a IA
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}