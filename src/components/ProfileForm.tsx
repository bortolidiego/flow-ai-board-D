import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, User, Mail, Lock, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { TablesInsert } from '@/integrations/supabase/types';

// Definindo um tipo local para contornar o erro de tipagem do Supabase
type ProfileInsert = {
  id: string;
  full_name: string;
};

export function ProfileForm() {
  const { userId, fullName, loading: userLoading } = useUserRole();
  const { toast } = useToast();
  
  const [email, setEmail] = useState('');
  const [currentFullName, setCurrentFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || '');
        setCurrentFullName(fullName || user.email || '');
      }
    };
    if (!userLoading) {
      loadUserData();
    }
  }, [userLoading, fullName]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);

    try {
      if (!userId) throw new Error('Usuário não autenticado');

      // 1. Atualizar nome completo no perfil
      const profileUpdate: ProfileInsert = { 
        id: userId, 
        full_name: currentFullName 
      };
      
      const { error: profileError } = await supabase
        .from('profiles' as any)
        .upsert(profileUpdate, { onConflict: 'id' });

      if (profileError) throw profileError;

      // 2. Atualizar email (se mudou)
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser?.email !== email) {
        // Forçando o tipo 'any' para incluir email_redirect_to, que é a forma correta de passar
        // o parâmetro para o Supabase, apesar da tipagem do SDK estar incorreta/desatualizada.
        const { error: emailError } = await supabase.auth.updateUser({ 
          email,
          email_redirect_to: `${window.location.origin}/#`
        } as any);
        
        if (emailError) {
          // Tratamento específico para o erro de email já registrado
          if (emailError.message.includes('A user with this email address has already been registered')) {
            throw new Error('Este e-mail já está em uso por outra conta. Por favor, use um e-mail diferente.');
          }
          throw emailError;
        }
        
        toast({
          title: 'Email atualizado',
          description: 'Verifique sua caixa de entrada para confirmar o novo email.',
          variant: 'default'
        });
      }

      toast({
        title: 'Perfil atualizado',
        description: 'Seu nome completo foi salvo.',
      });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Erro ao atualizar perfil',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({
        title: 'Senha muito curta',
        description: 'A senha deve ter pelo menos 6 caracteres.',
        variant: 'destructive',
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Senhas não coincidem',
        description: 'A nova senha e a confirmação devem ser iguais.',
        variant: 'destructive',
      });
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) throw error;

      toast({
        title: 'Senha atualizada',
        description: 'Sua senha foi alterada com sucesso.',
      });
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast({
        title: 'Erro ao atualizar senha',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSavingPassword(false);
    }
  };

  if (userLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Informações Básicas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Informações do Perfil
          </CardTitle>
          <CardDescription>
            Atualize seu nome completo e email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Nome Completo
              </Label>
              <Input
                id="full_name"
                value={currentFullName}
                onChange={(e) => setCurrentFullName(e.target.value)}
                placeholder="Seu nome completo"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
              <p className="text-xs text-muted-foreground">
                Atenção: Mudar o email requer confirmação por link enviado para o novo endereço.
              </p>
            </div>
            <Button type="submit" disabled={savingProfile} className="gap-2">
              <Save className="w-4 h-4" />
              {savingProfile ? 'Salvando...' : 'Salvar Perfil'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Atualização de Senha */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-secondary" />
            Alterar Senha
          </CardTitle>
          <CardDescription>
            Use um mínimo de 6 caracteres.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova Senha</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <Button type="submit" disabled={savingPassword} variant="secondary" className="gap-2">
              <Lock className="w-4 h-4" />
              {savingPassword ? 'Atualizando...' : 'Alterar Senha'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}