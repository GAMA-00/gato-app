
import { useState, useEffect } from 'react';
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

      if (data?.user && data?.session) {
        console.log('Auth successful, fetching user profile...');
        
        // Get user profile to determine role from users table
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

        if (profileError) {
          console.error('Error fetching user profile:', profileError);
          setLoading(false);
          return { data: null, error: profileError };
        }

        if (profile) {
          // Update the AuthContext with the complete user data
          const userData = {
            id: profile.id,
            name: profile.name || '',
            email: profile.email || data.user.email || '',
            phone: profile.phone || '',
            residenciaId: profile.residencia_id || '',
            buildingName: '', // Will be populated from residencias lookup if needed
            hasPaymentMethod: profile.has_payment_method || false,
            role: profile.role as 'client' | 'provider' | 'admin',
            avatarUrl: profile.avatar_url || '',
            apartment: profile.house_number || '',
            houseNumber: profile.house_number || '',
            condominiumId: profile.condominium_id || '',
            condominiumName: profile.condominium_name || '',
          };

          console.log('Updating AuthContext with user data:', userData);

          // Update AuthContext with user data
          login(userData);

          console.log('Navigating based on role:', profile.role);

          // Navigate based on role without any notifications
          setTimeout(() => {
            if (profile.role === 'client') {
              navigate('/client');
            } else if (profile.role === 'provider') {
              navigate('/dashboard');
            } else {
              navigate('/profile');
            }
          }, 100); // Small delay to ensure state updates are processed
        } else {
          console.error('No profile found for user');
          setLoading(false);
          return { data: null, error: { message: 'No se encontró el perfil de usuario' } };
        }
      } else {
        console.error('No user or session in auth response');
        setLoading(false);
        return { data: null, error: { message: 'Error en la respuesta de autenticación' } };
      }

      setLoading(false);
      console.log('=== useSupabaseAuth.signIn END (SUCCESS) ===');
      return { data, error: null };
      
    } catch (error: any) {
      console.error('=== useSupabaseAuth.signIn ERROR ===', error);
      setLoading(false);
      return { data: null, error: { message: error.message || 'Error inesperado' } };
    }
  };

  const signUp = async (email: string, password: string) => {
    setLoading(true);
    
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });

    setLoading(false);
    return { data, error };
  };

  const signOut = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (!error) {
      navigate('/');
    }
    setLoading(false);
    return { error };
  };

  return {
    signIn,
    signUp,
    signOut,
    loading
  };
};
