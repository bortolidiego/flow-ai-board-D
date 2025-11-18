import { useEffect } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from '@/components/theme-provider';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { Loader2 } from 'lucide-react';

function AuthPage() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { userId, loading } = useUserRole();

  useEffect(() => {
    if (userId) {
      // Se o usuário estiver logado, redirecionar para a página principal
      navigate('/');
    }
  }, [userId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">Smart Kanban</h1>
          <p className="text-muted-foreground">Faça login para acessar seu painel.</p>
        </div>
        <Auth
          supabaseClient={supabase}
          providers={[]}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: 'hsl(var(--primary))',
                  brandAccent: 'hsl(var(--primary-foreground))',
                },
              },
            },
          }}
          theme={theme === 'dark' ? 'dark' : 'light'}
          redirectTo={window.location.origin + '/'}
        />
      </div>
    </div>
  );
}

export default AuthPage;