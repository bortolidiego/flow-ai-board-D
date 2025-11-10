import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code, Eye } from "lucide-react";
import { buildAIFunctionSchema, generateExampleOutput } from "@/lib/promptBuilder";
import type { CustomField } from "@/lib/promptBuilder";

interface PromptPreviewProps {
  prompt: string;
  businessType: string;
  customFields: CustomField[];
}

export function PromptPreview({ prompt, businessType, customFields }: PromptPreviewProps) {
  const schema = buildAIFunctionSchema(customFields);
  const exampleOutput = generateExampleOutput(businessType, customFields);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="w-5 h-5" />
          Preview da Configuração
        </CardTitle>
        <CardDescription>
          Veja como o prompt será enviado à IA e o formato esperado de resposta
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="prompt" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="prompt">Prompt</TabsTrigger>
            <TabsTrigger value="schema">Schema</TabsTrigger>
            <TabsTrigger value="example">Exemplo</TabsTrigger>
          </TabsList>

          <TabsContent value="prompt" className="mt-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Code className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  Prompt que será enviado à IA
                </span>
              </div>
              <pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed">
                {prompt}
              </pre>
            </div>
          </TabsContent>

          <TabsContent value="schema" className="mt-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Code className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  Schema de extração de dados
                </span>
              </div>
              <pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">
                {JSON.stringify(schema, null, 2)}
              </pre>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              Este schema define quais campos a IA deve extrair e em qual formato
            </p>
          </TabsContent>

          <TabsContent value="example" className="mt-4">
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Code className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Exemplo de resposta da IA
                  </span>
                </div>
                <pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed">
                  {JSON.stringify(exampleOutput, null, 2)}
                </pre>
              </div>
              <p className="text-sm text-muted-foreground">
                Este é um exemplo do formato de dados que a IA retornará após analisar uma conversa
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
