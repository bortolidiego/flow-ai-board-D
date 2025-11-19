import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Timer, AlertTriangle, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SLAConfigManagerProps {
  pipelineId: string;
}

export function SLAConfigManager({ pipelineId }: SLAConfigManagerProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    first_response_minutes: 60, // 1 hora
    ongoing_response_minutes: 1440, // 24 horas
    warning_threshold_percent: 80
  });

  useEffect(() => {
    loadConfig();
  }, [pipelineId]);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('pipeline_sla_config')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setConfig({
          first_response_minutes: data.first_response_minutes || 60,
          ongoing_response_minutes: data.ongoing_response_minutes || 1440,
          warning_threshold_percent: data.warning_threshold_percent || 80
        });
      }
    } catch (error) {
      console.error('Error loading SLA config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Verifica se já existe para fazer update ou insert
      const { data: existing } = await supabase
        .from('pipeline_sla_config')
        .select('id')
        .eq('pipeline_id', pipelineId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('pipeline_sla_config')
          .update({
            first_response_minutes: config.first_response_minutes,
            ongoing_response_minutes: config.ongoing_response_minutes,
            warning_threshold_percent: config.warning_threshold_percent,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('pipeline_sla_config')
          .insert({
            pipeline_id: pipelineId,
            first_response_minutes: config.first_response_minutes,
            ongoing_response_minutes: config.ongoing_response_minutes,
            warning_threshold_percent: config.warning_threshold_percent
          });
      }

      toast.success('Configurações de SLA salvas com sucesso!');
    } catch (error: any) {
      console.error('Error saving SLA config:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} minutos`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  if (loading) return <div className="p-4 text-center">Carregando configurações...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Timer className="w-4 h-4 text-primary" />
              Primeiro Contato
            </CardTitle>
            <CardDescription>
              Tempo limite para responder um novo lead (Coluna "Novo Contato")
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-primary">
                  {formatTime(config.first_response_minutes)}
                </span>
                <Input
                  type="number"
                  value={config.first_response_minutes}
                  onChange={(e) => setConfig({ ...config, first_response_minutes: Number(e.target.value) })}
                  className="w-24 text-right"
                  min={5}
                />
              </div>
              <Slider
                value={[config.first_response_minutes]}
                min={5}
                max={1440} // Max 24h
                step={5}
                onValueChange={(val) => setConfig({ ...config, first_response_minutes: val[0] })}
              />
              <p className="text-xs text-muted-foreground">
                Se o card ficar na coluna "Novo Contato" por mais que esse tempo, o SLA ficará vermelho.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Timer className="w-4 h-4 text-blue-500" />
              Resolução / Andamento
            </CardTitle>
            <CardDescription>
              Tempo limite para cards em atendimento (Demais colunas)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-blue-600">
                  {formatTime(config.ongoing_response_minutes)}
                </span>
                <Input
                  type="number"
                  value={config.ongoing_response_minutes}
                  onChange={(e) => setConfig({ ...config, ongoing_response_minutes: Number(e.target.value) })}
                  className="w-24 text-right"
                  min={60}
                />
              </div>
              <Slider
                value={[config.ongoing_response_minutes]}
                min={60}
                max={10080} // Max 7 dias
                step={60}
                onValueChange={(val) => setConfig({ ...config, ongoing_response_minutes: val[0] })}
              />
              <p className="text-xs text-muted-foreground">
                Tempo ideal para concluir ou movimentar um card que já está em atendimento.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            Alerta de Atenção
          </CardTitle>
          <CardDescription>
            Em qual porcentagem do tempo o SLA deve ficar amarelo (Atenção)?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <Label>Limiar de Alerta: {config.warning_threshold_percent}%</Label>
            </div>
            <Slider
              value={[config.warning_threshold_percent]}
              min={50}
              max={95}
              step={5}
              onValueChange={(val) => setConfig({ ...config, warning_threshold_percent: val[0] })}
              className="[&>.span]:bg-yellow-500"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>50% (Cedo)</span>
              <span>95% (Em cima da hora)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="w-4 h-4" />
          {saving ? 'Salvando...' : 'Salvar Configurações de SLA'}
        </Button>
      </div>
    </div>
  );
}