import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Trash2, MoveRight } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Column {
  id: string;
  name: string;
}

interface BulkActionsBarProps {
  selectedCount: number;
  onCancel: () => void;
  onDelete: () => void;
  onTransfer: (columnId: string) => void;
  columns: Column[];
}

export const BulkActionsBar = ({
  selectedCount,
  onCancel,
  onDelete,
  onTransfer,
  columns,
}: BulkActionsBarProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const isMobile = useIsMobile();

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    onDelete();
    setShowDeleteDialog(false);
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 md:relative md:bottom-auto">
        <div className="bg-card/95 backdrop-blur-xl border-t md:border md:rounded-lg border-border/50 shadow-lg">
          <div className={cn("container mx-auto py-3", isMobile ? "px-3" : "px-4 md:px-6")}>
            <div className={cn("flex items-center gap-4", isMobile ? "flex-col" : "justify-between")}>
              <div className={cn("flex items-center gap-3", isMobile && "w-full justify-between")}>
                <Badge variant="default" className={cn("px-3 py-1", isMobile ? "text-base" : "text-sm")}>
                  {selectedCount} {selectedCount === 1 ? 'card selecionado' : 'cards selecionados'}
                </Badge>
                <Button
                  variant="ghost"
                  size={isMobile ? "default" : "sm"}
                  onClick={onCancel}
                  className="gap-2"
                >
                  <X className={cn(isMobile ? "w-5 h-5" : "w-4 h-4")} />
                  {isMobile ? "Cancelar" : <span className="hidden sm:inline">Cancelar</span>}
                </Button>
              </div>

              <div className={cn("flex items-center gap-2", isMobile && "w-full")}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size={isMobile ? "default" : "sm"} className={cn("gap-2", isMobile && "flex-1")}>
                      <MoveRight className={cn(isMobile ? "w-5 h-5" : "w-4 h-4")} />
                      Transferir
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {columns.map((column) => (
                      <DropdownMenuItem
                        key={column.id}
                        onClick={() => onTransfer(column.id)}
                      >
                        {column.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="destructive"
                  size={isMobile ? "default" : "sm"}
                  onClick={handleDelete}
                  className={cn("gap-2", isMobile && "flex-1")}
                >
                  <Trash2 className={cn(isMobile ? "w-5 h-5" : "w-4 h-4")} />
                  Excluir
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedCount} {selectedCount === 1 ? 'card' : 'cards'}?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
