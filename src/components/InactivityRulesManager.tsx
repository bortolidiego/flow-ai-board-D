import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Clock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface InactivityRule {
  id: string;
  funnel_type: string;
  inactivity_days: number;
  move_to_column_name: string | null;
  set_resolution_status: string | null;
  only_if_progress_below: number | null;
  only_if_non_monetary: boolean;
}

interface FunnelConfig {
  funnel_type: string;
  funnel_name: string;
  color: string;
  is_monetary: boolean;
}

interface InactivityRulesManagerProps {
  pipelineId: string;
  onUpdate: () => void;
}

export function InactivityRulesManager({ pipelineId, onUpdate }: InactivityRulesManagerProps) {
  const [rules, setRules] = useState<InactivityRule[]>([]);
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
        .from('pipeline_inactivity_config')
        .select('*')
        .eq('pipeline_id', pipelineId);

      if (rulesError) throw rulesError;

      // Carregar funis
      const { data: funnelsData, error: funnelsError } = await supabase
        .from('funnel_config')
        .select('funnel_type, funnel_name, color, is_monetary')
        .eq('pipeline_id', pipelineId)
        .order('position');

      if (funnelsError) throw funnelsError;

      // Carregar colunas
      const { data: columnsData, error: columnsError } = await supabase
        .from('columns')
        .select('name')
        .eq('pipeline_id', pipelineId)
        .order('position');

      if (columnsError) throw columnsError;

      setRules(rulesData || []);
      setFunnels(funnelsData || []);
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

  const deleteRule = async (ruleId: string) => {
    try {
      const { error } = await supabase
        .from('pipeline_inactivity_config')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;

      toast({
        title: "Regra excluída",
        description: "A regra de inatividade foi removida."
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
      const { error } = await supabase
        .from('pipeline_inactivity_config')
        .insert({
          pipeline_id: pipelineId,
          funnel_type: funnels[0].funnel_type,
          inactivity_days: 3,
          move_to_column_name: columns[columns.length - 1],
          set_resolution_status: 'unresolved',
          only_if_progress_below: 50,
          only_if_non_monetary: true
        });

      if (error) throw error;

      toast({
        title: "Regra criada",
        description: "Nova regra de inatividade adicionada."
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

  const updateRule = async (ruleId: string, updates: Partial<InactivityRule>) => {
    try {
      const { error } = await supabase
        .from('pipeline_inactivity_config')
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
            <CardTitle>Regras de Inatividade</CardTitle>
            <CardDescription>
              Configure quando cards inativos devem ser movidos automaticamente
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
            Nenhuma regra de inatividade configurada. Clique em "Nova Regra" para começar.
          </div>
        ) : (
          rules.map((rule) => {
            const funnel = funnels.find(f => f.funnel_type === rule.funnel_type);
            return (
              <Card key={rule.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-500" />
                      <Badge variant="outline" style={{ borderColor: funnel?.color }}>
                        {funnel?.funnel_name}
                      </Badge>
                      <Badge variant="secondary">
                        {rule.inactivity_days} dias
                      </Badge>
                    </div>
                    <Button 
                      size="icon" 
                      variant="ghost"
                      onClick={() => deleteRule(rule.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Funil</Label>
                      <Select 
                        value={rule.funnel_type}
                        onValueChange={(value) => updateRule(rule.id, { funnel_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {funnels.map((funnel) => (
                            <SelectItem key={funnel.funnel_type} value={funnel.funnel_type}>
                              {funnel.funnel_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Dias de Inatividade</Label>
                      <Input 
                        type="number" 
                        value={rule.inactivity_days}
                        onChange={(e) => updateRule(rule.id, { inactivity_days: parseInt(e.target.value) })}
                        min={1}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Mover para Coluna</Label>
                      <Select 
                        value={rule.move_to_column_name || 'none'}
                        onValueChange={(value) => updateRule(rule.id, { move_to_column_name: value === 'none' ? null : value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Não mover</SelectItem>
                          {columns.map((col) => (
                            <SelectItem key={col} value={col}>
                              {col}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Definir Status</Label>
                      <Select 
                        value={rule.set_resolution_status || 'none'}
                        onValueChange={(value) => updateRule(rule.id, { set_resolution_status: value === 'none' ? null : value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Não alterar</SelectItem>
                          <SelectItem value="unresolved">Não Resolvido</SelectItem>
                          <SelectItem value="resolved">Resolvido</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Apenas se Progresso Abaixo de (%)</Label>
                      <Input 
                        type="number" 
                        value={rule.only_if_progress_below || ''}
                        onChange={(e) => updateRule(rule.id, { only_if_progress_below: e.target.value ? parseInt(e.target.value) : null })}
                        min={0}
                        max={100}
                        placeholder="Sem limite"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Condições</Label>
                      <div className="flex items-center space-x-2 h-10">
                        <Switch 
                          checked={rule.only_if_non_monetary}
                          onCheckedChange={(checked) => updateRule(rule.id, { only_if_non_monetary: checked })}
                        />
                        <Label className="text-xs">Apenas não monetárias</Label>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                    Cards do funil <strong>{funnel?.funnel_name}</strong> sem atividade há <strong>{rule.inactivity_days} dias</strong>
                    {rule.only_if_progress_below && ` com progresso abaixo de ${rule.only_if_progress_below}%`}
                    {rule.only_if_non_monetary && ' (apenas não monetários)'}
                    {rule.move_to_column_name && ` serão movidos para "${rule.move_to_column_name}"`}
                    {rule.set_resolution_status && ` e marcados como "${rule.set_resolution_status}"`}
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
