import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Settings, Zap } from 'lucide-react';

export interface NewIntegrationData {
  instance_name: string;
  instance_alias: string;
  api_url: string;
  api_key: string;
  phone_number: string;
  auto_create_cards: boolean;
  analyze_messages: boolean;
}

interface EvolutionIntegrationFormProps {
  onSave: (data: NewIntegrationData) => Promise<void>;
  saving: boolean;
  webhookUrl: string;
}

export function EvolutionIntegrationForm({ onSave, saving, webhookUrl }: EvolutionIntegrationFormProps) {
  const [formData, setFormData] = useState<NewIntegrationData>({
    instance_name: '',
    instance_alias: '',
    api_url: '',
    api_key: '',
    phone_number: '',
    auto_create_cards: true,
    analyze_messages: true,
  });

  const handleSubmit = async () => {
    if (!formData.instance_name || !formData.api_url || !formData.api_key) {
      return;
    }

    await onSave(formData);

    // Reset form on success
    setFormData({
      instance_name: '',
      instance_alias: '',
      api_url: '',
      api_key: '',
      phone_number: '',
      auto_create_cards: true,
      analyze_messages: true,
    });
  };

  const isFormValid = formData.instance_name && formData.api_url && formData.api_key;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Adicionar Nova Instância
        </CardTitle>
        <CardDescription>
          Configure uma instância WhatsApp já sincronizada na sua Evolution API
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="instance_name">Nome da Instância *</Label>
            <Input
              id="instance_name"
              value={formData.instance_name}
              onChange={(e) => setFormData({...formData, instance_name: e.target.value})}
              placeholder="minha-instancia-whatsapp"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instance_alias">Nome de Exibição</Label>
            <Input
              id="instance_alias"
              value={formData.instance_alias}
              onChange={(e) => setFormData({...formData, instance_alias: e.target.value})}
              placeholder="WhatsApp Principal"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="api_url">URL da Evolution API *</Label>
            <Input
              id="api_url"
              value={formData.api_url}
              onChange={(e) => setFormData({...formData, api_url: e.target.value})}
              placeholder="https://evolution-api.exemplo.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="api_key">API Key *</Label>
            <Input
              id="api_key"
              type="password"
              value={formData.api_key}
              onChange={(e) => setFormData({...formData, api_key: e.target.value})}
              placeholder="Sua chave da Evolution API"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone_number">Número de Telefone (opcional)</Label>
          <Input
            id="phone_number"
            value={formData.phone_number}
            onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
            placeholder="5511999999999"
          />
          <p className="text-xs text-muted-foreground">
            Formato: código do país + DDD + número (ex: 5511999999999)
          </p>
        </div>

        <div className="border-t pt-4 space-y-4">
          <h4 className="font-medium">Configurações de Automação</h4>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Criar cards automaticamente</Label>
              <p className="text-sm text-muted-foreground">
                Nova mensagem = novo card no kanban
              </p>
            </div>
            <Switch
              checked={formData.auto_create_cards}
              onCheckedChange={(checked) => setFormData({...formData, auto_create_cards: checked})}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Analisar mensagens com IA</Label>
              <p className="text-sm text-muted-foreground">
                Usar inteligência artificial para extrair dados
              </p>
            </div>
            <Switch
              checked={formData.analyze_messages}
              onCheckedChange={(checked) => setFormData({...formData, analyze_messages: checked})}
            />
          </div>
        </div>

        <div className="bg-muted/50 border border-border/50 rounded-lg p-4 space-y-2">
          <h5 className="text-sm font-semibold flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Webhook Configuration
          </h5>
          <p className="text-xs text-muted-foreground">
            O webhook será configurado automaticamente na sua instância Evolution:
          </p>
          <code className="text-xs bg-background p-2 rounded block">
            {webhookUrl}/[pipeline_id]
          </code>
          <p className="text-xs text-muted-foreground">
            Eventos: messages.upsert, connection.update, messages.update
          </p>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={saving || !isFormValid}
          className="w-full"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Configurando...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              Configurar Instância
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}