import { useState } from 'react';
import { Card as KanbanCardType } from '@/hooks/useKanbanData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    ExternalLink,
    Save,
    Clock,
    DollarSign,
    AlertCircle,
    CheckCircle2,
    User,
    Tag
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ChatwootSidebarCardViewProps {
    card: KanbanCardType;
    onUpdate: (updates: Partial<KanbanCardType>) => Promise<void>;
    loading?: boolean;
    autoEdit?: boolean;
}

export const ChatwootSidebarCardView = ({
    card,
    onUpdate,
    loading = false,
    autoEdit = false
}: ChatwootSidebarCardViewProps) => {
    const [editing, setEditing] = useState(autoEdit);
    const [formData, setFormData] = useState({
        title: card.title,
        description: card.description,
        value: card.value || 0,
        priority: card.priority
    });

    const handleSave = async () => {
        await onUpdate({
            title: formData.title,
            description: formData.description,
            value: formData.value,
            priority: formData.priority
        });
        setEditing(false);
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'bg-red-100 text-red-800 border-red-200';
            case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* Header */}
            <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                    {editing ? (
                        <Input
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            className="font-semibold text-lg h-auto py-1 px-2"
                        />
                    ) : (
                        <h2 className="text-lg font-semibold leading-tight">{card.title}</h2>
                    )}

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => window.open(`${window.location.origin}/#/`, '_blank')}
                        title="Abrir no Board"
                    >
                        <ExternalLink className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={cn("capitalize", getPriorityColor(card.priority))}>
                        {card.priority === 'high' ? 'Alta' : card.priority === 'medium' ? 'Média' : 'Baixa'}
                    </Badge>

                    {card.value && card.value > 0 && (
                        <Badge variant="secondary" className="flex items-center gap-1 text-green-700 bg-green-50 border-green-200">
                            <DollarSign className="h-3 w-3" />
                            {formatCurrency(card.value)}
                        </Badge>
                    )}

                    {card.ai_suggested && (
                        <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-200">
                            IA
                        </Badge>
                    )}
                </div>
            </div>

            <Separator />

            {/* Content */}
            <ScrollArea className="flex-1 -mr-4 pr-4">
                <div className="space-y-4 pb-4">

                    {/* Quick Actions / Edit Mode */}
                    {editing ? (
                        <div className="space-y-3 bg-muted/30 p-3 rounded-lg border">
                            <div className="space-y-1">
                                <Label className="text-xs">Valor</Label>
                                <Input
                                    type="number"
                                    value={formData.value}
                                    onChange={e => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Prioridade</Label>
                                <select
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    value={formData.priority}
                                    onChange={e => setFormData({ ...formData, priority: e.target.value as any })}
                                >
                                    <option value="low">Baixa</option>
                                    <option value="medium">Média</option>
                                    <option value="high">Alta</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Descrição</Label>
                                <Textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Button size="sm" onClick={handleSave} disabled={loading} className="w-full">
                                    <Save className="w-4 h-4 mr-2" /> Salvar
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setEditing(false)} className="w-full">
                                    Cancelar
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Description */}
                            {card.description && (
                                <div className="text-sm text-muted-foreground bg-muted/20 p-3 rounded-md">
                                    {card.description}
                                </div>
                            )}

                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> Criado em
                                    </span>
                                    <p>{format(new Date(card.createdAt), "dd/MM/yyyy", { locale: ptBR })}</p>
                                </div>

                                {card.chatwootContactName && (
                                    <div className="space-y-1">
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <User className="w-3 h-3" /> Contato
                                        </span>
                                        <p className="truncate" title={card.chatwootContactName}>
                                            {card.chatwootContactName}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => setEditing(true)}
                            >
                                Editar Detalhes
                            </Button>
                        </div>
                    )}

                    {/* Timeline Preview (Static for now) */}
                    <div className="space-y-2 pt-2">
                        <h3 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                            <Clock className="w-3 h-3" /> Histórico Recente
                        </h3>
                        <div className="border-l-2 border-muted pl-3 space-y-3 py-1">
                            <div className="text-xs relative">
                                <div className="absolute -left-[17px] top-1 w-2 h-2 rounded-full bg-primary" />
                                <p className="font-medium">Card visualizado</p>
                                <p className="text-muted-foreground">Agora</p>
                            </div>
                            {card.lastActivityAt && (
                                <div className="text-xs relative">
                                    <div className="absolute -left-[17px] top-1 w-2 h-2 rounded-full bg-muted-foreground/30" />
                                    <p className="font-medium">Última atividade</p>
                                    <p className="text-muted-foreground">
                                        {format(new Date(card.lastActivityAt), "dd/MM HH:mm", { locale: ptBR })}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </ScrollArea>
        </div>
    );
};
