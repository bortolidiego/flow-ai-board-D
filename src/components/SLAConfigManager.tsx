import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Timer, AlertTriangle, Save, Clock, History } from 'lucide-react';
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
    warning_threshold_percent: 80,
    sla_basis: 'resolution' // 'resolution' | 'response'
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
          warning_threshold_percent: data.warning_threshold_percent || 80,
          sla_basis: (data as any).sla_basis || 'resolution'
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
      const { data: existing } = await supabase
        .from('pipeline_sla_config')
        .select('id')
        .eq('pipeline_id', pipelineId)
        .maybeSingle();

      const payload = {
        pipeline_id: pipelineId,
        first_response_minutes: config.first_response_minutes,
        ongoing_response_minutes: config.ongoing_response_minutes,
        warning_threshold_percent: config.warning_threshold_percent,
        sla_basis: config.sla_basis,
        updated_at: new Date().toISOString()
      };

      if (existing) {
        await supabase
          .from('pipeline_sla_config')
          .update(payload as any)
          .eq('id', existing.id);
      } else {
        await supabase
          .from('pipeline_sla_config')
          .insert(payload as any);
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
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  if (loading) return <div className="p-4 text-center">Carregando configurações...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Base de Cálculo do SLA</CardTitle>
          <CardDescription>Como o tempo limite deve ser calculado?</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup 
            value={config.sla_basis} 
            onValueChange={(val) => setConfig({ ...config, sla_basis: val })}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div className={`flex items-start space-x-2 border p-4 rounded-lg cursor-pointer transition-colors ${config.sla_basis === 'resolution' ? 'border-primary bg-primary/5' : 'border-border'}`}>
              <RadioGroupItem value="resolution" id="r1" className="mt-1" />
              <div className="grid gap-1.5">
                <Label htmlFor="r1" className="font-semibold cursor-pointer flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Tempo Total de Resolução
                </Label>
                <p className="text-sm text-muted-foreground">
                  O relógio conta desde a <strong>criação do card</strong> até sua finalização. Ideal para medir ciclos de venda ou resolução de chamados completos.
                </p>
              </div>
            </div>

            <div className={`flex items-start space-x-2 border p-4 rounded-lg cursor-pointer transition-colors ${config.sla_basis === 'response' ? 'border-primary bg-primary/5' : 'border-border'}`}>
              <RadioGroupItem value="response" id="r2" className="mt-1" />
              <div className="grid gap-1.5">
                <Label htmlFor="r2" className="font-semibold cursor-pointer flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Tempo de Resposta (Inatividade)
                </Label>
                <p className="text-sm text-muted-foreground">
                  O relógio reinicia a cada <strong>nova atividade/mensagem</strong>. Ideal para identificar cards abandonados ou demora na resposta do agente.
                </p>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Timer className="w-4 h-4 text-primary" />
              Novos Contatos
            </CardTitle>
            <CardDescription>
              Limite para cards na coluna "Novo Contato"
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
                max={1440}
                step={5}
                onValueChange={(val) => setConfig({ ...config, first_response_minutes: val[0] })}
              />
              <p className="text-xs text-muted-foreground">
                {config.sla_basis === 'resolution' 
                  ? 'Tempo máximo para tirar o card da primeira etapa.' 
                  : 'Tempo máximo sem interação em novos leads.'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Timer className="w-4 h-4 text-blue-500" />
              Em Atendimento
            </CardTitle>
            <CardDescription>
              Limite para cards nas demais etapas
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
                max={10080}
                step={60}
                onValueChange={(val) => setConfig({ ...config, ongoing_response_minutes: val[0] })}
              />
              <p className="text-xs text-muted-foreground">
                {config.sla_basis === 'resolution' 
                  ? 'Tempo máximo total para finalizar o card.' 
                  : 'Tempo máximo que um card pode ficar sem resposta/atividade do agente.'}
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
            <p className="text-xs text-muted-foreground">
              O SLA ficará amarelo quando atingir {config.warning_threshold_percent}% do tempo limite.
            </p>
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