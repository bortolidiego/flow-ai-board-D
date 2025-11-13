"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { EvolutionIntegrationList } from './evolution/EvolutionIntegrationList';
import { EvolutionIntegrationForm, type NewIntegrationData } from './evolution/EvolutionIntegrationForm';
import { useEvolutionIntegrations } from './evolution/useEvolutionIntegrations';

interface EvolutionSettingsProps {
  pipelineId: string;
}

export function EvolutionSettings({ pipelineId }: EvolutionSettingsProps) {
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evolution-webhook`;

  const {
    integrations,
    loading,
    testing,
    testConnection,
    deleteIntegration,
    loadIntegrations
  } = useEvolutionIntegrations(pipelineId);

  const saveIntegration = async (data: NewIntegrationData) => {
    setSaving(true);
    try {
      const webhookConfig = {
        url: `${webhookUrl}/${pipelineId}`,
        events: ['messages.upsert', 'connection.update', 'messages.update']
      };

      const webhookResponse = await fetch(`${data.api_url}/webhook/set/${data.instance_name}`, {
        method: 'POST',
        headers: {
          'apikey': data.api_key,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(webhookConfig)
      });

      if (!webhookResponse.ok) {
        const error = await webhookResponse.text();
        throw new Error(`Falha ao configurar webhook: ${error}`);
      }

      const { data: savedIntegration, error } = await (supabase as any)
        .from('evolution_integrations')
        .insert({
          pipeline_id: pipelineId,
          instance_name: data.instance_name,
          instance_alias: data.instance_alias || data.instance_name,
          api_url: data.api_url,
          api_key: data.api_key,
          phone_number: data.phone_number,
          webhook_url: webhookConfig.url,
          status: 'connecting',
          events_enabled: webhookConfig.events,
          auto_create_cards: data.auto_create_cards,
          analyze_messages: data.analyze_messages,
        })
        .select()
        .single();

      if (error) throw error;

      await testConnection(savedIntegration);
      loadIntegrations();

      toast({
        title: 'Integração criada',
        description: 'Instância Evolution configurada com sucesso!'
      });
    } catch (error: any) {
      console.error('Error saving integration:', error);
      toast({
        title: 'Erro ao salvar integração',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
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
          <EvolutionIntegrationList
            integrations={integrations}
            onTestConnection={testConnection}
            onDelete={deleteIntegration}
            testing={testing}
          />
        </TabsContent>

        <TabsContent value="add" className="space-y-4">
          <EvolutionIntegrationForm
            onSave={saveIntegration}
            saving={saving}
            webhookUrl={webhookUrl}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}