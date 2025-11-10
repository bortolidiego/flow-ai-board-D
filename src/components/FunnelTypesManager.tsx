import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Save, X, GripVertical, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FunnelType {
  id: string;
  funnel_type: string;
  funnel_name: string;
  color: string;
  position: number;
}

interface FunnelTypesManagerProps {
  pipelineId: string;
  onUpdate: () => void;
}

const PRESET_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'
];

export function FunnelTypesManager({ pipelineId, onUpdate }: FunnelTypesManagerProps) {
  const [types, setTypes] = useState<FunnelType[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    funnel_type: '',
    funnel_name: '',
    color: PRESET_COLORS[0],
  });

  useEffect(() => {
    fetchTypes();
  }, [pipelineId]);

  const fetchTypes = async () => {
    const { data, error } = await supabase
      .from('funnel_config')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .order('position');

    if (error) {
      console.error('Error fetching funnel types:', error);
      return;
    }

    setTypes(data || []);
  };

  const handleSave = async () => {
    if (!formData.funnel_type.trim() || !formData.funnel_name.trim()) {
      toast.error('Tipo e nome são obrigatórios');
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('funnel_config')
          .update({
            funnel_type: formData.funnel_type.trim(),
            funnel_name: formData.funnel_name.trim(),
            color: formData.color,
          })
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Tipo de funil atualizado');
      } else {
        const maxPosition = Math.max(...types.map(t => t.position), -1);
        const { error } = await supabase
          .from('funnel_config')
          .insert({
            pipeline_id: pipelineId,
            funnel_type: formData.funnel_type.trim(),
            funnel_name: formData.funnel_name.trim(),
            color: formData.color,
            position: maxPosition + 1,
          });

        if (error) throw error;
        toast.success('Tipo de funil adicionado');
      }

      setFormData({
        funnel_type: '',
        funnel_name: '',
        color: PRESET_COLORS[0],
      });
      setIsAdding(false);
      setEditingId(null);
      fetchTypes();
      onUpdate();
    } catch (error: any) {
      console.error('Error saving funnel type:', error);
      toast.error(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (type: FunnelType) => {
    setEditingId(type.id);
    setFormData({
      funnel_type: type.funnel_type,
      funnel_name: type.funnel_name,
      color: type.color,
    });
    setIsAdding(true);
  };

  const handleDelete = async (typeId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('funnel_config')
        .delete()
        .eq('id', typeId);

      if (error) throw error;

      toast.success('Tipo de funil removido');
      setDeleteConfirm(null);
      fetchTypes();
      onUpdate();
    } catch (error: any) {
      console.error('Error deleting funnel type:', error);
      toast.error(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReorder = async (typeId: string, direction: 'up' | 'down') => {
    const currentIndex = types.findIndex(t => t.id === typeId);
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === types.length - 1)
    ) {
      return;
    }

    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const currentType = types[currentIndex];
    const swapType = types[swapIndex];

    setLoading(true);
    try {
      await supabase
        .from('funnel_config')
        .update({ position: swapType.position })
        .eq('id', currentType.id);

      await supabase
        .from('funnel_config')
        .update({ position: currentType.position })
        .eq('id', swapType.id);

      toast.success('Ordem atualizada');
      fetchTypes();
    } catch (error: any) {
      console.error('Error reordering:', error);
      toast.error('Erro ao reordenar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Tipos de Funil</CardTitle>
          <CardDescription>
            Configure os tipos de funil que a IA deve identificar nas conversas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {types.length > 0 && (
            <div className="space-y-2">
              {types.map((type, index) => (
                <div
                  key={type.id}
                  className="flex items-center gap-2 p-3 border border-border rounded-lg bg-card hover:bg-accent/5"
                >
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleReorder(type.id, 'up')}
                      disabled={index === 0 || loading}
                    >
                      <GripVertical className="h-4 w-4 rotate-90" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleReorder(type.id, 'down')}
                      disabled={index === types.length - 1 || loading}
                    >
                      <GripVertical className="h-4 w-4 -rotate-90" />
                    </Button>
                  </div>

                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: type.color }}
                  />

                  <div className="flex-1">
                    <p className="font-medium">{type.funnel_name}</p>
                    <p className="text-xs text-muted-foreground">{type.funnel_type}</p>
                  </div>

                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(type)}
                      disabled={loading}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteConfirm(type.id)}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {isAdding ? (
            <div className="space-y-4 p-4 border border-primary rounded-lg bg-primary/5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="funnel_type">Tipo (Identificador)</Label>
                  <Input
                    id="funnel_type"
                    value={formData.funnel_type}
                    onChange={(e) => setFormData({ ...formData, funnel_type: e.target.value })}
                    placeholder="ex: venda"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="funnel_name">Nome de Exibição</Label>
                  <Input
                    id="funnel_name"
                    value={formData.funnel_name}
                    onChange={(e) => setFormData({ ...formData, funnel_name: e.target.value })}
                    placeholder="ex: Funil de Vendas"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Cor
                </Label>
                <div className="flex gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 ${
                        formData.color === color ? 'border-primary' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({ ...formData, color })}
                      disabled={loading}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  {editingId ? 'Atualizar' : 'Salvar'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingId(null);
                    setFormData({
                      funnel_type: '',
                      funnel_name: '',
                      color: PRESET_COLORS[0],
                    });
                  }}
                  disabled={loading}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={() => setIsAdding(true)}
              variant="outline"
              className="w-full"
              disabled={loading}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Tipo de Funil
            </Button>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O tipo de funil será permanentemente removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
