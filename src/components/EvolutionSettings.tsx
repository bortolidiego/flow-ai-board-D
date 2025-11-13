"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, ExternalLink, CheckCircle, XCircle, AlertCircle, Zap, Phone, Settings } from 'lucide-react';
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

interface EvolutionIntegration {
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

interface EvolutionSettingsProps {
  pipelineId: string;
}

export function EvolutionSettings({ pipelineId }: EvolutionSettingsProps) {
  const [integrations, setIntegrations] = useState<EvolutionIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [newIntegration, setNewIntegration] = useState({
    instance_name: '',
    instance_alias: '',
    api_url: '',
    api_key: '',
    phone_number: '',
    auto_create_cards: true,
    analyze_messages: true,
  });

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evolution-webhook`;

  useEffect(() => {
    loadIntegrations();
  }, [pipelineId]);

  const loadIntegrations = async () => {
    try {
      const { data, error } = await supabase
        .from('evolution_integrations')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIntegrations(data || []);
    } catch (error: any) {
      console.error('Error loading integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async (integration: EvolutionIntegration) => {
    setTesting(integration.id);
    try {
      // Testar status da instância
      const response = await fetch(`${integration.api_url}/instance/connectionState/${integration.instance_name}`, {
        headers: {
          'apikey': integration.api_key,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Status HTTP: ${response.status}`);
      }

      const data = await response.json();
      
      // Atualizar status no banco
      const { error } = await supabase
        .from('evolution_integrations')
        .update({
          status: data.instance?.state === 'open' ? 'connected' : 'disconnected',
          last_connection: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', integration.id);

      if (error) throw error;

      loadIntegrations(); // Recarregar lista
    } catch (error: any) {
      console.error('Error testing connection:', error);
    } finally {
      setTesting(null);
    }
  };

  const saveIntegration = async () => {
    if (!newIntegration.instance_name || !newIntegration.api_url || !newIntegration.api_key) {
      return;
    }

    setSaving(true);
    try {
      // Configurar webhook na Evolution primeiro
      const webhookConfig = {
        url: `${webhookUrl}/${pipelineId}`,
        events: ['messages.upsert', 'connection.update', 'messages.update']
      };

      const webhookResponse = await fetch(`${newIntegration.api_url}/webhook/set/${newIntegration.instance_name}`, {
        method: 'POST',
        headers: {
          'apikey': newIntegration.api_key,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(webhookConfig)
      });

      if (!webhookResponse.ok) {
        const error = await webhookResponse.text();
        throw new Error(`Falha ao configurar webhook: ${error}`);
      }

      // Salvar no banco de dados
      const { data, error } = await supabase
        .from('evolution_integrations')
        .insert({
          pipeline_id: pipelineId,
          instance_name: newIntegration.instance_name,
          instance_alias: newIntegration.instance_alias || newIntegration.instance_name,
          api_url: newIntegration.api_url,
          api_key: newIntegration.api_key,
          phone_number: newIntegration.phone_number,
          webhook_url: webhookConfig.url,
          status: 'connecting',
          events_enabled: webhookConfig.events,
          auto_create_cards: newIntegration.auto_create_cards,
          analyze_messages: newIntegration.analyze_messages,
        })
        .select()
        .single();

      if (error) throw error;

      // Testar conexão imediatamente
      await testConnection(data);

      // Limpar formulário
      setNewIntegration({
        instance_name: '',
        instance_alias: '',
        api_url: '',
        api_key: '',
        phone_number: '',
        auto_create_cards: true,
        analyze_messages: true,
      });

      loadIntegrations();
    } catch (error: any) {
      console.error('Error saving integration:', error);
    } finally {
      setSaving(false);
    }
  };

  const deleteIntegration = async (integrationId: string) => {
    try {
      // Remover webhook da Evolution primeiro
      const integration = integrations.find(i => i.id === integrationId);
      if (integration) {
        await fetch(`${integration.api_url}/webhook/delete/${integration.instance_name}`, {
          method: 'DELETE',
          headers: {
            'apikey': integration.api_key
          }
        });
      }

      // Remover do banco
      const { error } = await supabase
        .from('evolution_integrations')
        .delete()
        .eq('id', integrationId);

      if (error) throw error;

      loadIntegrations();
    } catch (error: any) {
      console.error('Error deleting integration:', error);
    } finally {
      setDeleteConfirm(null);
    }
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <div>
              <CardTitle>Evolution API Integration</CardTitle>
              <CardDescription>
                Conecte suas instâncias WhatsApp já sincronizadas para receber mensagens automaticamente
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="instances" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="instances">Instâncias Ativas</TabsTrigger>
          <TabsTrigger value="add">Adicionar Instância</TabsTrigger>
        </TabsList>

        <TabsContent value="instances" className="space-y-4">
          {integrations.length === 0 ? (
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
          ) : (
            <div className="grid gap-4">
              {integrations.map((integration) => (
                <Card key={integration.id} className="border-l-4 border-l-primary">
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
                          onClick={() => testConnection(integration)}
                          disabled={testing === integration.id}
                        >
                          {testing === integration.id ? (
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
                              <AlertDialogAction onClick={() => deleteIntegration(integration.id)}>
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="add" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Adicionar Nova Instância
              </CardTitle>
              <CardDescription>
                Configure uma instância WhatsApp já sincronizada na sua Evolution API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="instance_name">Nome da Instância *</Label>
                  <Input
                    id="instance_name"
                    value={newIntegration.instance_name}
                    onChange={(e) => setNewIntegration({...newIntegration, instance_name: e.target.value})}
                    placeholder="minha-instancia-whatsapp"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instance_alias">Nome de Exibição</Label>
                  <Input
                    id="instance_alias"
                    value={newIntegration.instance_alias}
                    onChange={(e) => setNewIntegration({...newIntegration, instance_alias: e.target.value})}
                    placeholder="WhatsApp Principal"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="api_url">URL da Evolution API *</Label>
                  <Input
                    id="api_url"
                    value={newIntegration.api_url}
                    onChange={(e) => setNewIntegration({...newIntegration, api_url: e.target.value})}
                    placeholder="https://evolution-api.exemplo.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="api_key">API Key *</Label>
                  <Input
                    id="api_key"
                    type="password"
                    value={newIntegration.api_key}
                    onChange={(e) => setNewIntegration({...newIntegration, api_key: e.target.value})}
                    placeholder="Sua chave da Evolution API"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_number">Número de Telefone (opcional)</Label>
                <Input
                  id="phone_number"
                  value={newIntegration.phone_number}
                  onChange={(e) => setNewIntegration({...newIntegration, phone_number: e.target.value})}
                  placeholder="5511999999999"
                />
                <p className="text-xs text-muted-foreground">
                  Formato: código do país + DDD + número (ex: 5511999999999)
                </p>
              </div>

              <div className="border-t pt-4 space-y-4">
                <h4 className="font-medium">Configurações de Automação</h4>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Criar cards automaticamente</Label>
                    <p className="text-sm text-muted-foreground">
                      Nova mensagem = novo card no kanban
                    </p>
                  </div>
                  <Switch
                    checked={newIntegration.auto_create_cards}
                    onCheckedChange={(checked) => setNewIntegration({...newIntegration, auto_create_cards: checked})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Analisar mensagens com IA</Label>
                    <p className="text-sm text-muted-foreground">
                      Usar inteligência artificial para extrair dados
                    </p>
                  </div>
                  <Switch
                    checked={newIntegration.analyze_messages}
                    onCheckedChange={(checked) => setNewIntegration({...newIntegration, analyze_messages: checked})}
                  />
                </div>
              </div>

              <div className="bg-muted/50 border border-border/50 rounded-lg p-4 space-y-2">
                <h5 className="text-sm font-semibold flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Webhook Configuration
                </h5>
                <p className="text-xs text-muted-foreground">
                  O webhook será configurado automaticamente na sua instância Evolution:
                </p>
                <code className="text-xs bg-background p-2 rounded block">
                  {webhookUrl}/[pipeline_id]
                </code>
                <p className="text-xs text-muted-foreground">
                  Eventos: messages.upsert, connection.update, messages.update
                </p>
              </div>

              <Button 
                onClick={saveIntegration} 
                disabled={saving || !newIntegration.instance_name || !newIntegration.api_url || !newIntegration.api_key}
                className="w-full"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Configurando...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Configurar Instância
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}