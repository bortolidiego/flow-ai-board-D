import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/hooks/useWorkspace';

interface ChatwootSidebarCreateCardProps {
    defaultTitle?: string;
    onCreate: (columnId: string, title: string) => Promise<any>;
    loading?: boolean;
}

export const ChatwootSidebarCreateCard = ({
    defaultTitle = '',
    onCreate,
    loading = false
}: ChatwootSidebarCreateCardProps) => {
    const { workspace } = useWorkspace();
    const [title, setTitle] = useState(defaultTitle);
    const [columnId, setColumnId] = useState<string>('');
    const [columns, setColumns] = useState<{ id: string; name: string }[]>([]);
    const [fetchingColumns, setFetchingColumns] = useState(false);

    useEffect(() => {
        const fetchColumns = async () => {
            if (!workspace) return;

            setFetchingColumns(true);
            try {
                // 1. Get Pipeline
                const { data: pipeline } = await supabase
                    .from('pipelines')
                    .select('id')
                    .eq('workspace_id', workspace.id)
                    .single();

                if (pipeline) {
                    // 2. Get Columns
                    const { data: cols } = await supabase
                        .from('columns')
                        .select('id, name, position')
                        .eq('pipeline_id', pipeline.id)
                        .order('position');

                    if (cols) {
                        setColumns(cols);
                        if (cols.length > 0) {
                            setColumnId(cols[0].id);
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching columns:', error);
            } finally {
                setFetchingColumns(false);
            }
        };

        fetchColumns();
    }, [workspace]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!columnId || !title.trim()) return;
        onCreate(columnId, title);
    };

    return (
        <Card className="w-full border-0 shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
                <CardTitle className="text-lg">Novo Card</CardTitle>
                <CardDescription>
                    Crie um card para este contato no Flow AI Board.
                </CardDescription>
            </CardHeader>
            <CardContent className="px-0 space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="title">Título do Card</Label>
                    <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Nome do Lead ou Negócio"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="column">Etapa do Funil</Label>
                    {fetchingColumns ? (
                        <div className="h-10 w-full animate-pulse bg-muted rounded-md" />
                    ) : (
                        <Select value={columnId} onValueChange={setColumnId}>
                            <SelectTrigger id="column">
                                <SelectValue placeholder="Selecione uma etapa" />
                            </SelectTrigger>
                            <SelectContent>
                                {columns.map((col) => (
                                    <SelectItem key={col.id} value={col.id}>
                                        {col.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>
            </CardContent>
            <CardFooter className="px-0">
                <Button
                    className="w-full gap-2"
                    onClick={handleSubmit}
                    disabled={loading || fetchingColumns || !columnId || !title.trim()}
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Criar Card
                </Button>
            </CardFooter>
        </Card>
    );
};
