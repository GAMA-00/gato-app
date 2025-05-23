
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { UserRole } from '@/lib/types';
import {
  checkPhoneUniqueness,
  signUpWithSupabase
} from '@/utils/authUtils';

export const useSupabaseAuth = () => {
  const { login: setAuthUser, logout: clearAuthUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const signUp = async (email: string, password: string, userData: any) => {
    console.log('Starting registration process with email:', email);
    setIsLoading(true);
    
    try {
      // Check for phone uniqueness
      if (userData.phone) {
        const isPhoneUnique = await checkPhoneUniqueness(userData.phone);
        
        if (!isPhoneUnique) {
          console.log('Phone number already registered');
          toast({
            title: "Error",
            description: "Este número de teléfono ya está registrado. Por favor use un número diferente.",
            variant: "destructive"
          });
          setIsLoading(false);
          return { 
            data: null, 
            error: new Error('Phone number already in use')
          };
        }
      }
      
      console.log('Phone is unique, proceeding with registration');
      
      // Register the user in Supabase Auth and users table
      const { data: authData, error: authError } = await signUpWithSupabase(
        email, 
        password, 
        {
          name: userData.name,
          role: userData.role,
          phone: userData.phone,
          residenciaId: userData.residenciaId,
          condominiumId: userData.condominiumId,
          houseNumber: userData.houseNumber,
          providerResidenciaIds: userData.providerResidenciaIds
        }
      );

      if (authError) {
        console.error('Auth error during signup:', authError);
        let errorMessage = 'Error en el registro. Por favor intente nuevamente.';
        
        if (authError.message.includes('already registered')) {
          errorMessage = 'Este correo electrónico ya está registrado. Por favor use otro o inicie sesión.';
        } else if (authError.message.includes('password')) {
          errorMessage = 'La contraseña debe tener al menos 6 caracteres.';
        } else if (authError.message.includes('rate limit')) {
          errorMessage = 'Demasiados intentos. Por favor espere unos minutos e intente nuevamente.';
        }
        
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        });
        setIsLoading(false);
        return { data: null, error: authError };
      }

      const userId = authData.user.id;
      console.log('User registered successfully with ID:', userId);
      
      // Crear objeto de usuario para el frontend
      const userObj = {
        id: userId,
        email: email,
        name: userData.name,
        phone: userData.phone || '',
        residenciaId: userData.role === 'client' ? userData.residenciaId || '' : '',
        buildingName: '', 
        hasPaymentMethod: false,
        role: userData.role as UserRole,
        condominiumId: userData.condominiumId || '',
        houseNumber: userData.houseNumber || '',
        avatarUrl: '',
      };
      
      toast({
        title: "¡Éxito!",
        description: "¡Cuenta creada con éxito!",
      });
      
      setAuthUser(userObj);
      
      return { 
        data: { user: userObj }, 
        error: null 
      };
    } catch (error: any) {
      console.error('Unexpected registration error:', error);
      toast({
        title: "Error",
        description: "Error inesperado durante el registro. Por favor intente nuevamente.",
        variant: "destructive"
      });
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (authError || !authData.user) {
        setIsLoading(false);
        toast({
          title: "Error",
          description: "Credenciales inválidas. Por favor verifique su email y contraseña.",
          variant: "destructive"
        });
        return { data: null, error: authError || new Error('No user data returned') };
      }

      const { id } = authData.user;
      
      // Fetch user data from users table only
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();
          
      if (userError || !userData) {
        console.warn('Could not fetch user data:', userError);
        setIsLoading(false);
        return { data: null, error: userError };
      }
      
      console.log('User data fetched:', userData);
      
      // Get building name if residencia_id exists
      let buildingName = '';
      if (userData.residencia_id) {
        const { data: residenciaData } = await supabase
          .from('residencias')
          .select('name')
          .eq('id', userData.residencia_id)
          .single();
          
        if (residenciaData) {
          buildingName = residenciaData.name;
        }
      }
      
      // Create user object for frontend
      const userObj = {
        id: id,
        email: userData.email || email,
        name: userData.name || '',
        phone: userData.phone || '',
        residenciaId: userData.residencia_id || '',
        buildingName: buildingName, 
        hasPaymentMethod: userData.has_payment_method || false,
        role: userData.role as UserRole,
        avatarUrl: userData.avatar_url || '',
        condominiumId: userData.condominium_id || '',
        houseNumber: userData.house_number || '',
      };
      
      setAuthUser(userObj);
      console.log('Login successful as', userData.role);
      toast({
        title: "¡Bienvenido!",
        description: "¡Bienvenido de nuevo!",
      });
      
      return { data: { user: userObj }, error: null };
    } catch (error: any) {
      console.error('Login error caught:', error);
      toast({
        title: "Error",
        description: "Error en el inicio de sesión",
        variant: "destructive"
      });
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  };
  
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

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      clearAuthUser();
      toast({
        title: "Sesión cerrada",
        description: "Sesión cerrada con éxito",
      });
    } catch (error: any) {
      console.error('Logout error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
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
