
import { useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { clearSupabaseStorage } from './utils';

export const useAuthActions = (
  setUser: (user: any) => void,
  setProfile: (profile: any) => void,
  setSession: (session: any) => void,
  setIsLoading: (loading: boolean) => void,
  isLoggingOutRef: React.MutableRefObject<boolean>
) => {
  const login = async (email: string, password: string) => {
    try {
      console.log('AuthContext: Attempting login for:', email);
      
      isLoggingOutRef.current = false;
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        console.error('AuthContext: Login error:', error);
        return { success: false, error: error.message };
      }

      if (data.user && data.session) {
        console.log('AuthContext: Login successful for user:', data.user.user_metadata?.role);
        return { success: true };
      }

      return { success: false, error: 'Error de autenticación' };
    } catch (error) {
      console.error('AuthContext: Login exception:', error);
      return { success: false, error: 'Error de conexión' };
    }
  };

  const logout = async () => {
    console.log('AuthContext: Starting logout process');
    
    try {
      isLoggingOutRef.current = true;
      
      setUser(null);
      setProfile(null);
      setSession(null);
      setIsLoading(false);
      
      console.log('AuthContext: Cleared local state');
      
      clearSupabaseStorage();
      
      console.log('AuthContext: Calling Supabase signOut');
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      
      if (error) {
        console.error('AuthContext: Supabase logout error:', error);
      } else {
        console.log('AuthContext: Supabase logout successful');
      }
      
      setTimeout(() => {
        clearSupabaseStorage();
      }, 100);
      
      setTimeout(() => {
        console.log('AuthContext: Redirecting to landing page');
        window.location.replace('/');
      }, 200);
      
    } catch (error) {
      console.error('AuthContext: Logout exception:', error);
      
      isLoggingOutRef.current = true;
      setUser(null);
      setProfile(null);
      setSession(null);
      setIsLoading(false);
      clearSupabaseStorage();
      
      setTimeout(() => {
        window.location.replace('/');
      }, 100);
    }
  };

  return { login, logout };
};
