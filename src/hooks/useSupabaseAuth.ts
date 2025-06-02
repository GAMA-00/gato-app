import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { UserRole } from '@/lib/types';
import { useNavigate } from 'react-router-dom';
import {
  checkPhoneUniqueness,
  checkEmailUniqueness
} from '@/utils/authUtils';

export const useSupabaseAuth = () => {
  const { login: setAuthUser, logout: clearAuthUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const signUp = async (email: string, password: string, userData: any) => {
    console.log('Starting registration process with email:', email);
    console.log('User data to register:', userData);
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

      // Check for email uniqueness
      const isEmailUnique = await checkEmailUniqueness(email);
      if (!isEmailUnique) {
        console.log('Email already registered');
        toast({
          title: "Error",
          description: "Este correo electrónico ya está registrado. Por favor use otro o inicie sesión.",
          variant: "destructive"
        });
        setIsLoading(false);
        return { 
          data: null, 
          error: new Error('Email already in use')
        };
      }
      
      console.log('Phone and email are unique, proceeding with registration');
      
      // Create the user in Supabase Auth with metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: userData.name,
            role: userData.role,
            phone: userData.phone || '',
            residenciaId: userData.residenciaId || '',
            condominiumId: userData.condominiumId || '',
            houseNumber: userData.houseNumber || ''
          }
        }
      });

      if (authError) {
        console.error('Supabase auth error:', authError);
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

      if (!authData.user) {
        console.error('No user data returned from auth signup');
        setIsLoading(false);
        return { data: null, error: new Error('No user data returned') };
      }

      const userId = authData.user.id;
      console.log('User registered successfully with ID:', userId);

      // Wait a moment for the trigger to execute
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify the user was created in the users table and get the data
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      console.log('Checking user in users table:', { existingUser, fetchError });

      if (fetchError || !existingUser || !existingUser.name || !existingUser.email) {
        console.log('User data incomplete or missing, inserting/updating manually...');
        
        // Insert or update the user data manually since the trigger didn't work properly
        const { data: upsertData, error: upsertError } = await supabase
          .from('users')
          .upsert({
            id: userId,
            name: userData.name,
            email: email,
            phone: userData.phone || '',
            role: userData.role,
            residencia_id: userData.residenciaId || null,
            condominium_id: userData.condominiumId || null,
            house_number: userData.houseNumber || ''
          }, {
            onConflict: 'id'
          })
          .select()
          .single();

        if (upsertError) {
          console.error('Error upserting user manually:', upsertError);
          toast({
            title: "Advertencia",
            description: 'Cuenta creada pero hubo un problema al guardar algunos datos.',
            variant: "default"
          });
        } else {
          console.log('User data upserted successfully:', upsertData);
        }
      } else {
        console.log('User found in users table with complete data:', existingUser);
      }

      // If it's a provider and has residencia IDs, add them to provider_residencias
      if (userData.role === 'provider' && userData.providerResidenciaIds?.length) {
        console.log('Adding provider residencias:', userData.providerResidenciaIds);
        
        const providerResidencias = userData.providerResidenciaIds.map((residenciaId: string) => ({
          provider_id: userId,
          residencia_id: residenciaId
        }));

        const { error: residenciaError } = await supabase
          .from('provider_residencias')
          .insert(providerResidencias);

        if (residenciaError) {
          console.error('Error inserting provider residencias:', residenciaError);
          toast({
            title: "Advertencia",
            description: 'Cuenta creada pero hubo un problema al asociar las residencias.',
            variant: "default"
          });
        }
      }
      
      // Create user object for frontend
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
        description: "¡Cuenta creada con éxito! Los datos se han guardado correctamente.",
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
      
      // Navigate based on user role
      if (userData.role === 'client') {
        navigate('/client');
      } else if (userData.role === 'admin' || userData.role === 'provider') {
        navigate('/dashboard');
      } else {
        navigate('/dashboard'); // Default fallback
      }
      
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
