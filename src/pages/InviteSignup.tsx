import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Mail, Lock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function InviteSignup() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteDetails, setInviteDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Token de convite ausente.');
      setLoading(false);
      return;
    }
    
    // 1. Tenta buscar o convite para preencher o email e verificar validade
    const fetchInviteDetails = async () => {
      try {
        // Usamos o client anon key para buscar o convite (RLS permite SELECT true)
        const { data, error } = await supabase
          .from('workspace_invites')
          .select('email, workspaces(name)')
          .eq('token', token)
          .eq('status', 'pending')
          .maybeSingle();

        if (error || !data) {
          setError('Convite inválido ou expirado.');
          return;
        }
        
        setInviteDetails(data);
      } catch (err) {
        setError('Erro ao carregar detalhes do convite.');
      } finally {
        setLoading(false);
      }
    };

    fetchInviteDetails();
  }, [token]);

  const handleSetPassword = async (e: React.FormEvent) => {
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
      // 2. Usa o token para criar a senha e logar o usuário
      // O Supabase trata o token de convite como um token de confirmação de email/cadastro
      const { data: { session }, error: updateError } = await supabase.auth.signInWithPassword({
        email: inviteDetails.email,
        password: password,
      });

      if (updateError) {
        // Se falhar, tenta fazer o signup (caso o usuário não exista no auth.users ainda)
        const { error: signupError } = await supabase.auth.signUp({
            email: inviteDetails.email,
            password: password,
            options: {
                emailRedirectTo: `${window.location.origin}/#/accept-invite?token=${token}`,
            }
        });

        if (signupError) throw signupError;
        
        // Se o signup for bem-sucedido, o usuário receberá um email de confirmação
        // e será redirecionado para a página de aceitação após clicar no link do email.
        toast({
            title: 'Cadastro iniciado!',
            description: 'Verifique seu email para confirmar o cadastro e aceitar o convite.',
        });
        
        // Redireciona para a página de login para aguardar a confirmação
        navigate('/auth');
        return;
      }

      // 3. Se o login for bem-sucedido (usuário já existia ou foi criado/confirmado),
      // automaticamente aceita o convite.
      if (session) {
        const response = await supabase.functions.invoke('accept-invite', {
          body: { token },
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        toast({
          title: 'Convite aceito!',
          description: `Você agora é membro de ${inviteDetails.workspaces?.name}`,
        });

        navigate('/');
      }

    } catch (err: any) {
      console.error('Error setting password/accepting invite:', err);
      setError(err.message || 'Erro desconhecido ao finalizar o cadastro.');
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

  if (error && !inviteDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="w-6 h-6" />
              <CardTitle>Convite Inválido</CardTitle>
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
            <CardTitle className="text-2xl">Finalizar Cadastro</CardTitle>
          </div>
          <CardDescription>
            Crie sua senha para aceitar o convite para o workspace <strong>{inviteDetails?.workspaces?.name}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={inviteDetails?.email || ''}
                readOnly
                className="bg-muted/50"
              />
            </div>
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
                  Finalizando...
                </>
              ) : (
                'Criar Senha e Aceitar Convite'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}