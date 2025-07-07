
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useSupabaseAuth = () => {
  const [loading, setLoading] = useState(false);

  const signUp = async (email: string, password: string, userData?: any) => {
    setLoading(true);
    try {
      console.log('useSupabaseAuth: Starting registration with userData:', userData);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: userData || {}
        }
      });
      
      console.log('useSupabaseAuth: Registration result:', { data: !!data, error: error?.message, user: data?.user?.id });
      
      // Wait a moment for the auth state to update
      if (data?.user && !error) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      return { data, error };
    } catch (error: any) {
      console.error('useSupabaseAuth: Registration error:', error);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  return {
    signUp,
    loading
  };
};
