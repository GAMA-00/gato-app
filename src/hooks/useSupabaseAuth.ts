
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { UserRole } from '@/lib/types';
import { checkPhoneExists } from '@/utils/phoneValidation';

export const useSupabaseAuth = () => {
  const { login: setAuthUser, logout: clearAuthUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const signUp = async (email: string, password: string, userData: any) => {
    console.log('Starting registration process with email:', email);
    setIsLoading(true);
    
    try {
      // Check for phone uniqueness
      if (userData.phone) {
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
      }
      
      console.log('Phone is unique, proceeding with registration');
      
      // 1. Registrar el usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        console.error('Error creating auth user:', authError);
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

      // 2. Insertar datos en la tabla de perfiles
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          name: userData.name,
          email: email,
          phone: userData.phone || '',
          role: userData.role,
          residencia_id: userData.role === 'client' ? userData.residenciaId : null,
          has_payment_method: false
        });
      
      if (profileError) {
        console.error('Error creating profile:', profileError);
        toast.error('Error al crear el perfil');
        return { data: null, error: profileError };
      }
      
      // 3. Insertar en la tabla específica según el rol
      if (userData.role === 'client') {
        const { error: clientError } = await supabase
          .from('clients')
          .insert({
            id: userId,
            name: userData.name,
            email: email,
            phone: userData.phone || '',
            residencia_id: userData.residenciaId || null
          });
        
        if (clientError) {
          console.error('Error creating client:', clientError);
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
          console.error('Error creating provider:', providerError);
          toast.error('Error al crear el proveedor');
          return { data: null, error: providerError };
        }
        
        // Si el usuario es proveedor y ha especificado residencias, vincularlas
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
              // No detenemos el proceso por este error, pero lo registramos
            }
          }
        }
      }
      
      // Crear objeto de usuario para el frontend
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
      
      // Establecer el usuario en el contexto de autenticación
      setAuthUser(userObj);
      
      console.log('User registered successfully');
      toast.success('¡Cuenta creada con éxito!');
      
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
      
      // Intentar autenticar al usuario
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (authError || !authData.user) {
        console.error('Login error:', authError);
        toast.error('Credenciales inválidas. Por favor verifique su email y contraseña.');
        return { data: null, error: authError || new Error('No user data returned') };
      }
      
      // Obtener datos del perfil
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();
      
      if (profileError || !profileData) {
        console.error('Error fetching profile:', profileError);
        toast.error('Error al cargar el perfil');
        return { data: null, error: profileError || new Error('No profile data found') };
      }
      
      // Construir objeto de usuario
      const userData = {
        id: authData.user.id,
        email: profileData.email,
        name: profileData.name,
        phone: profileData.phone || '',
        buildingId: profileData.residencia_id || '',
        buildingName: '', 
        hasPaymentMethod: profileData.has_payment_method || false,
        role: profileData.role as UserRole,
        avatarUrl: profileData.avatar_url || ''
      };
      
      setAuthUser(userData);
      console.log('Login successful');
      toast.success('¡Bienvenido de nuevo!');
      return { data: { user: userData }, error: null };
      
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
