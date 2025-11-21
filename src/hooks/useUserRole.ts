import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

export type AppRole = 'admin' | 'user';

export function useUserRole() {
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setRole(null);
          setUserId(null);
          setFullName(null);
          setLoading(false);
          return;
        }

        setUserId(user.id);

        // 1. Buscar Perfil (nome completo)
        const { data: profile, error: profileError } = await supabase
          .from('profiles' as any)
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Error fetching user profile:', profileError);
        }
        
        // Usar a tipagem correta para acessar full_name
        // Forçando 'any' para resolver o erro de tipagem do Supabase (Erro 1 e 2)
        const profileRow = profile as any; 
        setFullName(profileRow?.full_name || user.email); // Fallback para email

        // 2. Buscar Roles
        const { data: roles, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (rolesError) {
          console.error('Error fetching user role:', rolesError);
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
        setFullName(null);
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

  return { role, isAdmin, isUser, loading, userId, fullName };
}