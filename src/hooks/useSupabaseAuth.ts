
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
      
      // Register the user in Supabase Auth with improved error handling
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
        console.error('Auth error during signup:', authError);
        // Presentar mensaje de error más detallado al usuario
        let errorMessage = 'Error en el registro. Por favor intente nuevamente.';
        
        if (authError.message.includes('already registered')) {
          errorMessage = 'Este correo electrónico ya está registrado. Por favor use otro o inicie sesión.';
        } else if (authError.message.includes('password')) {
          errorMessage = 'La contraseña debe tener al menos 6 caracteres.';
        } else if (authError.message.includes('rate limit')) {
          errorMessage = 'Demasiados intentos. Por favor espere unos minutos e intente nuevamente.';
        }
        
        toast.error(errorMessage);
        setIsLoading(false);
        return { data: null, error: authError };
      }

      const userId = authData.user.id;
      console.log('User created with ID:', userId);

      // Datos a actualizar en la tabla users
      const updateData: any = {
        name: userData.name,
        email: email,
        phone: userData.phone || '',
        role: userData.role
      };

      // Si el usuario es un cliente, agregar residencia, condominio y número de casa
      if (userData.role === 'client') {
        updateData.residencia_id = userData.residenciaId || null;
        updateData.condominium_id = userData.condominiumId || null;
        updateData.house_number = userData.houseNumber || '';
      }

      try {
        // Intentar actualizar el registro de usuario
        const { error: updateError } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', userId);
          
        if (updateError) {
          console.error('Error updating user data:', updateError);
          toast.warning('Cuenta creada, pero hubo un problema actualizando detalles adicionales.');
        }
      } catch (updateError) {
        console.error('Exception updating user data:', updateError);
        toast.warning('Cuenta creada, pero hubo un problema actualizando detalles adicionales.');
      }

      // Si el usuario es un proveedor con residencias específicas, vincularlas
      if (userData.role === 'provider' && userData.providerResidenciaIds?.length > 0) {
        try {
          for (const residenciaId of userData.providerResidenciaIds) {
            await supabase.from('provider_residencias').insert({
              provider_id: userId,
              residencia_id: residenciaId
            });
          }
        } catch (providerError) {
          console.error('Error linking provider residencias:', providerError);
          toast.warning('Cuenta de proveedor creada, pero hubo un problema vinculando residencias.');
        }
      }
      
      // Crear objeto de usuario para el frontend
      const userObj = {
        id: userId,
        email: email,
        name: userData.name,
        phone: userData.phone || '',
        buildingId: userData.role === 'client' ? userData.residenciaId || '' : '',
        buildingName: '', 
        hasPaymentMethod: false,
        role: userData.role as UserRole,
        condominiumId: userData.condominiumId || '',
        houseNumber: userData.houseNumber || '',
      };
      
      toast.success('¡Cuenta creada con éxito!');
      
      // Establecer usuario en el contexto de autenticación
      setAuthUser(userObj);
      
      console.log('User registered successfully');
      
      return { 
        data: { user: userObj }, 
        error: null 
      };
    } catch (error: any) {
      console.error('Unexpected registration error:', error);
      toast.error('Error inesperado durante el registro. Por favor intente nuevamente.');
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
