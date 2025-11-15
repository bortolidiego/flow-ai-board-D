import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'admin' | 'user';

export function useUserRole() {
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setRole(null);
          setUserId(null);
          setLoading(false);
          return;
        }

        setUserId(user.id);

        // Buscar todas as roles do usuário e decidir a principal
        const { data: roles, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching user role:', error);
          setRole('user'); // Default para user se houver erro
        } else if (roles && roles.length > 0) {
          const hasAdmin = roles.some((r: any) => r.role === 'admin');
          setRole(hasAdmin ? 'admin' : 'user');
        } else {
          // Se não tem role, criar como user
          const { error: insertError } = await supabase
            .from('user_roles')
            .insert({ user_id: user.id, role: 'user' });
          
          if (insertError) {
            console.error('Error creating user role:', insertError);
          }
          setRole('user');
        }
      } catch (error) {
        console.error('Error checking role:', error);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    checkRole();

    // Listener para mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkRole();
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAdmin = role === 'admin';
  const isUser = role === 'user';

  return { role, isAdmin, isUser, loading, userId };
}
