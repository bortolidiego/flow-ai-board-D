import { useState, useEffect } from 'react';
import { useKanbanData } from '@/hooks/useKanbanData';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useUserRole } from '@/hooks/useUserRole';
import { BehaviorTemplateSelector } from '@/components/BehaviorTemplateSelector';
import { BehaviorTemplatePreview } from '@/components/BehaviorTemplatePreview';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BehaviorTemplate {
  id: string;
  name: string;
  business_type: string;
  description: string;
  config: any;
}

export default function BrainNew() {
  const { workspace } = useWorkspace();
  const { isAdmin } = useUserRole();
  
  // Corrigido Erro 8: useKanbanData não aceita argumento
  const { pipeline, loading: pipelineLoading, refreshCards } = useKanbanData(); 
  
  const [selectedTemplate, setSelectedTemplate] = useState<BehaviorTemplate | null>(null);
  const [applying, setApplying] = useState(false);
  const { toast } = useToast();

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold">Acesso Negado</h1>
        <p className="text-muted-foreground">Apenas administradores podem acessar esta página.</p>
      </div>
    );
  }

  const handleApplyTemplate = async () => {
    if (!selectedTemplate || !workspace || !pipeline) return;

    setApplying(true);
    try {
      // 1. Aplicar o template (Edge Function)
      const { data, error } = await supabase.functions.invoke('apply-behavior-template', {
        body: {
          workspaceId: workspace.id,
          pipelineId: pipeline.id,
          templateId: selectedTemplate.id,
          templateConfig: selectedTemplate.config,
        },
      });

      if (error) throw error;

      toast({
        title: "Template Aplicado!",
        description: "As configurações da pipeline foram atualizadas com sucesso.",
      });

      // 2. Forçar recarregamento dos dados do Kanban
      refreshCards();

    } catch (error: any) {
      console.error('Error applying template:', error);
      toast({
        title: "Erro ao aplicar template",
        description: error.message || "Ocorreu um erro desconhecido.",
        variant: "destructive",
      });
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-2">
        <Sparkles className="w-6 h-6 text-primary" />
        Novo Brain - Seleção de Template
      </h1>
      <p className="text-muted-foreground">
        Selecione um template de comportamento para configurar rapidamente sua pipeline.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>1. Selecione o Template</CardTitle>
        </CardHeader>
        <CardContent>
          <BehaviorTemplateSelector
            onSelect={setSelectedTemplate}
            selectedTemplateId={selectedTemplate?.id}
          />
        </CardContent>
      </Card>

      {selectedTemplate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-500" />
              2. Prévia e Aplicação: {selectedTemplate.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <BehaviorTemplatePreview template={selectedTemplate} />

            <Button
              onClick={handleApplyTemplate}
              disabled={applying || pipelineLoading}
              className="w-full gap-2"
            >
              {applying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Aplicando...
                </>
              ) : (
                'Aplicar Este Template'
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}