import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error!} retry={this.handleRetry} />;
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-6">
          <div className="max-w-md mx-auto">
            <Alert className="border-destructive/50">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Algo deu errado</AlertTitle>
              <AlertDescription className="mt-2">
                <p className="mb-4">
                  Ocorreu um erro inesperado na aplicação. 
                  Isso pode ser causado por problemas de conectividade ou configuração.
                </p>
                
                {this.state.error && (
                  <details className="mb-4">
                    <summary className="cursor-pointer text-sm font-medium">
                      Detalhes técnicos
                    </summary>
                    <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                      {this.state.error.message}
                      {this.state.error.stack && (
                        <>\n\n{this.state.error.stack}</>
                      )}
                    </pre>
                  </details>
                )}

                <Button onClick={this.handleRetry} className="w-full gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Tentar Novamente
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}