import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Save, X, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
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

interface CustomField {
  id: string;
  field_name: string;
  field_label: string;
  field_type: 'text' | 'number' | 'date' | 'select' | 'email' | 'phone';
  field_options?: any;
  is_required: boolean;
  position: number;
}

interface CustomFieldsManagerProps {
  pipelineId: string;
  onUpdate: () => void;
}

export function CustomFieldsManager({ pipelineId, onUpdate }: CustomFieldsManagerProps) {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    field_name: string;
    field_label: string;
    field_type: 'text' | 'number' | 'date' | 'select' | 'email' | 'phone';
    is_required: boolean;
    field_options: string;
  }>({
    field_name: '',
    field_label: '',
    field_type: 'text',
    is_required: false,
    field_options: '',
  });

  useEffect(() => {
    fetchFields();
  }, [pipelineId]);

  const fetchFields = async () => {
    const { data, error } = await supabase
      .from('pipeline_custom_fields')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .order('position');

    if (error) {
      console.error('Error fetching fields:', error);
      return;
    }

    setFields(data || []);
  };

  const handleSave = async () => {
    if (!formData.field_name.trim() || !formData.field_label.trim()) {
      toast.error('Nome e label do campo são obrigatórios');
      return;
    }

    setLoading(true);
    try {
      const fieldOptions = formData.field_type === 'select' && formData.field_options
        ? formData.field_options.split(',').map(o => o.trim()).filter(Boolean)
        : null;

      if (editingId) {
        const { error } = await supabase
          .from('pipeline_custom_fields')
          .update({
            field_name: formData.field_name.trim(),
            field_label: formData.field_label.trim(),
            field_type: formData.field_type,
            field_options: fieldOptions,
            is_required: formData.is_required,
          })
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Campo atualizado com sucesso');
      } else {
        const maxPosition = Math.max(...fields.map(f => f.position), -1);
        const { error } = await supabase
          .from('pipeline_custom_fields')
          .insert({
            pipeline_id: pipelineId,
            field_name: formData.field_name.trim(),
            field_label: formData.field_label.trim(),
            field_type: formData.field_type,
            field_options: fieldOptions,
            is_required: formData.is_required,
            position: maxPosition + 1,
          });

        if (error) throw error;
        toast.success('Campo adicionado com sucesso');
      }

      setFormData({
        field_name: '',
        field_label: '',
        field_type: 'text',
        is_required: false,
        field_options: '',
      });
      setIsAdding(false);
      setEditingId(null);
      fetchFields();
      onUpdate();
    } catch (error: any) {
      console.error('Error saving field:', error);
      toast.error(`Erro ao salvar campo: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (field: CustomField) => {
    setEditingId(field.id);
    setFormData({
      field_name: field.field_name,
      field_label: field.field_label,
      field_type: field.field_type,
      is_required: field.is_required,
      field_options: Array.isArray(field.field_options) ? field.field_options.join(', ') : '',
    });
    setIsAdding(true);
  };

  const handleDelete = async (fieldId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('pipeline_custom_fields')
        .delete()
        .eq('id', fieldId);

      if (error) throw error;

      toast.success('Campo removido com sucesso');
      setDeleteConfirm(null);
      fetchFields();
      onUpdate();
    } catch (error: any) {
      console.error('Error deleting field:', error);
      toast.error(`Erro ao remover campo: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReorder = async (fieldId: string, direction: 'up' | 'down') => {
    const currentIndex = fields.findIndex(f => f.id === fieldId);
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === fields.length - 1)
    ) {
      return;
    }

    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const currentField = fields[currentIndex];
    const swapField = fields[swapIndex];

    setLoading(true);
    try {
      await supabase
        .from('pipeline_custom_fields')
        .update({ position: swapField.position })
        .eq('id', currentField.id);

      await supabase
        .from('pipeline_custom_fields')
        .update({ position: currentField.position })
        .eq('id', swapField.id);

      toast.success('Ordem atualizada');
      fetchFields();
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
          <CardTitle>Campos Personalizados</CardTitle>
          <CardDescription>
            Configure campos adicionais que a IA deve extrair das conversas e exibir nos cards
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.length > 0 && (
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="flex items-center gap-2 p-3 border border-border rounded-lg bg-card hover:bg-accent/5"
                >
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleReorder(field.id, 'up')}
                      disabled={index === 0 || loading}
                    >
                      <GripVertical className="h-4 w-4 rotate-90" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleReorder(field.id, 'down')}
                      disabled={index === fields.length - 1 || loading}
                    >
                      <GripVertical className="h-4 w-4 -rotate-90" />
                    </Button>
                  </div>

                  <div className="flex-1">
                    <p className="font-medium">{field.field_label}</p>
                    <p className="text-xs text-muted-foreground">
                      {field.field_name} • {field.field_type}
                      {field.is_required && ' • obrigatório'}
                    </p>
                  </div>

                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(field)}
                      disabled={loading}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteConfirm(field.id)}
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
                  <Label htmlFor="field_name">Nome do Campo (API)</Label>
                  <Input
                    id="field_name"
                    value={formData.field_name}
                    onChange={(e) => setFormData({ ...formData, field_name: e.target.value })}
                    placeholder="ex: empresa"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="field_label">Label de Exibição</Label>
                  <Input
                    id="field_label"
                    value={formData.field_label}
                    onChange={(e) => setFormData({ ...formData, field_label: e.target.value })}
                    placeholder="ex: Empresa"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="field_type">Tipo do Campo</Label>
                  <Select
                    value={formData.field_type}
                    onValueChange={(value: 'text' | 'number' | 'date' | 'select' | 'email' | 'phone') => 
                      setFormData({ ...formData, field_type: value })
                    }
                    disabled={loading}
                  >
                    <SelectTrigger id="field_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Texto</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="phone">Telefone</SelectItem>
                      <SelectItem value="number">Número</SelectItem>
                      <SelectItem value="date">Data</SelectItem>
                      <SelectItem value="select">Seleção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.field_type === 'select' && (
                  <div className="space-y-2">
                    <Label htmlFor="field_options">Opções (separadas por vírgula)</Label>
                    <Input
                      id="field_options"
                      value={formData.field_options}
                      onChange={(e) => setFormData({ ...formData, field_options: e.target.value })}
                      placeholder="ex: Pequena, Média, Grande"
                      disabled={loading}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_required"
                  checked={formData.is_required}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_required: checked })}
                  disabled={loading}
                />
                <Label htmlFor="is_required">Campo obrigatório</Label>
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
                      field_name: '',
                      field_label: '',
                      field_type: 'text',
                      is_required: false,
                      field_options: '',
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
              Adicionar Campo Personalizado
            </Button>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O campo será permanentemente removido.
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
