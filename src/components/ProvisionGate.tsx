import React from 'react';
import { useProvisioning } from '@/hooks/useProvisioning';
import { Loader2 } from 'lucide-react';

export function ProvisionGate({ children }: { children: React.ReactNode }) {
  const { isProvisioning, isProvisioned } = useProvisioning();

  if (isProvisioning || !isProvisioned) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Verificando e provisionando workspace...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}