import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, MessageCircle } from "lucide-react";
import { WhatsAppInstanceCard } from "@/components/WhatsAppInstanceCard";
import { AddInstanceDialog } from "@/components/AddInstanceDialog";
import { QRCodeDialog } from "@/components/QRCodeDialog";
import { whatsappService, WhatsAppInstance } from "@/services/whatsappService";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function WhatsAppSetup() {
    const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
    const [showQRCode, setShowQRCode] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        fetchInstances();
    }, []);

    const fetchInstances = async () => {
        const { data, error } = await supabase.from('whatsapp_instances').select('*').order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching instances:", error);
            toast({ title: "Erro ao carregar instâncias", variant: "destructive" });
        } else {
            setInstances(data as WhatsAppInstance[]);
        }
    };

    const handleCreateInstance = async (data: any) => {
        const { error } = await whatsappService.createInstance(data);
        if (error) {
            toast({ title: "Erro ao criar instância", description: error.message, variant: "destructive" });
            throw error;
        } else {
            toast({ title: "Instância criada com sucesso!" });
            fetchInstances();
        }
    };

    const handleConnect = (instanceId: string) => {
        setSelectedInstanceId(instanceId);
        setShowQRCode(true);
    };

    const handleDisconnect = async (instanceId: string) => {
        const { error } = await whatsappService.disconnectInstance(instanceId);
        if (error) {
            toast({ title: "Erro ao desconectar", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Desconectado com sucesso" });
            fetchInstances();
        }
    };

    const handleDelete = async (instanceId: string) => {
        if (!confirm("Tem certeza que deseja excluir esta instância?")) return;

        const { error } = await whatsappService.deleteInstance(instanceId);
        if (error) {
            toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Instância excluída" });
            fetchInstances();
        }
    };

    return (
        <div className="h-full overflow-y-auto bg-gradient-to-br from-background via-background to-primary/5">
            <div className="container mx-auto px-6 py-8 max-w-6xl">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                            <MessageCircle className="w-8 h-8 text-green-500" />
                            Canais WhatsApp
                        </h1>
                        <p className="text-muted-foreground">
                            Gerencie suas conexões de WhatsApp para múltiplos canais de atendimento.
                        </p>
                    </div>
                    <Button onClick={() => setShowAddDialog(true)} className="bg-green-600 hover:bg-green-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Canal
                    </Button>
                </div>

                {instances.length === 0 ? (
                    <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                <MessageCircle className="w-8 h-8 text-green-600" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Nenhum canal conectado</h3>
                            <p className="text-muted-foreground max-w-sm mb-6">
                                Adicione seu primeiro canal de WhatsApp para começar a receber mensagens diretamente no quadro.
                            </p>
                            <Button onClick={() => setShowAddDialog(true)} variant="outline">
                                Adicionar Canal
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {instances.map(instance => (
                            <WhatsAppInstanceCard
                                key={instance.id}
                                instance={instance}
                                onConnect={() => handleConnect(instance.id)}
                                onDisconnect={() => handleDisconnect(instance.id)}
                                onDelete={() => handleDelete(instance.id)}
                            />
                        ))}
                    </div>
                )}

                <AddInstanceDialog
                    open={showAddDialog}
                    onClose={() => setShowAddDialog(false)}
                    onSuccess={handleCreateInstance}
                />

                <QRCodeDialog
                    open={showQRCode}
                    onClose={() => setShowQRCode(false)}
                    instanceId={selectedInstanceId}
                />
            </div>
        </div>
    );
}
