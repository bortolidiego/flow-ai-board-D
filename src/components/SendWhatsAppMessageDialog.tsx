import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { whatsappService } from "@/services/whatsappService";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send } from "lucide-react";

interface SendWhatsAppMessageDialogProps {
    open: boolean;
    onClose: () => void;
    instanceId: string;
    chatId: string;
    contactName?: string;
}

export function SendWhatsAppMessageDialog({ open, onClose, instanceId, chatId, contactName }: SendWhatsAppMessageDialogProps) {
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);
    const { toast } = useToast();

    const handleSend = async () => {
        if (!message.trim()) return;

        setSending(true);
        try {
            const { error } = await whatsappService.sendMessage(instanceId, chatId, message);
            if (error) throw error;

            toast({ title: "Mensagem enviada com sucesso!" });
            setMessage("");
            onClose();
        } catch (error: any) {
            toast({
                title: "Erro ao enviar mensagem",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setSending(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Enviar Mensagem para {contactName || chatId}</DialogTitle>
                </DialogHeader>

                <div className="py-4">
                    <Textarea
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder="Digite sua mensagem..."
                        className="min-h-[100px]"
                    />
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSend} disabled={sending || !message.trim()}>
                        {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                        Enviar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
