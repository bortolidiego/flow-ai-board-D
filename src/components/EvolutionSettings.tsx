import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Play, Pause, Clock, MessageSquare, Zap, AlertCircle } from 'lucide-react';
import { IntegrationStatusBadge } from '@/components/IntegrationStatusBadge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface EvolutionSettingsProps {
  pipelineId: string;
}

interface EvolutionIntegration {
  id: string;
  pipeline_id: string;
  instance_name: string;
  instance_alias: string | null;
  webhook_url: string;
  api_url: string;
  api_key: string;
  phone_number: string | null;
  status: string;
  last_connection: string | null;
  events_enabled: string[] | null;
  auto_create_cards: boolean;
  analyze_messages: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export const EvolutionSettings = ({
  pipelineId
}: EvolutionSettingsProps) => {
  const [instanceName, setInstanceName] = useState('');
  const [instanceAlias, setInstanceAlias] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [active, setActive] = useState(true);
  const [autoCreateCards, setAutoCreateCards] = useState(true);
  const [analyzeMessages, setAnalyzeMessages] = useState(true);
  const [hasIntegration, setHasIntegration] = useState(false);
  const [integrationId, setIntegrationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [lastConnection, setLastConnection] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const evolutionWebhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evolution-webhook`;

  useEffect(() => {
    loadIntegration();
  }, [pipelineId]);

  const loadIntegration = async () => {
    try {
      console.log('Loading integration for pipeline:', pipelineId);
      
      const { data, error } = await supabase
        .from('evolution_integrations')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .maybeSingle();

      if (error) {
        console.error('Error loading integration:', error);
        setError(`Erro ao carregar integração: ${error.message}`);
        return;
      }

      console.log('Integration data loaded:', data);

      if (data) {
        const integration = data as EvolutionIntegration;
        setHasIntegration(true);
        setIntegrationId(integration.id);
        setInstanceName(integration.instance_name);
        setInstanceAlias(integration.instance_alias || '');
        setWebhookUrl(integration.webhook_url);
        setApiUrl(integration.api_url);
        setApiKey(integration.api_key);
        setPhoneNumber(integration.phone_number || '');
        setActive(integration.active);
        setAutoCreateCards(integration.auto_create_cards ?? true);
        setAnalyzeMessages(integration.analyze_messages ?? true);
        setLastConnection(integration.last_connection || null);
        setStatus(integration.status || 'disconnected');
        setError(null);
      } else {
        setHasIntegration(false);
        setError(null);
      }
    } catch (error) {
      console.error('Error loading integration:', error);
      setError(`Erro ao carregar integração: ${error}`);
    }
  };

  const handleSave = async () => {
    if (!instanceName || !webhookUrl || !apiUrl || !apiKey) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha nome da instância, webhook URL, API URL e API Key',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log('Saving integration data:', {
        pipeline_id: pipelineId,
        instance_name: instanceName,
        instance_alias: instanceAlias || null,
        webhook_url: webhookUrl,
        api_url: apiUrl,
        api_key: apiKey,
        phone_number: phoneNumber || null,
        active,
        auto_create_cards: autoCreateCards,
        analyze_messages: analyzeMessages,
        status: status || 'disconnected'
      });

      const integrationData = {
        pipeline_id: pipelineId,
        instance_name: instanceName,
        instance_alias: instanceAlias || null,
        webhook_url: webhookUrl,
        api_url: apiUrl,
        api_key: apiKey,
        phone_number: phoneNumber || null,
        active,
        auto_create_cards: autoCreateCards,
        analyze_messages: analyzeMessages,
        status: status || 'disconnected'
      };

      if (hasIntegration) {
        console.log('Updating existing integration:', integrationId);
        const { error } = await supabase
          .from('evolution_integrations')
          .update(integrationData)
          .eq('id', integrationId);

        if (error) {
          console.error('Error updating integration:', error);
          throw error;
        }
      } else {
        console.log('Creating new integration');
        const { error } = await supabase
          .from('evolution_integrations')
          .insert(integrationData);

        if (error) {
          console.error('Error creating integration:', error);
          throw error;
        }
      }

      toast({
        title: 'Integração salva',
        description: 'Configure o webhook na Evolution API com a URL abaixo'
      });

      await loadIntegration();
    } catch (error: any) {
      console.error('Error saving integration:', error);
      const errorMessage = error.message || 'Erro desconhecido ao salvar integração';
      setError(errorMessage);
      toast({
        title: 'Erro ao salvar',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(evolutionWebhookUrl);
    toast({
      title: 'URL copiada',
      description: 'Cole esta URL nas configurações de webhook da Evolution API'
    });
  };

  const handleToggleSync = async () => {
    if (!hasIntegration) return;

    if (active) {
      setShowPauseDialog(true);
    } else {
      await toggleActive(true);
    }
  };

  const toggleActive = async (newActive: boolean) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('evolution_integrations')
        .update({ active: newActive })
        .eq('id', integrationId);

      if (error) throw error;

      setActive(newActive);
      toast({
        title: newActive ? 'Sincronia retomada' : 'Sincronia pausada',
        description: newActive
          ? 'A integração está ativa e sincronizando mensagens'
          : 'Novas mensagens não serão sincronizadas até retomar'
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao alterar status',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      setShowPauseDialog(false);
    }
  };

  const getStatus = () => {
    if (!hasIntegration) return 'not-configured';
    if (status === 'connected') return 'active';
    return active ? 'active' : 'paused';
  };

  const formatLastConnection = () => {
    if (!lastConnection) return 'Nunca conectado';
    const date = new Date(lastConnection);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `há ${days} dia${days > 1 ? 's' : ''}`;
    if (hours > 0) return `há ${hours} hora${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `há ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    return 'agora mesmo';
  };

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Status Card */}
      {hasIntegration && (
        <Card className={`border-2 ${active ? 'border-primary/30 bg-primary/5' : 'border-orange-500/30 bg-orange-500/5'}`}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-3">
                  <IntegrationStatusBadge status={getStatus()} showPulse={active} size="lg" />
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-green-600" />
                    <span className="font-medium">{instanceName}</span>
                    {instanceAlias && <span className="text-muted-foreground">({instanceAlias})</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Última conexão: {formatLastConnection()}</span>
                </div>
                {phoneNumber && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Zap className="w-4 h-4" />
                    <span>Número: {phoneNumber}</span>
                  </div>
                )}
              </div>
              <Button
                onClick={handleToggleSync}
                disabled={loading}
                size="lg"
                variant={active ? 'outline' : 'default'}
                className={`gap-2 ${active ? 'border-orange-500/50 text-orange-600 hover:bg-orange-500/10 dark:text-orange-400' : ''}`}
              >
                {active ? (
                  <>
                    <Pause className="w-5 h-5" />
                    Pausar Sincronia
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Retomar Sincronia
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>Configuração da Evolution API</CardTitle>
          <CardDescription>
            Configure a integração com WhatsApp via Evolution API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-sm">Configuração do Webhook na Evolution API</CardTitle>
              <CardDescription>
                Siga os passos abaixo para configurar a integração
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="font-semibold">1. URL do Webhook</Label>
                <div className="flex gap-2">
                  <Input value={evolutionWebhookUrl} readOnly className="font-mono text-xs" />
                  <Button variant="outline" size="icon" onClick={copyWebhookUrl}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Configure esta URL no webhook da sua instância Evolution API
                </p>
              </div>

              <div className="space-y-2">
                <Label className="font-semibold">2. Eventos do Webhook</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Configure os seguintes eventos na Evolution API:
                </p>
                <ul className="text-xs space-y-1 text-muted-foreground ml-4">
                  <li>✓ <span className="font-medium">messages.upsert</span> - Recebe novas mensagens</li>
                  <li>✓ <span className="font-medium">connection.update</span> - Monitora status da conexão</li>
                  <li>✓ <span className="font-medium">messages.update</span> - Atualiza mensagens editadas</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="instanceName">Nome da Instância *</Label>
              <Input
                id="instanceName"
                placeholder="Ex: whatsapp-main"
                value={instanceName}
                onChange={e => setInstanceName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Nome único da instância na Evolution API
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instanceAlias">Apelido da Instância (opcional)</Label>
              <Input
                id="instanceAlias"
                placeholder="Ex: WhatsApp Principal"
                value={instanceAlias}
                onChange={e => setInstanceAlias(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhookUrl">Webhook URL *</Label>
              <Input
                id="webhookUrl"
                placeholder="URL do webhook da Evolution API"
                value={webhookUrl}
                onChange={e => setWebhookUrl(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiUrl">API URL *</Label>
              <Input
                id="apiUrl"
                placeholder="https://api.evolution.com"
                value={apiUrl}
                onChange={e => setApiUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                URL base da API da Evolution
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key *</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Sua chave API da Evolution"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Número do WhatsApp (opcional)</Label>
              <Input
                id="phoneNumber"
                placeholder="5511999999999"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Número conectado à instância (formato internacional sem +)
              </p>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Criar cards automaticamente</Label>
                  <p className="text-xs text-muted-foreground">
                    Novos contatos criam cards automaticamente
                  </p>
                </div>
                <Switch
                  checked={autoCreateCards}
                  onCheckedChange={setAutoCreateCards}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Analisar mensagens com IA</Label>
                  <p className="text-xs text-muted-foreground">
                    IA analisa cada mensagem recebida
                  </p>
                </div>
                <Switch
                  checked={analyzeMessages}
                  onCheckedChange={setAnalyzeMessages}
                />
              </div>
            </div>
          </div>

          <Button onClick={handleSave} disabled={loading} className="w-full gap-2">
            {loading ? 'Salvando...' : hasIntegration ? 'Atualizar Configurações' : 'Criar Integração'}
          </Button>
        </CardContent>
      </Card>

      {/* Pause Confirmation Dialog */}
      <AlertDialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pausar sincronia com Evolution API?</AlertDialogTitle>
            <AlertDialogDescription>
              Ao pausar a sincronização, novas mensagens do WhatsApp não serão processadas até que você retome a integração.
              As conversas existentes permanecerão intactas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => toggleActive(false)}>
              Pausar Sincronia
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};