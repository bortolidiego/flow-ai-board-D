import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChatwootSettings } from '@/components/ChatwootSettings';
import { EvolutionSettings } from '@/components/EvolutionSettings';
import { useWorkspace } from '@/hooks/useWorkspace';
import { MessageSquare, Zap } from 'lucide-react';

export default function Integrations() {
  const { workspace } = useWorkspace();
  const [activeTab, setActiveTab] = useState('chatwoot');

  if (!workspace) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-muted-foreground">Selecione um workspace primeiro</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Integrações</h1>
        <p className="text-muted-foreground">
          Configure integrações com plataformas externas para automatizar seu workflow
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="chatwoot" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Chatwoot
          </TabsTrigger>
          <TabsTrigger value="evolution" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Evolution API
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chatwoot" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Integração com Chatwoot
              </CardTitle>
              <CardDescription>
                Sincronize conversas do Chatwoot automaticamente como cards no seu Kanban
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChatwootSettings pipelineId={workspace.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evolution" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Integração com Evolution API
              </CardTitle>
              <CardDescription>
                Conecte seu WhatsApp via Evolution API para receber mensagens automaticamente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EvolutionSettings pipelineId={workspace.id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}