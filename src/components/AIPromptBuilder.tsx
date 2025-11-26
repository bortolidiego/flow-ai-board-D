import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShoppingCart, Briefcase, Home, Heart, GraduationCap,
  Headphones, Settings, AlertCircle, Check, Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  BUSINESS_TEMPLATES,
  OBJECTIVE_LABELS,
  OBJECTIVE_DESCRIPTIONS
} from "@/lib/promptTemplates";
import { buildPromptFromConfig, validatePromptConfig } from "@/lib/promptBuilder";
import type { CustomField, AIConfig } from "@/lib/promptBuilder";
import { PromptPreview } from "./PromptPreview";

interface AIPromptBuilderProps {
  pipelineId: string;
  customFields: CustomField[];
  onUpdate?: () => void;
}

const ICON_MAP: Record<string, any> = {
  ShoppingCart, Briefcase, Home, Heart, GraduationCap, Headphones, Settings
};

// Modelo padrão após a remoção do Gemini
const DEFAULT_MODEL = 'openai/gpt-4o-mini';

export function AIPromptBuilder({ pipelineId, customFields, onUpdate }: AIPromptBuilderProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<AIConfig>({
    business_type: 'custom',
    objectives: [],
    use_custom_prompt: false
  });
  const [customPrompt, setCustomPrompt] = useState('');
  const [openrouterApiKey, setOpenrouterApiKey] = useState('');
  const [modelName, setModelName] = useState(DEFAULT_MODEL);
  const [transcriptionModel, setTranscriptionModel] = useState('openai/whisper-1');
  const [analyzeOnMessage, setAnalyzeOnMessage] = useState(true);
  const [analyzeOnClose, setAnalyzeOnClose] = useState(true);

  useEffect(() => {
    loadConfig();
  }, [pipelineId]);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('pipeline_ai_config')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConfig({
          business_type: data.business_type || 'custom',
          objectives: data.objectives || [],
          custom_prompt: data.custom_prompt || undefined,
          use_custom_prompt: data.use_custom_prompt || false
        });
        setCustomPrompt(data.custom_prompt || '');

        // Carregar modelo de análise
        const loadedModel = data.model_name || DEFAULT_MODEL;
        setModelName(loadedModel);

        // Carregar modelo de transcrição
        const loadedTranscriptionModel = data.transcription_model || 'openai/whisper-1';
        setTranscriptionModel(loadedTranscriptionModel);

        // Carregar API key do OpenRouter (se existir)
        const loadedApiKey = data.openrouter_api_key || '';
        setOpenrouterApiKey(loadedApiKey);

        setAnalyzeOnMessage(data.analyze_on_message ?? true);
        setAnalyzeOnClose(data.analyze_on_close ?? true);
      } else {
        // Cria configuração padrão
        await createDefaultConfig();
      }
    } catch (error) {
      console.error('Error loading AI config:', error);
      toast.error('Erro ao carregar configuração da IA');
    } finally {
      setLoading(false);
    }
  };

  const createDefaultConfig = async () => {
    try {
      const generatedPrompt = buildPromptFromConfig(config, customFields);

      const { error } = await supabase
        .from('pipeline_ai_config')
        .insert({
          pipeline_id: pipelineId,
          business_type: 'custom',
          objectives: [],
          generated_prompt: generatedPrompt,
          model_name: DEFAULT_MODEL,
          analyze_on_message: true,
          analyze_on_close: true
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error creating default config:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Validar que a API key foi configurada
      if (!openrouterApiKey || openrouterApiKey.trim() === '') {
        toast.error('Chave API do OpenRouter é obrigatória');
        setSaving(false);
        return;
      }

      const generatedPrompt = buildPromptFromConfig(config, customFields);

      const { error } = await supabase
        .from('pipeline_ai_config')
        .upsert({
          pipeline_id: pipelineId,
          business_type: config.business_type,
          objectives: config.objectives,
          generated_prompt: generatedPrompt,
          custom_prompt: config.use_custom_prompt ? customPrompt : null,
          use_custom_prompt: config.use_custom_prompt,
          openrouter_api_key: openrouterApiKey,
          model_name: modelName,
          transcription_model: transcriptionModel,
          analyze_on_message: analyzeOnMessage,
          analyze_on_close: analyzeOnClose,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'pipeline_id'
        });

      if (error) throw error;

      toast.success('Configuração da IA salva com sucesso!');
      onUpdate?.();
    } catch (error) {
      console.error('Error saving AI config:', error);
      toast.error('Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = BUSINESS_TEMPLATES[templateId];
    setConfig({
      ...config,
      business_type: templateId,
      objectives: template.defaultObjectives
    });
  };

  const toggleObjective = (objectiveId: string) => {
    const newObjectives = config.objectives.includes(objectiveId)
      ? config.objectives.filter(id => id !== objectiveId)
      : [...config.objectives, objectiveId];

    setConfig({ ...config, objectives: newObjectives });
  };

  const validation = validatePromptConfig(config, customFields);
  const generatedPrompt = config.use_custom_prompt
    ? customPrompt
    : buildPromptFromConfig(config, customFields);

  const currentTemplate = BUSINESS_TEMPLATES[config.business_type];
  const availableObjectives = Object.keys(OBJECTIVE_LABELS);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="template" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="template">Tipo de Negócio</TabsTrigger>
          <TabsTrigger value="objectives">Objetivos</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="template" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Selecione o Tipo de Negócio</CardTitle>
              <CardDescription>
                Escolha o template que melhor se adequa ao seu negócio.
                Cada template vem com prompts otimizados.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.values(BUSINESS_TEMPLATES).map(template => {
                  const Icon = ICON_MAP[template.icon] || Settings;
                  const isSelected = config.business_type === template.id;

                  return (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateSelect(template.id)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className={`w-5 h-5 mt-1 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div className="flex-1">
                          <h3 className="font-semibold flex items-center gap-2">
                            {template.name}
                            {isSelected && <Check className="w-4 h-4 text-primary" />}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {template.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="objectives" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Objetivos da Análise</CardTitle>
              <CardDescription>
                Selecione o que você deseja que a IA identifique nas conversas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {availableObjectives.map(objId => (
                  <div key={objId} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <Checkbox
                      id={objId}
                      checked={config.objectives.includes(objId)}
                      onCheckedChange={() => toggleObjective(objId)}
                    />
                    <div className="flex-1">
                      <label
                        htmlFor={objId}
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        {OBJECTIVE_LABELS[objId]}
                      </label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {OBJECTIVE_DESCRIPTIONS[objId]}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurações Avançadas</CardTitle>
              <CardDescription>
                Ajuste o modelo de IA e quando a análise deve ser executada
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  Chave API do OpenRouter
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="password"
                  value={openrouterApiKey}
                  onChange={(e) => setOpenrouterApiKey(e.target.value)}
                  placeholder="sk-or-v1-..."
                  className="font-mono"
                  required
                />
                <p className="text-sm text-muted-foreground">
                  <strong>Obrigatório.</strong> Obtenha sua chave em{' '}
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    openrouter.ai/keys
                  </a>
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Modelo para Análise de Conversas</Label>
                  <Input
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    placeholder="openai/gpt-4o-mini"
                    className="font-mono"
                  />
                  <p className="text-sm text-muted-foreground">
                    Formato: <code>provedor/nome-do-modelo</code>
                    <br />
                    Exemplos: openai/gpt-4o-mini, anthropic/claude-3.5-sonnet, google/gemini-2.0-flash-exp
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Modelo para Transcrição de Áudio</Label>
                  <Input
                    value={transcriptionModel}
                    onChange={(e) => setTranscriptionModel(e.target.value)}
                    placeholder="openai/whisper-1"
                    className="font-mono"
                  />
                  <p className="text-sm text-muted-foreground">
                    Modelo OpenRouter para transcrição de áudios do Chatwoot
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Analisar a cada mensagem</Label>
                    <p className="text-sm text-muted-foreground">
                      IA analisa automaticamente quando novas mensagens chegam
                    </p>
                  </div>
                  <Switch
                    checked={analyzeOnMessage}
                    onCheckedChange={setAnalyzeOnMessage}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Analisar ao fechar conversa</Label>
                    <p className="text-sm text-muted-foreground">
                      IA faz análise final quando a conversa é fechada
                    </p>
                  </div>
                  <Switch
                    checked={analyzeOnClose}
                    onCheckedChange={setAnalyzeOnClose}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Modo Avançado</Label>
                  <Switch
                    checked={config.use_custom_prompt}
                    onCheckedChange={(checked) =>
                      setConfig({ ...config, use_custom_prompt: checked })
                    }
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Ative para editar o prompt manualmente (apenas para usuários avançados)
                </p>
              </div>

              {config.use_custom_prompt && (
                <div className="space-y-2">
                  <Label>Prompt Customizado</Label>
                  <Textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Digite seu prompt personalizado..."
                    className="min-h-[200px] font-mono text-sm"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {validation.warnings.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {validation.warnings.map((warning, idx) => (
                <li key={idx} className="text-sm">{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <PromptPreview
        prompt={generatedPrompt}
        businessType={config.business_type}
        customFields={customFields}
      />

      <div className="flex justify-end gap-2">
        <Button
          onClick={handleSave}
          disabled={saving || !validation.valid}
          className="gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Salvando...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Salvar Configuração
            </>
          )}
        </Button>
      </div>
    </div>
  );
}