
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useSupabaseAuth = () => {
  const { login: setAuthUser, logout: clearAuthUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          // Get user profile after sign in
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            setAuthUser({
              id: session.user.id,
              email: session.user.email || '',
              name: profile.name,
              phone: profile.phone || '',
              buildingId: profile.building_id || '',
              buildingName: '', // You'll need to fetch this if needed
              hasPaymentMethod: profile.has_payment_method || false,
              role: profile.role
            });
          }
        } else if (event === 'SIGNED_OUT') {
          clearAuthUser();
        }
      }
    );

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Get user profile
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile) {
              setAuthUser({
                id: session.user.id,
                email: session.user.email || '',
                name: profile.name,
                phone: profile.phone || '',
                buildingId: profile.building_id || '',
                buildingName: '', // You'll need to fetch this if needed
                hasPaymentMethod: profile.has_payment_method || false,
                role: profile.role
              });
            }
          });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setAuthUser, clearAuthUser]);

  const signUp = async (email: string, password: string, userData: any) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });

      if (error) throw error;

      if (data.user) {
        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              name: userData.name,
              email: email,
              phone: userData.phone,
              role: userData.role,
              building_id: userData.buildingId,
              has_payment_method: false
            }
          ]);

        if (profileError) throw profileError;
      }

      toast.success('Registro exitoso! Por favor verifica tu email.');
      return { data, error: null };
    } catch (error: any) {
      toast.error(error.message);
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      toast.error(error.message);
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      clearAuthUser();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return {
    signUp,
    signIn,
    signOut,
    isLoading
  };
};
