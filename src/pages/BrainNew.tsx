import { useState } from 'react';
import { Brain as BrainIcon, Sparkles, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BehaviorTemplateSelector } from '@/components/BehaviorTemplateSelector';
import { BehaviorTemplatePreview } from '@/components/BehaviorTemplatePreview';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useKanbanData } from '@/hooks/useKanbanData';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function BrainNew() {
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [step, setStep] = useState<'select' | 'preview' | 'applying'>('select');
  const [applying, setApplying] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { workspace, loading: workspaceLoading } = useWorkspace();
  const { pipeline, loading: pipelineLoading } = useKanbanData(workspace?.id);

  const handleSelectTemplate = (template: any) => {
    setSelectedTemplate(template);
    setStep('preview');
  };

  const handleApplyTemplate = async () => {
    if (!pipeline || !selectedTemplate) return;

    setApplying(true);
    try {
      const { error } = await supabase.functions.invoke('apply-behavior-template', {
        body: {
          template_id: selectedTemplate.id,
          pipeline_id: pipeline.id,
        },
      });

      if (error) throw error;

      toast({
        title: 'Template aplicado com sucesso!',
        description: 'Seu pipeline foi configurado automaticamente.',
      });

      navigate('/brain');
    } catch (error: any) {
      console.error('Error applying template:', error);
      toast({
        title: 'Erro ao aplicar template',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setApplying(false);
    }
  };

  const handleBack = () => {
    if (step === 'preview') {
      setStep('select');
    }
  };

  if (workspaceLoading || pipelineLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!pipeline) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Nenhum pipeline encontrado. Contate o administrador.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
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
                Aplicar Template
              </h1>
              <p className="text-sm text-muted-foreground">
                Escolha um template para configurar seu pipeline
              </p>
            </div>
          </div>
          {step !== 'select' && (
            <Button onClick={handleBack} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className={step === 'select' ? 'text-primary font-semibold' : ''}>1. Escolher Template</span>
            <span className={step === 'preview' ? 'text-primary font-semibold' : ''}>2. Visualizar e Aplicar</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`h-2 flex-1 rounded-full transition-all ${step === 'select' ? 'bg-primary' : 'bg-primary/30'}`} />
            <div className={`h-2 flex-1 rounded-full transition-all ${step === 'preview' ? 'bg-primary' : 'bg-primary/30'}`} />
          </div>
        </div>
      </div>

      {step === 'select' && (
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold mb-4">
                Escolha um template de comportamento
              </h2>
              <p className="text-muted-foreground mb-6">
                Cada template inclui etapas, campos personalizados, funis e configuração de IA específicos para seu tipo de negócio.
              </p>
              <BehaviorTemplateSelector
                onSelect={handleSelectTemplate}
                selectedTemplateId={selectedTemplate?.id}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {step === 'preview' && selectedTemplate && (
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold">
                    Preview: {selectedTemplate.name}
                  </h2>
                  <p className="text-muted-foreground">
                    {selectedTemplate.description}
                  </p>
                </div>
                <Button onClick={handleApplyTemplate} disabled={applying}>
                  {applying ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Aplicando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Aplicar Template
                    </>
                  )}
                </Button>
              </div>
              <BehaviorTemplatePreview template={selectedTemplate} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
