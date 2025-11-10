import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Play, Pause } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MovementRule {
  id: string;
  funnel_type: string;
  when_lifecycle_stage: string | null;
  move_to_column_name: string;
  is_active: boolean;
  priority: number;
}

interface FunnelConfig {
  funnel_type: string;
  funnel_name: string;
  color: string;
  lifecycle_stages: any[];
}

interface MovementRulesManagerProps {
  pipelineId: string;
  onUpdate: () => void;
}

export function MovementRulesManager({ pipelineId, onUpdate }: MovementRulesManagerProps) {
  const [rules, setRules] = useState<MovementRule[]>([]);
  const [funnels, setFunnels] = useState<FunnelConfig[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [pipelineId]);

  const loadData = async () => {
    try {
      // Carregar regras
      const { data: rulesData, error: rulesError } = await supabase
        .from('pipeline_movement_rules')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .order('priority');

      if (rulesError) throw rulesError;

      // Carregar funis
      const { data: funnelsData, error: funnelsError } = await supabase
        .from('funnel_config')
        .select('funnel_type, funnel_name, color, lifecycle_stages')
        .eq('pipeline_id', pipelineId)
        .order('position');

      if (funnelsError) throw funnelsError;

      const typedFunnels = (funnelsData || []).map(d => ({
        ...d,
        lifecycle_stages: (d.lifecycle_stages as any) || []
      }));

      setFunnels(typedFunnels);

      // Carregar colunas
      const { data: columnsData, error: columnsError } = await supabase
        .from('columns')
        .select('name')
        .eq('pipeline_id', pipelineId)
        .order('position');

      if (columnsError) throw columnsError;

      setRules(rulesData || []);
      setColumns(columnsData?.map(c => c.name) || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar regras",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleRuleActive = async (ruleId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('pipeline_movement_rules')
        .update({ is_active: isActive })
        .eq('id', ruleId);

      if (error) throw error;

      toast({
        title: isActive ? "Regra ativada" : "Regra desativada",
        description: "A regra foi atualizada com sucesso."
      });

      loadData();
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar regra",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const deleteRule = async (ruleId: string) => {
    try {
      const { error } = await supabase
        .from('pipeline_movement_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;

      toast({
        title: "Regra excluída",
        description: "A regra foi removida com sucesso."
      });

      loadData();
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir regra",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const addRule = async () => {
    if (funnels.length === 0 || columns.length === 0) {
      toast({
        title: "Não é possível adicionar regra",
        description: "Configure funis e colunas primeiro.",
        variant: "destructive"
      });
      return;
    }

    try {
      const firstFunnel = funnels[0];
      const terminalStage = firstFunnel.lifecycle_stages.find((s: any) => s.is_terminal);

      const { error } = await supabase
        .from('pipeline_movement_rules')
        .insert({
          pipeline_id: pipelineId,
          funnel_type: firstFunnel.funnel_type,
          when_lifecycle_stage: terminalStage?.stage || null,
          move_to_column_name: columns[columns.length - 1], // Default: última coluna
          is_active: true,
          priority: rules.length + 1
        });

      if (error) throw error;

      toast({
        title: "Regra criada",
        description: "Nova regra de movimentação adicionada."
      });

      loadData();
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erro ao criar regra",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const updateRule = async (ruleId: string, updates: Partial<MovementRule>) => {
    try {
      const { error } = await supabase
        .from('pipeline_movement_rules')
        .update(updates)
        .eq('id', ruleId);

      if (error) throw error;

      loadData();
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar regra",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Regras de Movimentação Automática</CardTitle>
            <CardDescription>
              Configure quando os cards devem ser movidos automaticamente entre colunas
            </CardDescription>
          </div>
          <Button onClick={addRule} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Nova Regra
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {rules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma regra configurada. Clique em "Nova Regra" para começar.
          </div>
        ) : (
          rules.map((rule) => {
            const funnel = funnels.find(f => f.funnel_type === rule.funnel_type);
            return (
              <Card key={rule.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {rule.is_active ? (
                        <Play className="h-4 w-4 text-green-500" />
                      ) : (
                        <Pause className="h-4 w-4 text-muted-foreground" />
                      )}
                      <Badge variant="outline" style={{ borderColor: funnel?.color }}>
                        {funnel?.funnel_name}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={rule.is_active}
                        onCheckedChange={(checked) => toggleRuleActive(rule.id, checked)}
                      />
                      <Button 
                        size="icon" 
                        variant="ghost"
                        onClick={() => deleteRule(rule.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Quando chegar em:</Label>
                      <Select 
                        value={rule.when_lifecycle_stage || 'none'}
                        onValueChange={(value) => updateRule(rule.id, { when_lifecycle_stage: value === 'none' ? null : value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Qualquer etapa</SelectItem>
                          {funnel?.lifecycle_stages.map((stage: any, idx: number) => (
                            <SelectItem key={idx} value={stage.stage}>
                              {stage.stage} {stage.is_terminal ? '(Terminal)' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Mover para:</Label>
                      <Select 
                        value={rule.move_to_column_name}
                        onValueChange={(value) => updateRule(rule.id, { move_to_column_name: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {columns.map((col) => (
                            <SelectItem key={col} value={col}>
                              {col}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                    Quando um card do funil <strong>{funnel?.funnel_name}</strong> 
                    {rule.when_lifecycle_stage ? ` chegar na etapa "${rule.when_lifecycle_stage}"` : ' mudar de etapa'}
                    , mover automaticamente para a coluna <strong>{rule.move_to_column_name}</strong>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
