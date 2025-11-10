import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkInvite();
    checkAuth();
  }, [token]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const checkInvite = async () => {
    if (!token) {
      setError('Link de convite inválido');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('workspace_invites')
        .select('*, workspaces(name)')
        .eq('token', token)
        .eq('status', 'pending')
        .maybeSingle();

      if (error || !data) {
        setError('Convite não encontrado ou já utilizado');
        setLoading(false);
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setError('Este convite expirou');
        setLoading(false);
        return;
      }

      setInvite(data);
    } catch (err) {
      setError('Erro ao carregar convite');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!user) {
      navigate(`/auth?invite_token=${token}`);
      return;
    }

    setAccepting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('accept-invite', {
        body: { token },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast({
        title: 'Convite aceito!',
        description: `Você agora é membro de ${invite.workspaces.name}`,
      });

      navigate('/');
    } catch (err: any) {
      toast({
        title: 'Erro ao aceitar convite',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setAccepting(false);
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-2 text-primary">
            <CheckCircle className="w-6 h-6" />
            <CardTitle>Convite para Workspace</CardTitle>
          </div>
          <CardDescription>
            Você foi convidado para participar de <strong>{invite.workspaces.name}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="text-sm"><strong>Email:</strong> {invite.email}</p>
            <p className="text-sm"><strong>Permissão:</strong> {invite.role === 'admin' ? 'Administrador' : 'Usuário'}</p>
            <p className="text-sm"><strong>Expira em:</strong> {new Date(invite.expires_at).toLocaleDateString('pt-BR')}</p>
          </div>

          {user ? (
            <>
              <p className="text-sm text-muted-foreground">
                Conectado como <strong>{user.email}</strong>
              </p>
              {user.email?.toLowerCase() !== invite.email.toLowerCase() && (
                <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg">
                  <p className="text-sm text-destructive">
                    ⚠️ O email da sua conta não corresponde ao convite. 
                    Você precisa fazer login com <strong>{invite.email}</strong>
                  </p>
                </div>
              )}
              <Button 
                onClick={handleAcceptInvite} 
                disabled={accepting || user.email?.toLowerCase() !== invite.email.toLowerCase()}
                className="w-full"
              >
                {accepting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Aceitando...
                  </>
                ) : (
                  'Aceitar Convite'
                )}
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Você precisa estar logado para aceitar este convite.
              </p>
              <Button onClick={handleAcceptInvite} className="w-full">
                Fazer Login / Criar Conta
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
