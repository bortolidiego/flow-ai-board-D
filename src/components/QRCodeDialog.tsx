import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Smartphone, CheckCircle, Loader } from "lucide-react";
import { whatsappService } from "@/services/whatsappService";

interface QRCodeDialogProps {
    instanceId: string | null;
    open: boolean;
    onClose: () => void;
}

export function QRCodeDialog({ instanceId, open, onClose }: QRCodeDialogProps) {
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [status, setStatus] = useState('waiting');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (open && instanceId) {
            fetchQRCode();
            interval = setInterval(checkStatus, 3000);
        } else {
            setQrCode(null);
            setStatus('waiting');
        }

        return () => clearInterval(interval);
    }, [open, instanceId]);

    const fetchQRCode = async () => {
        if (!instanceId) return;
        setLoading(true);
        try {
            const { data } = await whatsappService.getQRCode(instanceId);
            if (data?.base64 || data?.qrcode) {
                setQrCode(data.base64 || data.qrcode);
            }
        } catch (error) {
            console.error("Error fetching QR:", error);
        } finally {
            setLoading(false);
        }
    };

    const checkStatus = async () => {
        if (!instanceId) return;
        try {
            const { data } = await whatsappService.getQRCode(instanceId);
            if (data?.instance?.state === 'open' || data?.status === 'connected') {
                setStatus('connected');
                setTimeout(onClose, 2000);
            }
        } catch (e) {
            // ignore errors during polling
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Conectar WhatsApp</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col items-center gap-6 py-4">
                    {loading ? (
                        <div className="flex flex-col items-center gap-2">
                            <Loader className="w-8 h-8 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
                        </div>
                    ) : qrCode ? (
                        <div className="bg-white p-2 rounded-lg border shadow-sm">
                            <img src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`} alt="QR Code" className="w-64 h-64 object-contain" />
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">Aguardando QR Code...</p>
                    )}

                    <Alert>
                        <Smartphone className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                            1. Abra o WhatsApp no seu celular<br />
                            2. Toque em Mais opções (⋮) ou Configurações ⚙️<br />
                            3. Selecione <strong>Aparelhos conectados</strong><br />
                            4. Toque em <strong>Conectar um aparelho</strong><br />
                            5. Aponte a câmera para este código
                        </AlertDescription>
                    </Alert>

                    {status === 'connected' && (
                        <Alert className="bg-green-50 border-green-200 text-green-800">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertDescription>
                                WhatsApp conectado com sucesso!
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
