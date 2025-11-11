
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { clearSupabaseStorage } from './utils';
import { authLogger } from '@/utils/logger';

export const useAuthActions = (
  setUser: (user: any) => void,
  setProfile: (profile: any) => void,
  setSession: (session: any) => void,
  setIsLoading: (loading: boolean) => void,
  isLoggingOutRef: React.MutableRefObject<boolean>
) => {
  const navigate = useNavigate();

  const login = async (email: string, password: string) => {
    try {
      authLogger.info('Attempting login', { email });
      
      isLoggingOutRef.current = false;
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        authLogger.error('Login error', error);
        return { success: false, error: error.message };
      }

      if (data.user && data.session) {
        authLogger.info('Login successful', { role: data.user.user_metadata?.role });
        return { success: true };
      }

      return { success: false, error: 'Error de autenticación' };
    } catch (error) {
      authLogger.error('Login exception', error);
      return { success: false, error: 'Error de conexión' };
    }
  };

  const logout = async () => {
    authLogger.info('Starting logout process');
    
    try {
      // Marcar que estamos cerrando sesión inmediatamente
      isLoggingOutRef.current = true;
      
      authLogger.debug('Calling Supabase signOut first');
      
      // Realizar signOut de Supabase PRIMERO
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      
      if (error) {
        authLogger.error('Supabase logout error', error);
        // Continuar con la limpieza incluso si hay error
      } else {
        authLogger.info('Supabase logout successful');
      }
      
      // Limpiar el almacenamiento de Supabase
      clearSupabaseStorage();
      
      // Limpiar el estado local DESPUÉS del signOut
      setUser(null);
      setProfile(null);
      setSession(null);
      setIsLoading(false);
      
      authLogger.debug('Cleared local state');
      
      // Usar navegación programática en lugar de window.location.href
      authLogger.debug('Navigating to landing page');
      navigate('/', { replace: true });
      
    } catch (error) {
      authLogger.error('Logout exception', error);
      
      // En caso de error, forzar limpieza y redirección
      clearSupabaseStorage();
      setUser(null);
      setProfile(null);
      setSession(null);
      setIsLoading(false);
      
      // Asegurar redirección incluso con error
      navigate('/', { replace: true });
    } finally {
      // Resetear el flag de logout después de un breve delay
      setTimeout(() => {
        isLoggingOutRef.current = false;
      }, 500);
    }
  };

  return { login, logout };
};
