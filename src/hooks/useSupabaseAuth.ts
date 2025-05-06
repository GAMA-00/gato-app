
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { UserRole } from '@/lib/types';
import {
  checkPhoneUniqueness,
  signUpWithSupabase,
  fetchUserProfile,
} from '@/utils/authUtils';

export const useSupabaseAuth = () => {
  const { login: setAuthUser, logout: clearAuthUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  /**
   * User signup handler - Updated to use the unified users table
   */
  const signUp = async (email: string, password: string, userData: any) => {
    console.log('Starting registration process with email:', email);
    setIsLoading(true);
    
    try {
      // Check for phone uniqueness
      if (userData.phone) {
        const isPhoneUnique = await checkPhoneUniqueness(userData.phone);
        
        if (!isPhoneUnique) {
          console.log('Phone number already registered');
          toast.error('Este número de teléfono ya está registrado. Por favor use un número diferente.');
          setIsLoading(false);
          return { 
            data: null, 
            error: new Error('Phone number already in use')
          };
        }
      }
      
      console.log('Phone is unique, proceeding with registration');
      
      // Register the user in Supabase Auth
      const { data: authData, error: authError } = await signUpWithSupabase(
        email, 
        password, 
        {
          name: userData.name,
          role: userData.role,
          phone: userData.phone
        }
      );

      if (authError) {
        setIsLoading(false);
        return { data: null, error: authError };
      }

      const userId = authData.user.id;
      console.log('User created with ID:', userId);

      // If the user is a provider and specified residencias, link them
      if (userData.role === 'provider' && userData.providerResidenciaIds?.length > 0) {
        for (const residenciaId of userData.providerResidenciaIds) {
          await supabase.from('provider_residencias').insert({
            provider_id: userId,
            residencia_id: residenciaId
          });
        }
      }

      // If the user is a client and specified a residencia, update the user record
      if (userData.role === 'client' && userData.residenciaId) {
        await supabase
          .from('users')
          .update({ building_id: userData.residenciaId })
          .eq('id', userId);
      }
      
      // Create user object for frontend
      const userObj = {
        id: userId,
        email: email,
        name: userData.name,
        phone: userData.phone || '',
        buildingId: userData.role === 'client' ? userData.residenciaId || '' : '',
        buildingName: '', 
        building: userData.buildingName || '', // Add the building property
        hasPaymentMethod: false,
        role: userData.role as UserRole,
      };
      
      toast.success('¡Cuenta creada con éxito!');
      
      // Set user in the authentication context
      setAuthUser(userObj);
      
      console.log('User registered successfully');
      
      return { 
        data: { user: userObj }, 
        error: null 
      };
    } catch (error: any) {
      console.error('Unexpected registration error:', error);
      toast.error(error.message || 'Error en el registro');
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * User sign in handler - Updated to handle Google OAuth
   */
  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Try to authenticate the user
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (authError || !authData.user) {
        setIsLoading(false);
        toast.error('Credenciales inválidas. Por favor verifique su email y contraseña.');
        return { data: null, error: authError || new Error('No user data returned') };
      }

      // Get user profile from the unified users table
      const { data: profileData, error: profileError } = await fetchUserProfile(authData.user.id);
      
      if (profileError || !profileData) {
        console.error('Error fetching user profile:', profileError);
        toast.error('Error al cargar el perfil de usuario');
        setIsLoading(false);
        return { data: null, error: profileError || new Error('No profile found') };
      }
      
      // Create user object for frontend
      const userObj = {
        id: authData.user.id,
        email: profileData.email || authData.user.email || '',
        name: profileData.name || '',
        phone: profileData.phone || '',
        buildingId: profileData.building_id || '',
        buildingName: '', 
        building: profileData.buildingName || profileData.building_id || '', // Add the building property
        hasPaymentMethod: profileData.has_payment_method || false,
        role: profileData.role as UserRole,
        avatarUrl: profileData.avatar_url || ''
      };
      
      setAuthUser(userObj);
      console.log('Login successful as', profileData.role);
      toast.success('¡Bienvenido de nuevo!');
      
      return { data: { user: userObj }, error: null };
    } catch (error: any) {
      console.error('Login error caught:', error);
      toast.error('Error en el inicio de sesión');
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Handle OAuth sign in (Google, etc.)
   */
  const signInWithOAuth = async (provider: 'google') => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/payment-setup`
        }
      });
      
      setIsLoading(false);
      return { data, error };
    } catch (error: any) {
      setIsLoading(false);
      return { data: null, error };
    }
  };

  /**
   * User sign out handler
   */
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      clearAuthUser();
      toast.success('Sesión cerrada con éxito');
    } catch (error: any) {
      console.error('Logout error:', error);
      toast.error(error.message);
    }
  };

  return {
    signUp,
    signIn,
    signInWithOAuth,
    signOut,
    isLoading
  };
};
