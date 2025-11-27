import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface AddInstanceDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: (data: any) => Promise<void>;
}

export function AddInstanceDialog({ open, onClose, onSuccess }: AddInstanceDialogProps) {
    const [name, setName] = useState("");
    const [url, setUrl] = useState("");
    const [token, setToken] = useState("");
    const [pipelineId, setPipelineId] = useState("");
    const [pipelines, setPipelines] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            fetchPipelines();
        }
    }, [open]);

    const fetchPipelines = async () => {
        const { data } = await supabase.from('pipelines').select('id, name');
        if (data) setPipelines(data);
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await onSuccess({
                instanceName: name,
                uazapiBaseUrl: url,
                uazapiAdminToken: token,
                pipelineId
            });
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Adicionar Canal WhatsApp</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Nome da Instância</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Vendas Principal" />
                    </div>
                    <div className="space-y-2">
                        <Label>URL Base UAZAPI</Label>
                        <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://api.uazapi.com" />
                    </div>
                    <div className="space-y-2">
                        <Label>Admin Token (Opcional)</Label>
                        <Input value={token} onChange={e => setToken(e.target.value)} type="password" placeholder="Token de administrador" />
                    </div>
                    <div className="space-y-2">
                        <Label>Pipeline Associado</Label>
                        <Select value={pipelineId} onValueChange={setPipelineId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione um pipeline" />
                            </SelectTrigger>
                            <SelectContent>
                                {pipelines.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={loading || !name || !url || !pipelineId}>
                        {loading ? "Criando..." : "Criar Instância"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
