
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useSupabaseAuth = () => {
  const [loading, setLoading] = useState(false);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    setLoading(false);
    return { data, error };
  };

  const signUp = async (email: string, password: string) => {
    setLoading(true);
    
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });

    setLoading(false);
    return { data, error };
  };

  const signOut = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
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
