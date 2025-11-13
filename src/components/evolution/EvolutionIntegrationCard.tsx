import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ExternalLink, Trash2, CheckCircle, XCircle, AlertCircle, Phone } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export interface EvolutionIntegration {
  id: string;
  pipeline_id: string;
  instance_name: string;
  instance_alias?: string;
  webhook_url: string;
  api_url: string;
  api_key: string;
  phone_number: string;
  status: 'connected' | 'disconnected' | 'error' | 'connecting';
  last_connection?: string;
  events_enabled: string[];
  auto_create_cards: boolean;
  analyze_messages: boolean;
  created_at: string;
  updated_at: string;
}

interface EvolutionIntegrationCardProps {
  integration: EvolutionIntegration;
  onTestConnection: (integration: EvolutionIntegration) => void;
  onDelete: (integrationId: string) => void;
  testing: boolean;
}

export function EvolutionIntegrationCard({
  integration,
  onTestConnection,
  onDelete,
  testing
}: EvolutionIntegrationCardProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'disconnected':
        return <XCircle className="w-4 h-4 text-gray-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'connecting':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Conectado';
      case 'disconnected':
        return 'Desconectado';
      case 'error':
        return 'Erro';
      case 'connecting':
        return 'Conectando';
      default:
        return 'Desconhecido';
    }
  };

  return (
    <Card className="border-l-4 border-l-primary">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">
                {integration.instance_alias}
              </h3>
              <Badge variant="outline" className="text-xs">
                {integration.instance_name}
              </Badge>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Phone className="w-4 h-4" />
                {integration.phone_number || 'Não informado'}
              </div>
              <div className="flex items-center gap-1">
                {getStatusIcon(integration.status)}
                {getStatusLabel(integration.status)}
              </div>
              {integration.last_connection && (
                <div>
                  Última conexão: {new Date(integration.last_connection).toLocaleDateString('pt-BR')}
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <Badge variant="secondary" className={integration.auto_create_cards ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                Cards: {integration.auto_create_cards ? 'Auto' : 'Manual'}
              </Badge>
              <Badge variant="secondary" className={integration.analyze_messages ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}>
                Análise: {integration.analyze_messages ? 'Ativa' : 'Inativa'}
              </Badge>
              <Badge variant="outline">
                {integration.events_enabled?.length || 0} eventos
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onTestConnection(integration)}
              disabled={testing}
            >
              {testing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4" />
              )}
              Testar
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remover integração?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação irá remover a instância "{integration.instance_alias}" e cancelar o webhook na Evolution API.
                    As mensagens recebidas deixarão de criar cards automaticamente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(integration.id)}>
                    Remover
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}