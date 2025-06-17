
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export const useSupabaseAuth = () => {
  const navigate = useNavigate();
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
      // Get user profile to determine role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      // Navigate based on role without any notifications
      if (profile?.role === 'client') {
        navigate('/client');
      } else if (profile?.role === 'provider') {
        navigate('/dashboard');
      } else {
        navigate('/profile');
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
