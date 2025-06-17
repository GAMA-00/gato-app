
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useSupabaseAuth = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      return { data: null, error };
    }

    if (data?.user) {
      // Get user profile to determine role from users table
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

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

        // Update AuthContext with user data
        login(userData);

        // Navigate based on role without any notifications
        if (profile.role === 'client') {
          navigate('/client');
        } else if (profile.role === 'provider') {
          navigate('/dashboard');
        } else {
          navigate('/profile');
        }
      }
    }

    setLoading(false);
    return { data, error: null };
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
