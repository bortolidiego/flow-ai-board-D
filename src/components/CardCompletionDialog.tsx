import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle, CheckCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CardCompletionDialogProps {
  cardId: string;
  pipelineId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: () => void;
}

export function CardCompletionDialog({ cardId, pipelineId, open, onOpenChange, onCompleted }: CardCompletionDialogProps) {
  const [completionType, setCompletionType] = useState<'won' | 'lost' | 'completed'>('completed');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleComplete = async () => {
    setLoading(true);
    try {
      // Buscar coluna "Finalizados"
      const { data: finalColumn } = await supabase
        .from('columns')
        .select('id')
        .eq('pipeline_id', pipelineId)
        .eq('name', 'Finalizados')
        .single();

      if (!finalColumn) {
        throw new Error('Coluna "Finalizados" não encontrada');
      }

      // Atualizar card
      const { error } = await supabase
        .from('cards')
        .update({
          column_id: finalColumn.id,
          completion_type: completionType,
          completion_reason: reason,
          completed_at: new Date().toISOString()
        })
        .eq('id', cardId);

      if (error) throw error;

      toast({
        title: 'Card finalizado!',
        description: `Card marcado como ${
          completionType === 'won' ? 'Ganho' : 
          completionType === 'lost' ? 'Perdido' : 
          'Concluído'
        }`,
      });

      onCompleted();
      onOpenChange(false);
      setReason(''); // Reset form
    } catch (error: any) {
      console.error('Error completing card:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível finalizar o card',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Finalizar Card</DialogTitle>
          <DialogDescription>
            Escolha como deseja finalizar este atendimento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup value={completionType} onValueChange={(v: any) => setCompletionType(v)}>
            <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted cursor-pointer">
              <RadioGroupItem value="won" id="won" />
              <Label htmlFor="won" className="flex items-center gap-2 cursor-pointer flex-1">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium">Ganho</p>
                  <p className="text-xs text-muted-foreground">Venda ou reparo concluído com sucesso</p>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted cursor-pointer">
              <RadioGroupItem value="lost" id="lost" />
              <Label htmlFor="lost" className="flex items-center gap-2 cursor-pointer flex-1">
                <XCircle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="font-medium">Perdido</p>
                  <p className="text-xs text-muted-foreground">Cliente desistiu ou não aprovou orçamento</p>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted cursor-pointer">
              <RadioGroupItem value="completed" id="completed" />
              <Label htmlFor="completed" className="flex items-center gap-2 cursor-pointer flex-1">
                <CheckCheck className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium">Concluído</p>
                  <p className="text-xs text-muted-foreground">Atendimento finalizado (dúvida, informação, etc)</p>
                </div>
              </Label>
            </div>
          </RadioGroup>

          <div className="space-y-2">
            <Label htmlFor="reason">
              {completionType === 'won' ? 'Detalhes da venda/conclusão' : 
               completionType === 'lost' ? 'Motivo da perda' : 
               'Observações finais'}
            </Label>
            <Textarea
              id="reason"
              placeholder={
                completionType === 'won' ? 'Ex: Cliente retirou aparelho, pagamento via PIX' :
                completionType === 'lost' ? 'Ex: Orçamento muito alto, cliente decidiu comprar novo' :
                'Ex: Dúvida sobre produto esclarecida por WhatsApp'
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleComplete} disabled={loading || !reason.trim()}>
            {loading ? 'Finalizando...' : 'Finalizar Card'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
