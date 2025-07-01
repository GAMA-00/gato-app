
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
      // Marcar que estamos cerrando sesión inmediatamente
      isLoggingOutRef.current = true;
      
      // Limpiar el estado local inmediatamente
      setUser(null);
      setProfile(null);
      setSession(null);
      setIsLoading(false);
      
      console.log('AuthContext: Cleared local state');
      
      // Limpiar el almacenamiento de Supabase
      clearSupabaseStorage();
      
      // Redirigir inmediatamente a la landing page
      console.log('AuthContext: Redirecting to landing page');
      window.location.href = '/';
      
      // Realizar el signOut de Supabase en segundo plano
      setTimeout(async () => {
        try {
          console.log('AuthContext: Calling Supabase signOut');
          const { error } = await supabase.auth.signOut({ scope: 'global' });
          
          if (error) {
            console.error('AuthContext: Supabase logout error:', error);
          } else {
            console.log('AuthContext: Supabase logout successful');
          }
          
          // Limpiar almacenamiento una vez más por seguridad
          clearSupabaseStorage();
        } catch (error) {
          console.error('AuthContext: Background logout error:', error);
        }
      }, 100);
      
    } catch (error) {
      console.error('AuthContext: Logout exception:', error);
      
      // En caso de error, asegurar que se limpie todo y redirija
      isLoggingOutRef.current = true;
      setUser(null);
      setProfile(null);
      setSession(null);
      setIsLoading(false);
      clearSupabaseStorage();
      
      // Redirigir de todas formas
      window.location.href = '/';
    }
  };

  return { login, logout };
};
