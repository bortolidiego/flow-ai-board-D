import { useState } from 'react';
import { Plus, GripVertical, Trash2, Edit2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

interface Column {
  id: string;
  name: string;
  position: number;
}

interface PipelineStagesManagerProps {
  pipelineId: string;
  columns: Column[];
  onUpdate: () => void;
}

export function PipelineStagesManager({ pipelineId, columns, onUpdate }: PipelineStagesManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newStageName, setNewStageName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sortedColumns = [...columns].sort((a, b) => a.position - b.position);

  const handleAddStage = async () => {
    if (!newStageName.trim()) {
      toast.error('Nome da etapa não pode ser vazio');
      return;
    }

    setLoading(true);
    try {
      const maxPosition = Math.max(...columns.map(c => c.position), -1);
      const { error } = await supabase
        .from('columns')
        .insert({
          name: newStageName.trim(),
          pipeline_id: pipelineId,
          position: maxPosition + 1
        });

      if (error) throw error;

      toast.success('Etapa adicionada com sucesso');
      setNewStageName('');
      setIsAdding(false);
      onUpdate();
    } catch (error: any) {
      console.error('Error adding stage:', error);
      toast.error('Erro ao adicionar etapa');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStage = async (columnId: string) => {
    if (!editingName.trim()) {
      toast.error('Nome da etapa não pode ser vazio');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('columns')
        .update({ name: editingName.trim() })
        .eq('id', columnId);

      if (error) throw error;

      toast.success('Etapa atualizada com sucesso');
      setEditingId(null);
      setEditingName('');
      onUpdate();
    } catch (error: any) {
      console.error('Error updating stage:', error);
      toast.error('Erro ao atualizar etapa');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStage = async (columnId: string) => {
    setLoading(true);
    try {
      // Check if there are cards in this column
      const { data: cards, error: checkError } = await supabase
        .from('cards')
        .select('id')
        .eq('column_id', columnId)
        .limit(1);

      if (checkError) {
        console.error('Error checking cards:', checkError);
        throw checkError;
      }

      if (cards && cards.length > 0) {
        toast.error('Não é possível remover uma etapa com cards. Mova os cards primeiro.');
        setDeleteConfirm(null);
        setLoading(false);
        return;
      }

      console.log('Deleting column:', columnId);
      const { error } = await supabase
        .from('columns')
        .delete()
        .eq('id', columnId);

      if (error) {
        console.error('Error deleting column:', error);
        throw error;
      }

      console.log('Column deleted successfully');
      toast.success('Etapa removida com sucesso');
      setDeleteConfirm(null);
      onUpdate();
    } catch (error: any) {
      console.error('Error in handleDeleteStage:', error);
      toast.error(`Erro ao remover etapa: ${error.message || 'Erro desconhecido'}`);
      setDeleteConfirm(null);
    } finally {
      setLoading(false);
    }
  };

  const handleReorder = async (columnId: string, direction: 'up' | 'down') => {
    const currentIndex = sortedColumns.findIndex(c => c.id === columnId);
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === sortedColumns.length - 1)
    ) {
      return;
    }

    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const currentColumn = sortedColumns[currentIndex];
    const swapColumn = sortedColumns[swapIndex];

    setLoading(true);
    try {
      // Swap positions
      const { error: error1 } = await supabase
        .from('columns')
        .update({ position: swapColumn.position })
        .eq('id', currentColumn.id);

      const { error: error2 } = await supabase
        .from('columns')
        .update({ position: currentColumn.position })
        .eq('id', swapColumn.id);

      if (error1 || error2) throw error1 || error2;

      toast.success('Ordem atualizada com sucesso');
      onUpdate();
    } catch (error: any) {
      console.error('Error reordering stage:', error);
      toast.error('Erro ao reordenar etapa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Etapas da Pipeline</CardTitle>
          <CardDescription>
            Configure as etapas do seu funil de vendas. Os cards se moverão através destas etapas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {sortedColumns.map((column, index) => (
              <div
                key={column.id}
                className="flex items-center gap-2 p-3 border border-border rounded-lg bg-card hover:bg-accent/5 transition-colors"
              >
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleReorder(column.id, 'up')}
                    disabled={index === 0 || loading}
                  >
                    <GripVertical className="h-4 w-4 rotate-90" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleReorder(column.id, 'down')}
                    disabled={index === sortedColumns.length - 1 || loading}
                  >
                    <GripVertical className="h-4 w-4 -rotate-90" />
                  </Button>
                </div>

                {editingId === column.id ? (
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="flex-1"
                    placeholder="Nome da etapa"
                    disabled={loading}
                  />
                ) : (
                  <div className="flex-1">
                    <p className="font-medium">{column.name}</p>
                    <p className="text-xs text-muted-foreground">Posição {index + 1}</p>
                  </div>
                )}

                <div className="flex gap-1">
                  {editingId === column.id ? (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleUpdateStage(column.id)}
                        disabled={loading}
                      >
                        <Save className="h-4 w-4 text-primary" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingId(null);
                          setEditingName('');
                        }}
                        disabled={loading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingId(column.id);
                          setEditingName(column.name);
                        }}
                        disabled={loading}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteConfirm(column.id)}
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {isAdding ? (
            <div className="flex gap-2 p-3 border border-primary rounded-lg bg-primary/5">
              <Input
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                placeholder="Nome da nova etapa"
                className="flex-1"
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddStage();
                  if (e.key === 'Escape') {
                    setIsAdding(false);
                    setNewStageName('');
                  }
                }}
              />
              <Button onClick={handleAddStage} disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAdding(false);
                  setNewStageName('');
                }}
                disabled={loading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => setIsAdding(true)}
              variant="outline"
              className="w-full"
              disabled={loading}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Nova Etapa
            </Button>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A etapa será permanentemente removida.
              Certifique-se de que não há cards nesta etapa antes de removê-la.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDeleteStage(deleteConfirm)}
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
