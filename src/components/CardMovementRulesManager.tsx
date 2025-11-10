import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Trash2, Plus, GripVertical, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface Column {
  id: string;
  name: string;
  position: number;
}

interface CustomField {
  field_name: string;
  field_label: string;
  field_type: string;
}

interface MoveRule {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  conditions: {
    operator: 'AND' | 'OR';
    criteria: {
      field: string;
      operator: string;
      value: any;
    }[];
  };
  action: {
    type: 'move_to_column' | 'move_forward' | 'move_backward';
    target: string | number;
    notify: boolean;
  };
}

interface CardMovementRulesManagerProps {
  pipelineId: string;
  columns: Column[];
  customFields: CustomField[];
  onUpdate: () => void;
}

export function CardMovementRulesManager({ 
  pipelineId, 
  columns,
  customFields,
  onUpdate 
}: CardMovementRulesManagerProps) {
  const [rules, setRules] = useState<MoveRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRules();
  }, [pipelineId]);

  const loadRules = async () => {
    try {
      const { data, error } = await supabase
        .from('pipeline_ai_config')
        .select('move_rules')
        .eq('pipeline_id', pipelineId)
        .maybeSingle();

      if (error) throw error;
      
      const moveRulesData = data?.move_rules as { rules?: MoveRule[] } | null;
      const loadedRules = moveRulesData?.rules || [];
      setRules(loadedRules);
    } catch (error) {
      console.error('Error loading rules:', error);
      toast.error('Erro ao carregar regras');
    } finally {
      setLoading(false);
    }
  };

  const saveRules = async () => {
    try {
      const { error } = await supabase
        .from('pipeline_ai_config')
        .update({ 
          move_rules: { rules } as any,
          updated_at: new Date().toISOString()
        })
        .eq('pipeline_id', pipelineId);

      if (error) throw error;
      
      toast.success('Regras salvas com sucesso!');
      onUpdate();
    } catch (error) {
      console.error('Error saving rules:', error);
      toast.error('Erro ao salvar regras');
    }
  };

  const addRule = () => {
    const newRule: MoveRule = {
      id: crypto.randomUUID(),
      name: `Regra ${rules.length + 1}`,
      enabled: true,
      priority: rules.length,
      conditions: {
        operator: 'AND',
        criteria: [
          {
            field: 'funnel_score',
            operator: '>',
            value: 70
          }
        ]
      },
      action: {
        type: 'move_forward',
        target: 1,
        notify: false
      }
    };
    setRules([...rules, newRule]);
  };

  const deleteRule = (ruleId: string) => {
    setRules(rules.filter(r => r.id !== ruleId));
  };

  const updateRule = (ruleId: string, updates: Partial<MoveRule>) => {
    setRules(rules.map(r => r.id === ruleId ? { ...r, ...updates } : r));
  };

  const addCriterion = (ruleId: string) => {
    setRules(rules.map(r => {
      if (r.id === ruleId) {
        return {
          ...r,
          conditions: {
            ...r.conditions,
            criteria: [
              ...r.conditions.criteria,
              { field: 'funnel_score', operator: '>', value: 0 }
            ]
          }
        };
      }
      return r;
    }));
  };

  const deleteCriterion = (ruleId: string, criterionIndex: number) => {
    setRules(rules.map(r => {
      if (r.id === ruleId) {
        return {
          ...r,
          conditions: {
            ...r.conditions,
            criteria: r.conditions.criteria.filter((_, i) => i !== criterionIndex)
          }
        };
      }
      return r;
    }));
  };

  const updateCriterion = (ruleId: string, criterionIndex: number, updates: any) => {
    setRules(rules.map(r => {
      if (r.id === ruleId) {
        return {
          ...r,
          conditions: {
            ...r.conditions,
            criteria: r.conditions.criteria.map((c, i) => 
              i === criterionIndex ? { ...c, ...updates } : c
            )
          }
        };
      }
      return r;
    }));
  };

  const fieldOptions = [
    { value: 'funnel_score', label: 'Score de Conversão' },
    { value: 'service_quality_score', label: 'Score de Qualidade' },
    { value: 'conversation_status', label: 'Status da Conversa' },
    { value: 'value', label: 'Valor do Negócio' },
    ...customFields.map(cf => ({ 
      value: `custom_field.${cf.field_name}`, 
      label: cf.field_label 
    }))
  ];

  const operatorOptions = {
    number: [
      { value: '>', label: 'Maior que' },
      { value: '<', label: 'Menor que' },
      { value: '=', label: 'Igual a' },
      { value: '>=', label: 'Maior ou igual' },
      { value: '<=', label: 'Menor ou igual' }
    ],
    text: [
      { value: '=', label: 'Igual a' },
      { value: 'contains', label: 'Contém' },
      { value: 'not_contains', label: 'Não contém' }
    ]
  };

  if (loading) {
    return <Card><CardContent className="py-8 text-center">Carregando...</CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Regras de Movimentação Automática
              </CardTitle>
              <CardDescription>
                Configure condições para mover cards automaticamente baseado na análise da IA
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={addRule} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Nova Regra
              </Button>
              <Button onClick={saveRules} size="sm">
                Salvar Regras
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {rules.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-primary/20 rounded-lg">
              <Sparkles className="w-12 h-12 text-primary/30 mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">
                Nenhuma regra customizada. A IA usará as regras padrão inteligentes.
              </p>
              <Button onClick={addRule} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeira Regra
              </Button>
            </div>
          ) : (
            rules.map((rule, ruleIndex) => (
              <Card key={rule.id} className="border-primary/20">
                <CardContent className="pt-6 space-y-4">
                  {/* Rule Header */}
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-5 h-5 text-muted-foreground cursor-move" />
                    <Input
                      value={rule.name}
                      onChange={(e) => updateRule(rule.id, { name: e.target.value })}
                      className="flex-1 font-semibold"
                      placeholder="Nome da regra"
                    />
                    <Badge variant={rule.enabled ? "default" : "secondary"}>
                      Prioridade {rule.priority + 1}
                    </Badge>
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={(enabled) => updateRule(rule.id, { enabled })}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteRule(rule.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>

                  <Separator />

                  {/* Conditions */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold">Condições</Label>
                      <Select
                        value={rule.conditions.operator}
                        onValueChange={(operator: 'AND' | 'OR') => 
                          updateRule(rule.id, { 
                            conditions: { ...rule.conditions, operator } 
                          })
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AND">E (todas)</SelectItem>
                          <SelectItem value="OR">OU (qualquer)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {rule.conditions.criteria.map((criterion, criterionIndex) => (
                      <div key={criterionIndex} className="flex items-center gap-2 p-3 bg-secondary/20 rounded-lg">
                        <Select
                          value={criterion.field}
                          onValueChange={(field) => 
                            updateCriterion(rule.id, criterionIndex, { field })
                          }
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {fieldOptions.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select
                          value={criterion.operator}
                          onValueChange={(operator) => 
                            updateCriterion(rule.id, criterionIndex, { operator })
                          }
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(criterion.field.includes('score') || criterion.field === 'value'
                              ? operatorOptions.number
                              : operatorOptions.text
                            ).map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Input
                          type={criterion.field.includes('score') || criterion.field === 'value' ? 'number' : 'text'}
                          value={criterion.value}
                          onChange={(e) => 
                            updateCriterion(rule.id, criterionIndex, { 
                              value: criterion.field.includes('score') || criterion.field === 'value'
                                ? Number(e.target.value)
                                : e.target.value
                            })
                          }
                          className="w-32"
                          placeholder="Valor"
                        />

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteCriterion(rule.id, criterionIndex)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addCriterion(rule.id)}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Condição
                    </Button>
                  </div>

                  <Separator />

                  {/* Action */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Ação</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Tipo</Label>
                        <Select
                          value={rule.action.type}
                          onValueChange={(type: any) => 
                            updateRule(rule.id, { 
                              action: { ...rule.action, type } 
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="move_to_column">Mover para coluna</SelectItem>
                            <SelectItem value="move_forward">Avançar etapas</SelectItem>
                            <SelectItem value="move_backward">Retroceder etapas</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">
                          {rule.action.type === 'move_to_column' ? 'Coluna' : 'Etapas'}
                        </Label>
                        {rule.action.type === 'move_to_column' ? (
                          <Select
                            value={rule.action.target as string}
                            onValueChange={(target) => 
                              updateRule(rule.id, { 
                                action: { ...rule.action, target } 
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {columns.map(col => (
                                <SelectItem key={col.id} value={col.id}>
                                  {col.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            type="number"
                            min="1"
                            max="5"
                            value={rule.action.target}
                            onChange={(e) => 
                              updateRule(rule.id, { 
                                action: { ...rule.action, target: Number(e.target.value) } 
                              })
                            }
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
