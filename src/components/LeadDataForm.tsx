import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { User, Save } from 'lucide-react';

interface LeadDataFormProps {
  leadData: any;
  onUpdate: (data: any) => void;
}

export const LeadDataForm = ({ leadData, onUpdate }: LeadDataFormProps) => {
  const [formData, setFormData] = useState({
    full_name: '',
    cpf: '',
    email: '',
    phone: '',
    address: '',
    gender: '',
    birthday: '',
  });

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
  }, [leadData]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    onUpdate(formData);
    setHasChanges(false);
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nome Completo</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => handleChange('full_name', e.target.value)}
              placeholder="Digite o nome completo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input
              id="cpf"
              value={formData.cpf}
              onChange={(e) => handleChange('cpf', e.target.value)}
              placeholder="000.000.000-00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="email@exemplo.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender">Gênero</Label>
            <Input
              id="gender"
              value={formData.gender}
              onChange={(e) => handleChange('gender', e.target.value)}
              placeholder="Masculino/Feminino/Outro"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="birthday">Data de Nascimento</Label>
            <Input
              id="birthday"
              type="date"
              value={formData.birthday}
              onChange={(e) => handleChange('birthday', e.target.value)}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">Endereço</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="Rua, número, bairro, cidade - estado"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};