import { EvolutionSettings } from '@/components/EvolutionSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useWorkspace } from '@/hooks/useWorkspace';
import { Loader2 } from 'lucide-react';

export default function BrainPage() {
  const { workspace, loading: workspaceLoading } = useWorkspace();

  if (workspaceLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!workspace || !workspace.active_pipeline_id) { // Verificação explícita
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Nenhum Workspace ou Pipeline Ativo Encontrado</CardTitle>
            <CardDescription>
              Por favor, crie ou selecione um workspace e certifique-se de que ele tenha um pipeline ativo para acessar as configurações do Brain.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Adicionar um link ou botão para criar workspace/pipeline se necessário */}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Configurações do Brain</h1>
      <p className="text-muted-foreground">
        Gerencie as integrações e a inteligência artificial para o seu workspace.
      </p>

      <EvolutionSettings pipelineId={workspace.active_pipeline_id} />
    </div>
  );
}