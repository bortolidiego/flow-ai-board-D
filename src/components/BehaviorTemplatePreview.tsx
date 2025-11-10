import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Database, Target, Brain } from 'lucide-react';

interface BehaviorTemplatePreviewProps {
  template: {
    name: string;
    description: string;
    config: {
      custom_fields: Array<{
        field_name: string;
        field_label: string;
        field_type: string;
        is_required: boolean;
      }>;
      funnel_types: Array<{
        funnel_type: string;
        funnel_name: string;
        color: string;
      }>;
      ai_config: {
        business_type: string;
        objectives: string[];
        analyze_on_close: boolean;
        analyze_on_message: boolean;
      };
    };
  };
}

export function BehaviorTemplatePreview({ template }: BehaviorTemplatePreviewProps) {
  const { config } = template;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Campos Personalizados
          </CardTitle>
          <CardDescription>
            {config.custom_fields.length} campos serão criados para captura de dados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {config.custom_fields.map((field, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{field.field_label}</span>
                    {field.is_required && (
                      <Badge variant="destructive" className="text-xs">Obrigatório</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Tipo: {field.field_type}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Funis
          </CardTitle>
          <CardDescription>
            {config.funnel_types.length} funis serão configurados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {config.funnel_types.map((funnel, index) => (
              <Badge
                key={index}
                style={{ backgroundColor: funnel.color }}
                className="text-white"
              >
                {funnel.funnel_name}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Configuração da IA
          </CardTitle>
          <CardDescription>
            Análise automática com inteligência artificial
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2 text-sm">Objetivos da Análise:</h4>
            <div className="flex flex-wrap gap-2">
              {config.ai_config.objectives.map((objective, index) => (
                <Badge key={index} variant="secondary">
                  {objective === 'extract_lead_data' && 'Extrair Dados'}
                  {objective === 'detect_funnel' && 'Detectar Funil'}
                  {objective === 'measure_quality' && 'Medir Qualidade'}
                  {objective === 'suggest_actions' && 'Sugerir Ações'}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Analisar ao fechar conversa:</span>
              <Badge variant={config.ai_config.analyze_on_close ? 'default' : 'outline'}>
                {config.ai_config.analyze_on_close ? 'Sim' : 'Não'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Analisar em cada mensagem:</span>
              <Badge variant={config.ai_config.analyze_on_message ? 'default' : 'outline'}>
                {config.ai_config.analyze_on_message ? 'Sim' : 'Não'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
