import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, ExternalLink, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function ChatwootSetup() {
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);
  
  const appUrl = window.location.origin + window.location.pathname;
  
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast({
      title: 'Copiado!',
      description: `${label} copiado para a área de transferência.`,
    });
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Configuração do Chatwoot Dashboard App</h1>
          <p className="text-muted-foreground">
            Siga os passos abaixo para integrar este Kanban como um Dashboard App no Chatwoot
          </p>
        </div>

        <div className="space-y-6">
          {/* Passo 1: Acessar Configurações */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge className="bg-primary">Passo 1</Badge>
                <CardTitle className="text-lg">Acessar Configurações do Chatwoot</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Faça login no seu Chatwoot como <strong>Administrador</strong></li>
                <li>Clique em <strong>Settings</strong> (Configurações) no menu lateral</li>
                <li>Navegue até <strong>Applications → Dashboard Apps</strong></li>
                <li>Clique em <strong>+ Add a new dashboard app</strong></li>
              </ol>
            </CardContent>
          </Card>

          {/* Passo 2: Configurar o Dashboard App */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge className="bg-primary">Passo 2</Badge>
                <CardTitle className="text-lg">Preencher Dados do Dashboard App</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">App Name:</span>
                  <Badge variant="outline">Smart Kanban CRM</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Nome que aparecerá na aba do Chatwoot
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">Content URL:</span>
                  <div className="flex items-center gap-2">
                    <Input 
                      value={appUrl} 
                      readOnly 
                      className="font-mono text-xs w-[300px]"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(appUrl, 'URL')}
                    >
                      {copied === 'URL' ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Esta é a URL do seu app que será carregada no iframe do Chatwoot.
                    <strong> Certifique-se de usar HTTPS em produção!</strong>
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>

          {/* Passo 3: Configurações Avançadas */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge className="bg-primary">Passo 3</Badge>
                <CardTitle className="text-lg">Configurações Avançadas (Opcional)</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Enable for all inboxes</p>
                    <p className="text-xs text-muted-foreground">
                      Marque esta opção para que o app apareça em todas as conversas
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Show in sidebar</p>
                    <p className="text-xs text-muted-foreground">
                      Marque para exibir o app como uma aba lateral na conversa
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Passo 4: Salvar e Testar */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge className="bg-primary">Passo 4</Badge>
                <CardTitle className="text-lg">Salvar e Testar</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Clique em <strong>Create</strong> para salvar o Dashboard App</li>
                <li>Abra qualquer conversa no Chatwoot</li>
                <li>Procure pela nova aba <strong>"Smart Kanban CRM"</strong> no painel lateral</li>
                <li>O app deve carregar automaticamente com o contexto da conversa</li>
              </ol>

              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Importante:</strong> Se o app não aparecer, verifique:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Se a URL está acessível (teste abrindo em uma nova aba)</li>
                    <li>Se você marcou "Enable for all inboxes"</li>
                    <li>Se há erros no console do navegador (F12)</li>
                    <li>Se o Chatwoot está na mesma rede/domínio (CORS)</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Recursos Adicionais */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recursos e Documentação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => window.open('https://www.chatwoot.com/docs/product/dashboard-apps', '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Documentação Oficial do Chatwoot Dashboard Apps
              </Button>

              <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg">
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  💡 <strong>Dica:</strong> O app detecta automaticamente quando está rodando dentro do Chatwoot
                  e filtra os cards pela conversa ativa, facilitando o atendimento.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}