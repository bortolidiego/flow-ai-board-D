import React from 'react';
import { useProvisioning } from '@/hooks/useProvisioning';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function ProvisionGate({ children }: { children: React.ReactNode }) {
  const { isProvisioning, isProvisioned } = useProvisioning();

  if (isProvisioning) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <h2 className="text-xl font-semibold mb-2">Configurando Workspace</h2>
          <p className="text-muted-foreground">
            Estamos configurando seu ambiente de trabalho. Isso pode levar alguns segundos...
          </p>
        </div>
      </div>
    );
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