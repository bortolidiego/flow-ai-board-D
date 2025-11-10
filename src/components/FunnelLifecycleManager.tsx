import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Lock, ChevronUp, ChevronDown } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface LifecycleStage {
  stage: string;
  progress_percent: number;
  is_initial?: boolean;
  is_terminal?: boolean;
  resolution_status?: 'won' | 'lost' | 'resolved' | 'unresolved';
}

interface FunnelConfig {
  id: string;
  funnel_type: string;
  funnel_name: string;
  color: string;
  is_monetary: boolean;
  priority: number;
  lifecycle_stages: LifecycleStage[];
  inactivity_days: number;
  position: number;
}

interface FunnelLifecycleManagerProps {
  pipelineId: string;
  onUpdate: () => void;
}

export function FunnelLifecycleManager({ pipelineId, onUpdate }: FunnelLifecycleManagerProps) {
  const [funnels, setFunnels] = useState<FunnelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFunnel, setSelectedFunnel] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadFunnels();
  }, [pipelineId]);

  const loadFunnels = async () => {
    try {
      const { data, error } = await supabase
        .from('funnel_config')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .order('position');

      if (error) throw error;
      const typedData = (data || []).map(d => ({
        ...d,
        lifecycle_stages: (d.lifecycle_stages as any) || []
      })) as FunnelConfig[];
      setFunnels(typedData);
      if (typedData && typedData.length > 0 && !selectedFunnel) {
        setSelectedFunnel(typedData[0].funnel_type);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao carregar funis",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateFunnel = async (funnelType: string, updates: Partial<FunnelConfig>) => {
    try {
      const { error } = await supabase
        .from('funnel_config')
        .update(updates as any)
        .eq('pipeline_id', pipelineId)
        .eq('funnel_type', funnelType);

      if (error) throw error;

      toast({
        title: "Funil atualizado",
        description: "As alterações foram salvas com sucesso."
      });

      loadFunnels();
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar funil",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const addStageToFunnel = (funnelType: string) => {
    const funnel = funnels.find(f => f.funnel_type === funnelType);
    if (!funnel) return;

    const newStage: LifecycleStage = {
      stage: "Nova Etapa",
      progress_percent: 50,
      is_terminal: false
    };

    const updatedStages = [...funnel.lifecycle_stages, newStage];
    updateFunnel(funnelType, { lifecycle_stages: updatedStages });
  };

  const removeStageFromFunnel = (funnelType: string, stageIndex: number) => {
    const funnel = funnels.find(f => f.funnel_type === funnelType);
    if (!funnel) return;

    const updatedStages = funnel.lifecycle_stages.filter((_, idx) => idx !== stageIndex);
    updateFunnel(funnelType, { lifecycle_stages: updatedStages });
  };

  const updateStage = (funnelType: string, stageIndex: number, updates: Partial<LifecycleStage>) => {
    const funnel = funnels.find(f => f.funnel_type === funnelType);
    if (!funnel) return;

    const updatedStages = funnel.lifecycle_stages.map((stage, idx) => 
      idx === stageIndex ? { ...stage, ...updates } : stage
    );

    updateFunnel(funnelType, { lifecycle_stages: updatedStages });
  };

  const moveStage = (funnelType: string, stageIndex: number, direction: 'up' | 'down') => {
    const funnel = funnels.find(f => f.funnel_type === funnelType);
    if (!funnel) return;

    const stages = [...funnel.lifecycle_stages];
    const newIndex = direction === 'up' ? stageIndex - 1 : stageIndex + 1;

    if (newIndex < 0 || newIndex >= stages.length) return;

    [stages[stageIndex], stages[newIndex]] = [stages[newIndex], stages[stageIndex]];
    
    updateFunnel(funnelType, { lifecycle_stages: stages });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={selectedFunnel || undefined} onValueChange={setSelectedFunnel}>
        <TabsList className="w-full flex-wrap h-auto">
          {funnels.map((funnel) => (
            <TabsTrigger key={funnel.funnel_type} value={funnel.funnel_type} className="flex items-center gap-1">
              {funnel.is_monetary && <Lock className="h-3 w-3" />}
              <span style={{ color: funnel.color }}>●</span>
              {funnel.funnel_name}
            </TabsTrigger>
          ))}
        </TabsList>

        {funnels.map((funnel) => (
          <TabsContent key={funnel.funnel_type} value={funnel.funnel_type}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {funnel.is_monetary && <Lock className="h-5 w-5 text-red-500" />}
                      <span style={{ color: funnel.color }}>🎯 {funnel.funnel_name}</span>
                    </CardTitle>
                    <CardDescription>
                      Configure o ciclo de vida e as etapas deste funil
                    </CardDescription>
                  </div>
                  <Badge variant={funnel.is_monetary ? "destructive" : "secondary"}>
                    {funnel.is_monetary ? "Monetário" : "Não Monetário"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Configurações Gerais */}
                <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                  <div className="space-y-2">
                    <Label>Prioridade</Label>
                    <Select 
                      value={funnel.priority.toString()} 
                      onValueChange={(value) => updateFunnel(funnel.funnel_type, { priority: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Alta (1)</SelectItem>
                        <SelectItem value="2">Média (2)</SelectItem>
                        <SelectItem value="3">Baixa (3)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Dias de Inatividade</Label>
                    <Input 
                      type="number" 
                      value={funnel.inactivity_days}
                      onChange={(e) => updateFunnel(funnel.funnel_type, { inactivity_days: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                {/* Etapas do Ciclo de Vida */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Etapas do Ciclo de Vida</Label>
                    <Button size="sm" variant="outline" onClick={() => addStageToFunnel(funnel.funnel_type)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar Etapa
                    </Button>
                  </div>

                  {funnel.lifecycle_stages.map((stage, idx) => (
                    <Card key={idx} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => moveStage(funnel.funnel_type, idx, 'up')}
                              disabled={idx === 0}
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => moveStage(funnel.funnel_type, idx, 'down')}
                              disabled={idx === funnel.lifecycle_stages.length - 1}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                            <Badge variant="outline">Etapa {idx + 1}</Badge>
                            {stage.is_initial && <Badge variant="secondary">Inicial</Badge>}
                            {stage.is_terminal && <Badge variant="destructive">Terminal</Badge>}
                          </div>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => removeStageFromFunnel(funnel.funnel_type, idx)}
                            disabled={funnel.lifecycle_stages.length <= 2}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Nome da Etapa</Label>
                            <Input 
                              value={stage.stage}
                              onChange={(e) => updateStage(funnel.funnel_type, idx, { stage: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Progresso (%)</Label>
                            <Input 
                              type="number" 
                              value={stage.progress_percent}
                              onChange={(e) => updateStage(funnel.funnel_type, idx, { progress_percent: parseInt(e.target.value) })}
                              min={0}
                              max={100}
                            />
                          </div>
                          {stage.is_terminal && (
                            <div className="space-y-1">
                              <Label className="text-xs">Status de Resolução</Label>
                              <Select 
                                value={stage.resolution_status || 'resolved'}
                                onValueChange={(value) => updateStage(funnel.funnel_type, idx, { 
                                  resolution_status: value as 'won' | 'lost' | 'resolved' | 'unresolved' 
                                })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="won">Ganho</SelectItem>
                                  <SelectItem value="lost">Perdido</SelectItem>
                                  <SelectItem value="resolved">Resolvido</SelectItem>
                                  <SelectItem value="unresolved">Não Resolvido</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-4">
                          <div className="flex items-center space-x-2">
                            <Switch 
                              checked={stage.is_initial || false}
                              onCheckedChange={(checked) => updateStage(funnel.funnel_type, idx, { is_initial: checked })}
                            />
                            <Label className="text-xs">Etapa Inicial</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch 
                              checked={stage.is_terminal || false}
                              onCheckedChange={(checked) => updateStage(funnel.funnel_type, idx, { is_terminal: checked })}
                            />
                            <Label className="text-xs">Etapa Terminal</Label>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
