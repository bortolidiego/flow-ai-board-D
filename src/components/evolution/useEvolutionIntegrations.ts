import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { type EvolutionIntegration } from './EvolutionIntegrationCard';

export function useEvolutionIntegrations(pipelineId: string) {
  const [integrations, setIntegrations] = useState<EvolutionIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);

  const loadIntegrations = async () => {
    try {
      const { data, error } = await (supabase as any)
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

      const { error } = await (supabase as any)
        .from('evolution_integrations')
        .update({
          status: data.instance?.state === 'open' ? 'connected' : 'disconnected',
          last_connection: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', integration.id);

      if (error) throw error;

      loadIntegrations();
    } catch (error: any) {
      console.error('Error testing connection:', error);
    } finally {
      setTesting(null);
    }
  };

  const deleteIntegration = async (integrationId: string) => {
    try {
      const integration = integrations.find(i => i.id === integrationId);
      if (integration) {
        await fetch(`${integration.api_url}/webhook/delete/${integration.instance_name}`, {
          method: 'DELETE',
          headers: {
            'apikey': integration.api_key
          }
        });
      }

      const { error } = await (supabase as any)
        .from('evolution_integrations')
        .delete()
        .eq('id', integrationId);

      if (error) throw error;

      loadIntegrations();
    } catch (error: any) {
      console.error('Error deleting integration:', error);
    }
  };

  useEffect(() => {
    loadIntegrations();
  }, [pipelineId]);

  return {
    integrations,
    loading,
    testing,
    loadIntegrations,
    testConnection,
    deleteIntegration
  };
}