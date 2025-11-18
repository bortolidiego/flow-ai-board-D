import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface UserRoleContextType {
  userId: string | null;
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
}

const UserRoleContext = createContext<UserRoleContextType | undefined>(undefined);

export function UserRoleProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        if (session?.user) {
          loadUserAndRole(session.user);
        } else {
          setUserId(null);
          setUser(null);
          setIsAdmin(false);
          setLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        setUserId(null);
        setUser(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    // Check initial session manually if listener doesn't fire immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserAndRole(session.user);
      } else {
        setLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const loadUserAndRole = async (currentUser: User) => {
    setUserId(currentUser.id);
    setUser(currentUser);
    
    try {
      // Buscar a role do usuário
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (error) throw error;

      const role = data?.role || 'user';
      setIsAdmin(role === 'admin');
    } catch (error) {
      console.error('Error loading user role:', error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <UserRoleContext.Provider value={{ userId, user, isAdmin, loading }}>
      {children}
    </UserRoleContext.Provider>
  );
}

export function useUserRole() {
  const context = useContext(UserRoleContext);
  if (context === undefined) {
    throw new Error('useUserRole must be used within a UserRoleProvider');
  }
  return context;
}