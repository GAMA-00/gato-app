
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useSupabaseAuth = () => {
  const [loading, setLoading] = useState(false);

  const signIn = async (email: string, password: string) => {
    console.log('useSupabaseAuth: Starting sign in for:', email);
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      console.log('useSupabaseAuth: Sign in result:', { 
        user: !!data?.user, 
        session: !!data?.session, 
        error: error?.message 
      });

      return { data, error };
    } catch (error) {
      console.error('useSupabaseAuth: Sign in exception:', error);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    console.log('useSupabaseAuth: Starting sign up for:', email);
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
      });

      console.log('useSupabaseAuth: Sign up result:', { 
        user: !!data?.user, 
        session: !!data?.session, 
        error: error?.message 
      });

      return { data, error };
    } catch (error) {
      console.error('useSupabaseAuth: Sign up exception:', error);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    console.log('useSupabaseAuth: Starting sign out');
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signOut();
      console.log('useSupabaseAuth: Sign out result:', { error: error?.message });
      return { error };
    } catch (error) {
      console.error('useSupabaseAuth: Sign out exception:', error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  return {
    signIn,
    signUp,
    signOut,
    loading
  };
};
