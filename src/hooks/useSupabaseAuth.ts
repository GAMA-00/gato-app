
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useSupabaseAuth = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  const signIn = async (email: string, password: string) => {
    console.log('=== useSupabaseAuth.signIn START ===');
    console.log('Email:', email);
    
    setLoading(true);
    
    try {
      // Clear any previous session
      await supabase.auth.signOut();
      
      // Sign in with new credentials
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('Supabase auth response:', { 
        hasUser: !!data?.user, 
        hasSession: !!data?.session, 
        error: error?.message 
      });

      if (error) {
        console.error('Supabase auth error:', error);
        setLoading(false);
        return { data: null, error };
      }

      if (!data?.user || !data?.session) {
        console.error('No user or session in auth response');
        setLoading(false);
        return { data: null, error: { message: 'Error en la respuesta de autenticación' } };
      }

      console.log('Auth successful, fetching user profile...');
      
      // Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      console.log('Profile fetch result:', { 
        hasProfile: !!profile, 
        profileError: profileError?.message,
        role: profile?.role 
      });

      if (profileError || !profile) {
        console.error('Error fetching user profile:', profileError);
        setLoading(false);
        return { data: null, error: profileError || { message: 'No se encontró el perfil de usuario' } };
      }

      // Create complete user object
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

      console.log('Updating AuthContext with user data:', userData);

      // Update AuthContext
      login(userData);

      // Navigate immediately based on role
      console.log('Navigating based on role:', profile.role);
      
      // Use setTimeout to ensure state is updated before navigation
      setTimeout(() => {
        if (profile.role === 'client') {
          navigate('/client', { replace: true });
        } else if (profile.role === 'provider') {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/profile', { replace: true });
        }
      }, 100);

      setLoading(false);
      console.log('=== useSupabaseAuth.signIn END (SUCCESS) ===');
      return { data, error: null };
      
    } catch (error: any) {
      console.error('=== useSupabaseAuth.signIn ERROR ===', error);
      setLoading(false);
      return { data: null, error: { message: error.message || 'Error inesperado durante el inicio de sesión' } };
    }
  };

  const signUp = async (email: string, password: string) => {
    setLoading(true);
    
    const redirectUrl = `${window.location.origin}/`;
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
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
        navigate('/', { replace: true });
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
