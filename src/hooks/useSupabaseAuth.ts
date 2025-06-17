
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useSupabaseAuth = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    
    try {
      console.log('=== STARTING SIGN IN PROCESS ===');
      console.log('Email:', email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      console.log('Auth response:', { data: !!data, error: !!error });

      if (error) {
        console.error('Sign in error:', error);
        setLoading(false);
        return { data: null, error };
      }

      if (!data?.user || !data?.session) {
        console.error('Missing user or session in response');
        setLoading(false);
        return { data: null, error: { message: 'Error en la respuesta de autenticación' } };
      }

      console.log('User authenticated successfully:', data.user.id);

      // Obtener perfil de usuario
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      console.log('Profile fetch result:', { profile: !!profile, profileError: !!profileError });

      if (profileError || !profile) {
        console.error('Profile error:', profileError);
        setLoading(false);
        return { data: null, error: profileError || { message: 'No se encontró el perfil de usuario' } };
      }

      const userData = {
        id: profile.id,
        name: profile.name || '',
        email: profile.email || data.user.email || '',
        phone: profile.phone || '',
        residenciaId: profile.residencia_id || '',
        buildingName: '',
        hasPaymentMethod: profile.has_payment_method || false,
        role: profile.role as 'client' | 'provider' | 'admin',
        avatarUrl: profile.avatar_url || '',
        apartment: profile.house_number || '',
        houseNumber: profile.house_number || '',
        condominiumId: profile.condominium_id || '',
        condominiumName: profile.condominium_name || '',
      };

      console.log('Processed user data:', { role: userData.role, name: userData.name });

      login(userData);
      setLoading(false);
      
      console.log('=== SIGN IN COMPLETE ===');
      return { data, error: null };
      
    } catch (error: any) {
      console.error('Sign in exception:', error);
      setLoading(false);
      return { data: null, error: { message: error.message || 'Error inesperado durante el inicio de sesión' } };
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
      if (!error) {
        navigate('/landing', { replace: true });
      }
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
