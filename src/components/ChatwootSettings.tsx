import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, ExternalLink, Play, Pause, Clock } from 'lucide-react';
import { IntegrationStatusBadge } from '@/components/IntegrationStatusBadge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
interface ChatwootSettingsProps {
  pipelineId: string;
}
export const ChatwootSettings = ({
  pipelineId
}: ChatwootSettingsProps) => {
  const [chatwootUrl, setChatwootUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [accountId, setAccountId] = useState('');
  const [inboxId, setInboxId] = useState('');
  const [active, setActive] = useState(true);
  const [hasIntegration, setHasIntegration] = useState(false);
  const [integrationId, setIntegrationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const { toast } = useToast();
  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chatwoot-webhook`;
  useEffect(() => {
    loadIntegration();
  }, [pipelineId]);
  const loadIntegration = async () => {
    const { data } = await supabase
      .from('chatwoot_integrations')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .maybeSingle();
    
    if (data) {
      setHasIntegration(true);
      setIntegrationId(data.id);
      setChatwootUrl(data.chatwoot_url);
      setApiKey(data.chatwoot_api_key);
      setAccountId(data.account_id);
      setInboxId(data.inbox_id || '');
      setActive(data.active);
      setLastSync(data.updated_at);
    }
  };
  const handleSave = async () => {
    if (!chatwootUrl || !apiKey || !accountId) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha URL, API Key e Account ID',
        variant: 'destructive'
      });
      return;
    }
    setLoading(true);
    try {
      if (hasIntegration) {
        const {
          error
        } = await supabase.from('chatwoot_integrations').update({
          chatwoot_url: chatwootUrl,
          chatwoot_api_key: apiKey,
          account_id: accountId,
          inbox_id: inboxId || null,
          active
        }).eq('id', integrationId);
        if (error) throw error;
      } else {
        const {
          error
        } = await supabase.from('chatwoot_integrations').insert({
          pipeline_id: pipelineId,
          chatwoot_url: chatwootUrl,
          chatwoot_api_key: apiKey,
          account_id: accountId,
          inbox_id: inboxId || null,
          active
        });
        if (error) throw error;
      }
      toast({
        title: 'Integração salva',
        description: 'Configure o webhook no Chatwoot com a URL abaixo'
      });
      await loadIntegration();
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast({
      title: 'URL copiada',
      description: 'Cole esta URL nas configurações de webhook do Chatwoot'
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
        .from('chatwoot_integrations')
        .update({ active: newActive })
        .eq('id', integrationId);

      if (error) throw error;

      setActive(newActive);
      toast({
        title: newActive ? 'Sincronia retomada' : 'Sincronia pausada',
        description: newActive 
          ? 'A integração está ativa e sincronizando conversas'
          : 'Novas conversas não serão sincronizadas até retomar'
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
    return active ? 'active' : 'paused';
  };

  const formatLastSync = () => {
    if (!lastSync) return 'Nunca sincronizado';
    const date = new Date(lastSync);
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
      {/* Status Card */}
      {hasIntegration && (
        <Card className={`border-2 ${active ? 'border-primary/30 bg-primary/5' : 'border-orange-500/30 bg-orange-500/5'}`}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-3">
                  <IntegrationStatusBadge status={getStatus()} showPulse={active} size="lg" />
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Última atualização: {formatLastSync()}</span>
                </div>
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
          <CardTitle>Configuração da Integração</CardTitle>
          <CardDescription>
            Configure os dados de conexão com o Chatwoot
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-sm">Configuração do Webhook no Chatwoot</CardTitle>
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
                  Cole esta URL em Settings → Webhooks no Chatwoot
                </p>
              </div>

              <div className="space-y-2">
                <Label className="font-semibold">2. Eventos do Webhook</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Selecione TODOS os seguintes eventos no Chatwoot:
                </p>
                <ul className="text-xs space-y-1 text-muted-foreground ml-4">
                  <li>✓ <span className="font-medium">Conversation Created</span> - Cria novos cards</li>
                  <li>✓ <span className="font-medium">Message Created</span> - Adiciona mensagens aos cards</li>
                  <li>✓ <span className="font-medium">Message Updated</span> - Atualiza mensagens editadas</li>
                  <li>✓ <span className="font-medium">Conversation Updated</span> - Atualiza metadados (atendente, status)</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="chatwootUrl">URL do Chatwoot *</Label>
              <Input 
                id="chatwootUrl" 
                placeholder="https://app.chatwoot.com" 
                value={chatwootUrl} 
                onChange={e => setChatwootUrl(e.target.value)} 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key *</Label>
              <Input 
                id="apiKey" 
                type="password" 
                placeholder="Sua API key do Chatwoot" 
                value={apiKey} 
                onChange={e => setApiKey(e.target.value)} 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountId">Account ID *</Label>
              <Input 
                id="accountId" 
                type="number" 
                placeholder="Ex: 1" 
                value={accountId} 
                onChange={e => setAccountId(e.target.value)} 
              />
              <p className="text-xs text-muted-foreground">
                Encontre em Settings → Account Settings no Chatwoot
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inboxId">Inbox IDs (opcional)</Label>
              <Input 
                id="inboxId" 
                placeholder="Deixe vazio para todas, ou ex: 123 ou 123,456,789" 
                value={inboxId} 
                onChange={e => setInboxId(e.target.value)} 
              />
              <div className="bg-muted/50 border border-border/50 rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold">💡 Como configurar:</p>
                
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="font-mono bg-background px-2 py-0.5 rounded min-w-[100px]">vazio</span>
                    <span className="text-muted-foreground">→ Sincroniza TODAS as inboxes</span>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <span className="font-mono bg-background px-2 py-0.5 rounded min-w-[100px]">123</span>
                    <span className="text-muted-foreground">→ Sincroniza apenas a inbox 123</span>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <span className="font-mono bg-background px-2 py-0.5 rounded min-w-[100px]">123,456,789</span>
                    <span className="text-muted-foreground">→ Sincroniza as inboxes 123, 456 e 789</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/50 mt-3">
                  <p className="text-xs font-semibold mb-1">🔍 Onde encontrar o ID:</p>
                  <p className="text-xs text-muted-foreground">
                    No Chatwoot: <span className="font-medium">Settings → Inboxes → Clique na inbox</span><br />
                    O ID aparece na URL: <span className="font-mono bg-background px-1 rounded">app.chatwoot.com/.../inboxes/<strong className="text-primary">123</strong>/settings</span>
                  </p>
                </div>
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
            <AlertDialogTitle>Pausar sincronia com Chatwoot?</AlertDialogTitle>
            <AlertDialogDescription>
              Ao pausar a sincronização, novas conversas do Chatwoot não serão criadas como cards até que você retome a integração.
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