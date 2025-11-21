import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Lock, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function UpdatePassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const accessToken = searchParams.get('access_token');
  const refreshToken = searchParams.get('refresh_token');
  const inviteToken = searchParams.get('invite_token'); // Token do nosso convite
  
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    // 1. Tenta autenticar o usuário usando os tokens da URL
    const handleAuth = async () => {
      if (!accessToken || !refreshToken) {
        setError('Link de redefinição inválido ou expirado.');
        setLoading(false);
        return;
      }

      try {
        // Define a sessão usando os tokens da URL
        const { data, error: setSessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (setSessionError || !data.user) {
          throw new Error(setSessionError?.message || 'Falha ao autenticar sessão.');
        }
        
        setUserEmail(data.user.email);
        setLoading(false);
      } catch (err: any) {
        console.error('Auth error:', err);
        setError(err.message || 'Erro ao autenticar. Tente novamente ou solicite um novo convite.');
        setLoading(false);
      }
    };

    handleAuth();
  }, [accessToken, refreshToken]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // 2. Atualiza a senha do usuário logado
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) throw updateError;

      toast({
        title: 'Senha atualizada!',
        description: 'Sua senha foi definida com sucesso.',
      });

      // 3. Redireciona para a página de aceitação do convite (se houver token)
      if (inviteToken) {
        navigate(`/accept-invite?token=${inviteToken}`, { replace: true });
      } else {
        navigate('/', { replace: true });
      }

    } catch (err: any) {
      console.error('Update password error:', err);
      setError(err.message || 'Erro ao atualizar senha.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-6 h-6" />
              <CardTitle>Erro de Autenticação</CardTitle>
            </div>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/auth')} className="w-full">
              Ir para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Lock className="w-8 h-8 text-primary" />
            <CardTitle className="text-2xl">Definir Nova Senha</CardTitle>
          </div>
          <CardDescription>
            Defina sua senha para o email <strong>{userEmail}</strong> e aceite o convite.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Senha</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Atualizando...
                </>
              ) : (
                'Atualizar Senha e Continuar'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}