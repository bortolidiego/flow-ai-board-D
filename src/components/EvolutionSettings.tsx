import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, ExternalLink, Play, Pause, Clock, Wifi, Settings } from 'lucide-react';
import { IntegrationStatusBadge } from '@/components/IntegrationStatusBadge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface EvolutionIntegration {
  id: string;
  pipeline_id: string;
  instance_name: string;
  instance_alias: string | null;
  webhook_url: string;
  api_url: string;
  api_key: string;
  phone_number: string | null;
  status: 'connected' | 'disconnected' | 'connecting';
  last_connection: string | null; // Adicionado aqui
  active: boolean;
  auto_create_cards: boolean;
  analyze_messages: boolean;
}

interface EvolutionSettingsProps {
  pipelineId: string;
}

export const EvolutionSettings = ({ pipelineId }: EvolutionSettingsProps) => {
  const [instanceName, setInstanceName] = useState('');
  const [instanceAlias, setInstanceAlias] = useState('');
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
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'connecting' | 'not-configured'>('not-configured');
  const [lastConnection, setLastConnection] = useState<string | null>(null);
  const { toast } = useToast();

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evolution-webhook`;

  useEffect(() => {
    loadIntegration();
  }, [pipelineId]);

  const loadIntegration = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('evolution_integrations')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const integrationData = data as EvolutionIntegration; // Cast para a interface
        setHasIntegration(true);
        setIntegrationId(integrationData.id);
        setInstanceName(integrationData.instance_name);
        setInstanceAlias(integrationData.instance_alias || '');
        setApiUrl(integrationData.api_url);
        setApiKey(integrationData.api_key);
        setPhoneNumber(integrationData.phone_number || '');
        setActive(integrationData.active ?? true);
        setAutoCreateCards(integrationData.auto_create_cards ?? true);
        setAnalyzeMessages(integrationData.analyze_messages ?? true);
        setStatus(integrationData.status || 'disconnected');
        setLastConnection(integrationData.last_connection);
      } else {
        setHasIntegration(false);
        resetForm();
      }
    } catch (error: any) {
      console.error('Error loading Evolution integration:', error);
      toast({
        title: 'Erro ao carregar integração',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setInstanceName('');
    setInstanceAlias('');
    setApiUrl('');
    setApiKey('');
    setPhoneNumber('');
    setActive(true);
    setAutoCreateCards(true);
    setAnalyzeMessages(true);
    setStatus('not-configured');
    setLastConnection(null);
  };

  const handleSave = async () => {
    if (!instanceName || !apiUrl || !apiKey) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha Nome da Instância, URL da API e Chave da API',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const integrationData: Omit<EvolutionIntegration, 'id' | 'created_at' | 'updated_at'> = {
        pipeline_id: pipelineId,
        instance_name: instanceName,
        instance_alias: instanceAlias || null,
        webhook_url: webhookUrl, // Webhook URL é sempre a mesma para todas as instâncias
        api_url: apiUrl,
        api_key: apiKey,
        phone_number: phoneNumber || null,
        active: active,
        auto_create_cards: autoCreateCards,
        analyze_messages: analyzeMessages,
        status: status === 'not-configured' ? 'disconnected' : status, // Não sobrescrever status se já estiver conectado
        last_connection: lastConnection, // Incluir last_connection
      };

      if (hasIntegration) {
        const { error } = await supabase
          .from('evolution_integrations')
          .update(integrationData)
          .eq('id', integrationId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('evolution_integrations')
          .insert(integrationData);
        if (error) throw error;
      }

      toast({
        title: 'Integração salva',
        description: 'As configurações da Evolution API foram salvas.',
      });
      await loadIntegration();
    } catch (error: any) {
      console.error('Error saving Evolution integration:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast({
      title: 'URL copiada',
      description: 'Cole esta URL nas configurações de webhook da sua instância Evolution',
    });
  };

  const handleToggleActive = async () => {
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
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setShowPauseDialog(false);
    }
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

  const getStatusBadgeType = () => {
    if (!hasIntegration) return 'not-configured';
    if (!active) return 'paused';
    if (status === 'connected') return 'active';
    return 'not-configured'; // 'disconnected' ou 'connecting'
  };

  return (
    <div className="space-y-6">
      {/* Status Card */}
      {hasIntegration && (
        <Card className={`border-2 ${active && status === 'connected' ? 'border-primary/30 bg-primary/5' : 'border-orange-500/30 bg-orange-500/5'}`}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-3">
                  <IntegrationStatusBadge status={getStatusBadgeType()} showPulse={active && status === 'connected'} size="lg" />
                  {status === 'connected' && <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Conectado</Badge>}
                  {status === 'disconnected' && <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">Desconectado</Badge>}
                  {status === 'connecting' && <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">Conectando...</Badge>}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Última conexão: {formatLastConnection()}</span>
                </div>
              </div>
              <Button
                onClick={handleToggleActive}
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
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configuração da Evolution API
          </CardTitle>
          <CardDescription>
            Configure os dados de conexão com a sua instância da Evolution API
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
                  <Input value={webhookUrl} readOnly className="font-mono text-xs" />
                  <Button variant="outline" size="icon" onClick={copyWebhookUrl}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Cole esta URL nas configurações de webhook da sua instância Evolution.
                  Certifique-se de que os eventos `messages.upsert`, `connection.update` e `messages.update` estão habilitados.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="instanceName">Nome da Instância *</Label>
              <Input
                id="instanceName"
                placeholder="Ex: minha-instancia-01"
                value={instanceName}
                onChange={e => setInstanceName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                O nome da sua instância na Evolution API.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instanceAlias">Apelido da Instância (opcional)</Label>
              <Input
                id="instanceAlias"
                placeholder="Ex: WhatsApp da Loja"
                value={instanceAlias}
                onChange={e => setInstanceAlias(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Um nome amigável para identificar esta instância.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiUrl">URL da API *</Label>
              <Input
                id="apiUrl"
                placeholder="Ex: https://api.evolution.com/instance/minha-instancia-01"
                value={apiUrl}
                onChange={e => setApiUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                A URL base da sua instância da Evolution API.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">Chave da API *</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Sua chave da API da Evolution"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                A chave de acesso para autenticar suas requisições na Evolution API.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Número de Telefone (opcional)</Label>
              <Input
                id="phoneNumber"
                placeholder="Ex: 5511999998888"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                O número de telefone associado a esta instância (com código do país e DDD).
              </p>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="autoCreateCards">Criar Cards Automaticamente</Label>
                  <p className="text-sm text-muted-foreground">
                    Novas conversas na Evolution API criarão cards automaticamente.
                  </p>
                </div>
                <Switch
                  id="autoCreateCards"
                  checked={autoCreateCards}
                  onCheckedChange={setAutoCreateCards}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="analyzeMessages">Analisar Mensagens com IA</Label>
                  <p className="text-sm text-muted-foreground">
                    As mensagens recebidas serão enviadas para análise da IA.
                  </p>
                </div>
                <Switch
                  id="analyzeMessages"
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
                  Ao pausar a sincronização, novas mensagens da Evolution API não serão processadas até que você retome a integração.
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