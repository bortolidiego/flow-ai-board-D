import React from 'react';
import { useProvisioning } from '@/hooks/useProvisioning';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useChatwootContext } from '@/hooks/useChatwootContext';

export function ProvisionGate({ children }: { children: React.ReactNode }) {
  const { isProvisioning, isProvisioned, isLoading } = useProvisioning();
  const { isChatwootFrame } = useChatwootContext();

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Se não está provisionado, mas é Chatwoot Frame, permitir (o sidebar lida com seus erros)
  if (!isProvisioned && isChatwootFrame) {
    return <>{children}</>;
  }

  // Se não está provisionando mas também não está provisionado, mostrar erro
  if (!isProvisioned) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-6">
        <div className="max-w-md mx-auto">
          <Alert className="border-destructive/50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Erro de Configuração</strong>
              <br />
              Não foi possível configurar o workspace automaticamente.
              Entre em contato com o administrador ou tente fazer login novamente.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}