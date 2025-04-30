import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { UserRole } from '@/lib/types';
import {
  checkPhoneUniqueness,
  signUpWithSupabase,
  createClient,
  createProvider,
  linkProviderToResidencias,
  signInWithSupabase,
  fetchClientData,
  fetchProviderData,
  deleteAuthUser,
  manualRegistration,
  cleanupStaleUserData
} from '@/utils/authUtils';

export const useSupabaseAuth = () => {
  const { login: setAuthUser, logout: clearAuthUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [hasRateLimitError, setHasRateLimitError] = useState(false);

  /**
   * User signup handler with improved error handling and rollback
   */
  const signUp = async (email: string, password: string, userData: any) => {
    console.log('Starting registration process with email:', email);
    setIsLoading(true);
    setHasRateLimitError(false);
    
    try {
      // First cleanup any stale data
      if (userData.cleanupFirst) {
        await cleanupStaleUserData(email);
      }
      
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
        // Check for rate limit error
        if (authError.message?.includes('email rate limit exceeded') || 
            (authError as any).status === 429) {
          setHasRateLimitError(true);
        }
        
        setIsLoading(false);
        return { data: null, error: authError };
      }

      const userId = authData.user.id;
      console.log('User created with ID:', userId);
      let profileCreationError = null;

      // Create client or provider data without using profiles table directly
      if (userData.role === 'client') {
        const { error: clientError } = await createClient(
          userId,
          userData.name,
          email,
          userData.phone || '',
          userData.residenciaId
        );
        
        if (clientError) {
          profileCreationError = clientError;
          // Attempt to clean up the auth user to prevent orphaned records
          await deleteAuthUser(userId);
        }
      } else if (userData.role === 'provider') {
        const { error: providerError } = await createProvider(
          userId,
          userData.name,
          email,
          userData.phone || ''
        );
        
        if (providerError) {
          profileCreationError = providerError;
          // Attempt to clean up the auth user to prevent orphaned records
          await deleteAuthUser(userId);
        } else {
          // Link provider to residencias if specified
          if (userData.providerResidenciaIds && userData.providerResidenciaIds.length > 0) {
            const { error: linkError } = await linkProviderToResidencias(userId, userData.providerResidenciaIds);
            
            if (linkError) {
              console.error('Error linking provider to residencias:', linkError);
              // We don't fail the whole process for this error, just log it
            }
          }
        }
      }
      
      if (profileCreationError) {
        setIsLoading(false);
        return { data: null, error: profileCreationError };
      }
      
      // Create user object for the frontend
      const userObj = {
        id: userId,
        email: email,
        name: userData.name,
        phone: userData.phone || '',
        buildingId: userData.residenciaId || '',
        buildingName: '', 
        hasPaymentMethod: false,
        role: userData.role as UserRole,
      };
      
      toast.success('¡Cuenta creada con éxito!');
      
      // Set the user in the auth context
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
   * Manual registration for emergency bypass
   */
  const manualSignUp = async (email: string, password: string, userData: any) => {
    console.log('Starting MANUAL registration process with email:', email);
    setIsLoading(true);
    
    try {
      // First attempt to clean up any stale data with this email
      await cleanupStaleUserData(email);
      
      // Proceed with manual registration
      const { data, error } = await manualRegistration({
        email,
        name: userData.name,
        phone: userData.phone,
        role: userData.role,
        residenciaId: userData.residenciaId,
        providerResidenciaIds: userData.providerResidenciaIds
      });
      
      if (error) {
        console.error('Manual registration failed:', error);
        toast.error('Error en el registro manual: ' + error.message);
        return { data: null, error };
      }
      
      if (!data?.user) {
        return { data: null, error: new Error('No user data returned from manual registration') };
      }
      
      // Create user object for the frontend
      const userObj = {
        id: data.user.id,
        email: email,
        name: userData.name,
        phone: userData.phone || '',
        buildingId: userData.residenciaId || '',
        buildingName: '', 
        hasPaymentMethod: false,
        role: userData.role as UserRole,
      };
      
      toast.success('¡Cuenta creada manualmente con éxito!');
      
      // Set the user in the auth context
      setAuthUser(userObj);
      
      return { data: { user: userObj }, error: null };
    } catch (error: any) {
      console.error('Unexpected manual registration error:', error);
      toast.error(error.message || 'Error en el registro manual');
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * User sign in handler
   */
  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Try to authenticate the user
      const { data: authData, error: authError } = await signInWithSupabase(email, password);
      
      if (authError || !authData.user) {
        setIsLoading(false);
        return { data: null, error: authError };
      }

      // First try to get user data from clients table
      const { data: clientData, error: clientError } = await fetchClientData(authData.user.id);
      
      if (!clientError && clientData) {
        // User found in clients table
        const userObj = {
          id: authData.user.id,
          email: clientData.email || authData.user.email || '',
          name: clientData.name || '',
          phone: clientData.phone || '',
          buildingId: clientData.residencia_id || '',
          buildingName: '', 
          hasPaymentMethod: clientData.has_payment_method || false,
          role: 'client' as UserRole,
          avatarUrl: ''
        };
        
        setAuthUser(userObj);
        console.log('Login successful as client');
        toast.success('¡Bienvenido de nuevo!');
        return { data: { user: userObj }, error: null };
      }
      
      // If not in clients, check providers
      const { data: providerData, error: providerError } = await fetchProviderData(authData.user.id);
      
      if (!providerError && providerData) {
        // User found in providers table
        const userObj = {
          id: authData.user.id,
          email: providerData.email || authData.user.email || '',
          name: providerData.name || '',
          phone: providerData.phone || '',
          buildingId: '',
          buildingName: '', 
          hasPaymentMethod: false,
          role: 'provider' as UserRole,
          avatarUrl: ''
        };
        
        setAuthUser(userObj);
        console.log('Login successful as provider');
        toast.success('¡Bienvenido de nuevo!');
        return { data: { user: userObj }, error: null };
      }
      
      // If not found in either table
      console.error('Error fetching user profile: User not found in clients or providers tables');
      toast.error('Error al cargar el perfil de usuario');
      return { data: null, error: new Error('No profile found') };
      
    } catch (error: any) {
      console.error('Login error caught:', error);
      toast.error('Error en el inicio de sesión');
      return { data: null, error };
    } finally {
      setIsLoading(false);
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
    manualSignUp,
    signIn,
    signOut,
    isLoading,
    hasRateLimitError
  };
};
