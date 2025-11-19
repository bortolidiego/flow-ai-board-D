import { Button } from '@/components/ui/button';
import { SavedView } from '@/types/kanbanFilters';
import { X, Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface QuickFilterBarProps {
  savedViews: SavedView[];
  loadView: (id: string) => void;
  deleteView: (id: string) => void;
  isMobile: boolean;
}

export function QuickFilterBar({ savedViews, loadView, deleteView, isMobile }: QuickFilterBarProps) {
  if (savedViews.length === 0) {
    return (
      <div className="py-2 text-xs text-muted-foreground italic flex items-center gap-2">
        <Bookmark className="w-3 h-3" />
        Seus filtros salvos aparecerão aqui
      </div>
    );
  }

  return (
    <div className={cn(
      "flex gap-2 items-center overflow-x-auto pb-2 scrollbar-thin", 
      isMobile ? "flex-wrap" : "flex-nowrap"
    )}>
      <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">Filtros Salvos:</span>
      
      {savedViews.map(view => (
        <div key={view.id} className="group relative flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadView(view.id)}
            className={cn(
              "h-7 text-xs pr-7 border-dashed hover:border-solid hover:border-primary/50 transition-all", 
              "bg-background hover:bg-accent"
            )}
          >
            {view.name}
          </Button>
          <div 
            onClick={(e) => {
              e.stopPropagation();
              deleteView(view.id);
            }}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-1 cursor-pointer hover:bg-destructive/10 rounded-full transition-colors"
          >
            <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
          </div>
        </div>
      ))}
    </div>
  );
}