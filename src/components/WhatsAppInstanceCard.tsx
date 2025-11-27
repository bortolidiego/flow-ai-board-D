import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader, AlertCircle, QrCode, Trash } from "lucide-react";
import { WhatsAppInstance } from "@/services/whatsappService";

interface WhatsAppInstanceCardProps {
    instance: WhatsAppInstance;
    onConnect: () => void;
    onDisconnect: () => void;
    onDelete: () => void;
}

export function WhatsAppInstanceCard({ instance, onConnect, onDisconnect, onDelete }: WhatsAppInstanceCardProps) {
    const statusConfig = {
        connected: { color: 'default', icon: CheckCircle, label: 'Conectado', className: 'bg-green-500 hover:bg-green-600' },
        disconnected: { color: 'secondary', icon: XCircle, label: 'Desconectado', className: 'bg-gray-500 hover:bg-gray-600 text-white' },
        connecting: { color: 'secondary', icon: Loader, label: 'Conectando...', className: 'bg-yellow-500 hover:bg-yellow-600 text-white' },
        error: { color: 'destructive', icon: AlertCircle, label: 'Erro', className: '' }
    };

    const status = statusConfig[instance.status] || statusConfig.disconnected;
    const StatusIcon = status.icon;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{instance.instance_name}</CardTitle>
                    <Badge className={status.className}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {status.label}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                {instance.phone_number ? (
                    <p className="text-sm text-muted-foreground mb-4">
                        📱 {instance.phone_number}
                    </p>
                ) : (
                    <p className="text-sm text-muted-foreground mb-4">
                        Nenhum número conectado
                    </p>
                )}

                <div className="flex gap-2">
                    {instance.status === 'disconnected' && (
                        <Button size="sm" onClick={onConnect} className="flex-1">
                            <QrCode className="w-4 h-4 mr-2" />
                            Conectar
                        </Button>
                    )}
                    {instance.status === 'connected' && (
                        <Button size="sm" variant="outline" onClick={onDisconnect} className="flex-1">
                            Desconectar
                        </Button>
                    )}
                    <Button size="sm" variant="destructive" onClick={onDelete}>
                        <Trash className="w-4 h-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
