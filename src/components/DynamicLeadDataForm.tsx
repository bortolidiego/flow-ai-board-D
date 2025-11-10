import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Save } from 'lucide-react';

interface CustomField {
  id: string;
  field_name: string;
  field_label: string;
  field_type: string;
  field_options?: any;
  is_required: boolean;
}

interface DynamicLeadDataFormProps {
  customFields: CustomField[];
  customFieldsData: Record<string, any>;
  leadData: any;
  onUpdate: (data: { leadData: any; customFieldsData: Record<string, any> }) => void;
}

export const DynamicLeadDataForm = ({
  customFields,
  customFieldsData,
  leadData,
  onUpdate,
}: DynamicLeadDataFormProps) => {
  const [formData, setFormData] = useState({
    full_name: '',
    cpf: '',
    email: '',
    phone: '',
    address: '',
    gender: '',
    birthday: '',
  });

  const [customData, setCustomData] = useState<Record<string, any>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (leadData) {
      setFormData({
        full_name: leadData.full_name || '',
        cpf: leadData.cpf || '',
        email: leadData.email || '',
        phone: leadData.phone || '',
        address: leadData.address || '',
        gender: leadData.gender || '',
        birthday: leadData.birthday || '',
      });
    }
    setCustomData(customFieldsData || {});
  }, [leadData, customFieldsData]);

  const handleStandardFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleCustomFieldChange = (fieldName: string, value: any) => {
    setCustomData(prev => ({ ...prev, [fieldName]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    onUpdate({
      leadData: formData,
      customFieldsData: customData,
    });
    setHasChanges(false);
  };

  const renderCustomField = (field: CustomField) => {
    const value = customData[field.field_name] || '';

    switch (field.field_type) {
      case 'text':
        return (
          <Input
            id={field.field_name}
            value={value}
            onChange={(e) => handleCustomFieldChange(field.field_name, e.target.value)}
            placeholder={`Digite ${field.field_label.toLowerCase()}`}
            required={field.is_required}
          />
        );

      case 'number':
        return (
          <Input
            id={field.field_name}
            type="number"
            value={value}
            onChange={(e) => handleCustomFieldChange(field.field_name, e.target.value)}
            placeholder={`Digite ${field.field_label.toLowerCase()}`}
            required={field.is_required}
          />
        );

      case 'date':
        return (
          <Input
            id={field.field_name}
            type="date"
            value={value}
            onChange={(e) => handleCustomFieldChange(field.field_name, e.target.value)}
            required={field.is_required}
          />
        );

      case 'textarea':
        return (
          <Textarea
            id={field.field_name}
            value={value}
            onChange={(e) => handleCustomFieldChange(field.field_name, e.target.value)}
            placeholder={`Digite ${field.field_label.toLowerCase()}`}
            required={field.is_required}
            rows={3}
          />
        );

      case 'select':
        const options = field.field_options?.options || [];
        return (
          <Select
            value={value}
            onValueChange={(val) => handleCustomFieldChange(field.field_name, val)}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Selecione ${field.field_label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'boolean':
        return (
          <Select
            value={value?.toString() || 'false'}
            onValueChange={(val) => handleCustomFieldChange(field.field_name, val === 'true')}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Sim</SelectItem>
              <SelectItem value="false">Não</SelectItem>
            </SelectContent>
          </Select>
        );

      default:
        return (
          <Input
            id={field.field_name}
            value={value}
            onChange={(e) => handleCustomFieldChange(field.field_name, e.target.value)}
            placeholder={`Digite ${field.field_label.toLowerCase()}`}
          />
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="w-5 h-5 text-primary" />
            Dados do Lead
          </CardTitle>
          {hasChanges && (
            <Button onClick={handleSave} size="sm" className="gap-2">
              <Save className="w-4 h-4" />
              Salvar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Campos Padrão */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground mb-3">Informações Básicas</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nome Completo</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => handleStandardFieldChange('full_name', e.target.value)}
                  placeholder="Digite o nome completo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  value={formData.cpf}
                  onChange={(e) => handleStandardFieldChange('cpf', e.target.value)}
                  placeholder="000.000.000-00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleStandardFieldChange('email', e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleStandardFieldChange('phone', e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Gênero</Label>
                <Input
                  id="gender"
                  value={formData.gender}
                  onChange={(e) => handleStandardFieldChange('gender', e.target.value)}
                  placeholder="Masculino/Feminino/Outro"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="birthday">Data de Nascimento</Label>
                <Input
                  id="birthday"
                  type="date"
                  value={formData.birthday}
                  onChange={(e) => handleStandardFieldChange('birthday', e.target.value)}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleStandardFieldChange('address', e.target.value)}
                  placeholder="Rua, número, bairro, cidade - estado"
                />
              </div>
            </div>
          </div>

          {/* Campos Customizados */}
          {customFields.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-3">
                Campos Personalizados
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customFields.map((field) => (
                  <div
                    key={field.id}
                    className={field.field_type === 'textarea' ? 'md:col-span-2' : ''}
                  >
                    <div className="space-y-2">
                      <Label htmlFor={field.field_name}>
                        {field.field_label}
                        {field.is_required && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      {renderCustomField(field)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};