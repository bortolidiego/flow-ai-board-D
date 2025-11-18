import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface UserRoleContextType {
  userId: string | null;
  isAdmin: boolean;
  loading: boolean;
  user: User | null;
}

const UserRoleContext = createContext<UserRoleContextType | undefined>(undefined);

interface UserRoleProviderProps {
  children: ReactNode;
}

export function UserRoleProvider({ children }: UserRoleProviderProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUserAndRole = async (session: any) => {
      if (!session || !session.user) {
        setUserId(null);
        setIsAdmin(false);
        setUser(null);
        setLoading(false);
        return;
      }

      const currentUser = session.user;
      setUserId(currentUser.id);
      setUser(currentUser);

      try {
        // Buscar a role do usuário
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', currentUser.id)
          .maybeSingle();

        if (roleError) throw roleError;

        setIsAdmin(roleData?.role === 'admin');
      } catch (error) {
        console.error('Error fetching user role:', error);
        setIsAdmin(false); // Default to non-admin on error
      } finally {
        setLoading(false);
      }
    };

    // 1. Lidar com a sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchUserAndRole(session);
    });

    // 2. Lidar com mudanças de estado de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchUserAndRole(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    userId,
    isAdmin,
    loading,
    user,
  };

  return (
    <UserRoleContext.Provider value={value}>
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