import { Card, CardContent } from '@/components/ui/card';
import { Phone } from 'lucide-react';
import { EvolutionIntegrationCard, type EvolutionIntegration } from './EvolutionIntegrationCard';

interface EvolutionIntegrationListProps {
  integrations: EvolutionIntegration[];
  onTestConnection: (integration: EvolutionIntegration) => void;
  onDelete: (integrationId: string) => void;
  testing: string | null;
}

export function EvolutionIntegrationList({
  integrations,
  onTestConnection,
  onDelete,
  testing
}: EvolutionIntegrationListProps) {
  if (integrations.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <Phone className="w-12 h-12 text-muted-foreground mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">Nenhuma instância configurada</h3>
              <p className="text-muted-foreground">
                Adicione sua primeira instância Evolution para começar a receber mensagens
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {integrations.map((integration) => (
        <EvolutionIntegrationCard
          key={integration.id}
          integration={integration}
          onTestConnection={onTestConnection}
          onDelete={onDelete}
          testing={testing === integration.id}
        />
      ))}
    </div>
  );
}