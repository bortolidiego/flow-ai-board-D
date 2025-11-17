import { useState, useEffect } from 'react';
import { useKanbanData } from '@/hooks/useKanbanData';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useUserRole } from '@/hooks/useUserRole';
import { AIPromptBuilder } from '@/components/AIPromptBuilder';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Settings, Target, Clock } from 'lucide-react';
import { CustomFieldsManager } from '@/components/CustomFieldsManager';
import { FunnelTypesManager } from '@/components/FunnelTypesManager';
import { FunnelLifecycleManager } from '@/components/FunnelLifecycleManager';
import { MovementRulesManager } from '@/components/MovementRulesManager';
import { InactivityRulesManager } from '@/components/InactivityRulesManager';
import { CardMovementRulesManager } from '@/components/CardMovementRulesManager';

export default function Brain() {
  const { workspace } = useWorkspace();
  const { isAdmin } = useUserRole();
  
  // Corrigido Erros 6, 7: useKanbanData não aceita argumento e não retorna fetchPipeline
  const { pipeline, pipelineConfig, loading, refreshCards } = useKanbanData(); 
  
  const [customFields, setCustomFields] = useState<any[]>([]);

  useEffect(() => {
    if (pipelineConfig?.customFields) {
      setCustomFields(pipelineConfig.customFields);
    }
  }, [pipelineConfig]);

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold">Acesso Negado</h1>
        <p className="text-muted-foreground">Apenas administradores podem acessar esta página.</p>
      </div>
    );
  }

  if (loading || !workspace || !pipeline) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>Configuração da Inteligência</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-32">
              <Sparkles className="w-8 h-8 animate-pulse text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-2">
        <Sparkles className="w-6 h-6 text-primary" />
        Brain - Configuração da IA
      </h1>
      <p className="text-muted-foreground">
        Configure como a Inteligência Artificial deve analisar e interagir com seus cards.
      </p>

      <Tabs defaultValue="ai-prompt">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="ai-prompt" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Prompt
          </TabsTrigger>
          <TabsTrigger value="funnels" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Funis
          </TabsTrigger>
          <TabsTrigger value="lifecycle" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Ciclo de Vida
          </TabsTrigger>
          <TabsTrigger value="fields" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Campos
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Regras
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai-prompt" className="mt-6">
          <AIPromptBuilder
            pipelineId={pipeline.id}
            customFields={customFields}
            onUpdate={refreshCards}
          />
        </TabsContent>

        <TabsContent value="funnels" className="mt-6 space-y-6">
          <FunnelTypesManager
            pipelineId={pipeline.id}
            onUpdate={refreshCards}
          />
        </TabsContent>

        <TabsContent value="lifecycle" className="mt-6 space-y-6">
          <FunnelLifecycleManager
            pipelineId={pipeline.id}
            onUpdate={refreshCards}
          />
        </TabsContent>

        <TabsContent value="fields" className="mt-6 space-y-6">
          <CustomFieldsManager
            pipelineId={pipeline.id}
            onUpdate={refreshCards}
          />
        </TabsContent>

        <TabsContent value="rules" className="mt-6 space-y-6">
          <CardMovementRulesManager
            pipelineId={pipeline.id}
            columns={pipeline.columns}
            customFields={customFields}
            onUpdate={refreshCards}
          />
          <MovementRulesManager
            pipelineId={pipeline.id}
            onUpdate={refreshCards}
          />
          <InactivityRulesManager
            pipelineId={pipeline.id}
            onUpdate={refreshCards}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}