
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useSupabaseAuth = () => {
  const [loading, setLoading] = useState(false);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    
    try {
      console.log('Iniciando sesión para:', email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        console.error('Error de inicio de sesión:', error);
        setLoading(false);
        return { data: null, error };
      }

      if (!data?.user || !data?.session) {
        console.error('Respuesta de autenticación incompleta');
        setLoading(false);
        return { data: null, error: { message: 'Error en la respuesta de autenticación' } };
      }

      console.log('Usuario autenticado exitosamente:', data.user.id);
      setLoading(false);
      return { data, error: null };
      
    } catch (error: any) {
      console.error('Excepción durante inicio de sesión:', error);
      setLoading(false);
      return { data: null, error: { message: error.message || 'Error inesperado' } };
    }
  };

  const signUp = async (email: string, password: string) => {
    setLoading(true);
    
    const redirectUrl = `${window.location.origin}/`;
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      setLoading(false);
      return { data, error };
    } catch (error: any) {
      setLoading(false);
      return { data: null, error: { message: error.message || 'Error durante el registro' } };
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      setLoading(false);
      return { error };
    } catch (error: any) {
      setLoading(false);
      return { error: { message: error.message || 'Error durante el cierre de sesión' } };
    }
  };

  return {
    signIn,
    signUp,
    signOut,
    loading
  };
};
