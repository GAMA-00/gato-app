
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { UserRole } from '@/lib/types';
import { checkPhoneExists } from '@/utils/phoneValidation';

// Define a ProfileType to use for type casting
interface ProfileType {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: UserRole;
  building_id: string | null;
  has_payment_method: boolean;
  avatar_url: string | null;
  created_at: string;
}

export const useSupabaseAuth = () => {
  const { login: setAuthUser, logout: clearAuthUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const signUp = async (email: string, password: string, userData: any) => {
    console.log('Starting registration process with email:', email);
    setIsLoading(true);
    
    try {
      // Check for phone uniqueness
      if (userData.phone) {
        console.log('Checking if phone exists:', userData.phone);
        const phoneExists = await checkPhoneExists(userData.phone);
        
        if (phoneExists) {
          console.log('Phone number already registered');
          toast.error('Este número de teléfono ya está registrado. Por favor use un número diferente.');
          setIsLoading(false);
          return { 
            data: null, 
            error: new Error('Phone number already in use')
          };
        }
        console.log('Phone already registered?:', phoneExists);
      }
      
      console.log('Phone is unique, proceeding with registration');
      
      // 1. Register the user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: userData.name,
            role: userData.role,
            phone: userData.phone || ''
          }
        }
      });

      // Check for specific rate limit error
      if (authError) {
        console.error('Error creating auth user:', authError);
        
        if (authError.message.includes('email rate limit exceeded') || 
            authError.status === 429) {
          toast.error('Has enviado demasiados correos de verificación recientemente. Por favor intenta con otro correo o espera unos minutos antes de intentarlo nuevamente.');
          return { 
            data: null, 
            error: new Error('Email rate limit exceeded. Try with a different email address or wait a few minutes.')
          };
        }
        
        toast.error('Error al crear la cuenta: ' + authError.message);
        return { data: null, error: authError };
      }

      if (!authData.user) {
        console.error('No user returned from auth signup');
        toast.error('Error al crear la cuenta: No se pudo crear el usuario');
        return { data: null, error: new Error('No user returned from auth signup') };
      }

      const userId = authData.user.id;
      console.log('User created with ID:', userId);

      // Create client or provider data without using profiles table directly
      if (userData.role === 'client') {
        const { error: clientError } = await supabase
          .from('clients')
          .insert({
            id: userId,
            name: userData.name,
            email: email,
            phone: userData.phone || '',
            residencia_id: userData.residenciaId || null,
            has_payment_method: false
          });
        
        if (clientError) {
          console.error('Error creating client profile:', clientError);
          toast.error('Error al crear el cliente');
          return { data: null, error: clientError };
        }
      } else if (userData.role === 'provider') {
        const { error: providerError } = await supabase
          .from('providers')
          .insert({
            id: userId,
            name: userData.name,
            email: email,
            phone: userData.phone || '',
            about_me: ''
          });
        
        if (providerError) {
          console.error('Error creating provider profile:', providerError);
          toast.error('Error al crear el proveedor');
          return { data: null, error: providerError };
        }
        
        // Link provider to residencias if specified
        if (userData.providerResidenciaIds && userData.providerResidenciaIds.length > 0) {
          for (const residenciaId of userData.providerResidenciaIds) {
            const { error: residenciaError } = await supabase
              .from('provider_residencias')
              .insert({
                provider_id: userId, 
                residencia_id: residenciaId
              });
              
            if (residenciaError) {
              console.error('Error linking provider to residencia:', residenciaError);
              // Log but don't stop the process for this error
            }
          }
        }
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

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      console.log('Attempting login with email:', email);
      
      // Try to authenticate the user
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (authError || !authData.user) {
        console.error('Login error:', authError);
        toast.error('Credenciales inválidas. Por favor verifique su email y contraseña.');
        return { data: null, error: authError || new Error('No user data returned') };
      }

      // First try to get user data from clients table
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', authData.user.id)
        .single();
      
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
      const { data: providerData, error: providerError } = await supabase
        .from('providers')
        .select('*')
        .eq('id', authData.user.id)
        .single();
        
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
    signOut,
    isLoading
  };
};
