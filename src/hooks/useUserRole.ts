import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

export type AppRole = 'admin' | 'user';

export function useUserRole() {
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const checkRole = async () => {
      try {
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth timeout')), 10000)
        );

        const authPromise = supabase.auth.getUser();
        
        const { data: { user }, error: authError } = await Promise.race([
          authPromise,
          timeoutPromise
        ]) as any;

        if (authError) {
          console.warn('Auth error in useUserRole:', authError);
          setAuthError(authError.message);
          setRole(null);
          setUserId(null);
          setFullName(null);
          setLoading(false);
          return;
        }

        if (!user) {
          setRole(null);
          setUserId(null);
          setFullName(null);
          setLoading(false);
          return;
        }

        setUserId(user.id);
        setAuthError(null);

        // 1. Buscar Perfil (nome completo) com timeout
        try {
          const profilePromise = supabase
            .from('profiles' as any)
            .select('full_name')
            .eq('id', user.id)
            .maybeSingle();

          const profileTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
          );

          const { data: profile, error: profileError } = await Promise.race([
            profilePromise,
            profileTimeout
          ]) as any;

          if (profileError && profileError.code !== 'PGRST116') {
            console.warn('Profile fetch error:', profileError);
          }
          
          // Usar a tipagem correta para acessar full_name
          // Forçando 'any' para resolver o erro de tipagem do Supabase (Erro 1 e 2)
          const profileRow = profile as any; 
          setFullName(profileRow?.full_name || user.email); // Fallback para email
        } catch (profileTimeoutError) {
          console.warn('Profile fetch timed out, using fallback');
          setFullName(user.email);
        }

        // 2. Buscar Roles com timeout
        try {
          const rolesPromise = supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id);

          const rolesTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Roles fetch timeout')), 5000)
          );

          const { data: roles, error: rolesError } = await Promise.race([
            rolesPromise,
            rolesTimeout
          ]) as any;

          if (rolesError) {
            console.warn('Roles fetch error:', rolesError);
            setRole('user'); // Default para user se houver erro
          } else if (roles && roles.length > 0) {
            const hasAdmin = roles.some((r: any) => r.role === 'admin');
            const determinedRole = hasAdmin ? 'admin' : 'user';
            setRole(determinedRole);
            console.log(`[useUserRole] User ${user.email} has roles: ${roles.map(r => r.role).join(', ')}. Determined role: ${determinedRole}`);
          } else {
            // Se não tem role, criar como user
            try {
              const { error: insertError } = await supabase
                .from('user_roles')
                .insert({ user_id: user.id, role: 'user' });
              
              if (insertError) {
                console.warn('Error creating user role:', insertError);
              }
              setRole('user');
              console.log(`[useUserRole] User ${user.email} assigned default role: user`);
            } catch (insertTimeoutError) {
              console.warn('Role creation timed out');
              setRole('user'); // Fallback
            }
          }
        } catch (rolesTimeoutError) {
          console.warn('Roles fetch timed out, using fallback');
          setRole('user');
        }
      } catch (error) {
        console.error('Error checking role:', error);
        setAuthError(error instanceof Error ? error.message : 'Unknown auth error');
        setRole(null);
        setFullName(null);
      } finally {
        setLoading(false);
      }
    };

    checkRole();

    // Listener para mudanças de auth com debounce
    let timeoutId: NodeJS.Timeout;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event);
      
      // Debounce para evitar múltiplas chamadas rápidas
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        checkRole();
      }, 500);
    });

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const isAdmin = role === 'admin';
  const isUser = role === 'user';

  return { role, isAdmin, isUser, loading, userId, fullName, authError };
}