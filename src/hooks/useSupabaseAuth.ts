
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { UserRole } from '@/lib/types';
import { checkPhoneExists } from '@/utils/phoneValidation';
import { v4 as uuidv4 } from 'uuid';

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
      
      // Generate a UUID for the user
      const userId = uuidv4();
      
      // Insert directly into clients or providers table
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
        
        // If user is a provider and has specified residencias, link them
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
            }
          }
        }
      }
      
      // Create user object for frontend
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
      
      // Set the user in the auth context
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
      
      // Try to find a client with this email
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('email', email)
        .maybeSingle();
      
      if (clientError) {
        console.error('Error checking client:', clientError);
        toast.error('Error al verificar cliente');
        return { data: null, error: clientError };
      }
      
      // If client not found, try provider
      if (!clientData) {
        const { data: providerData, error: providerError } = await supabase
          .from('providers')
          .select('*')
          .eq('email', email)
          .maybeSingle();
        
        if (providerError) {
          console.error('Error checking provider:', providerError);
          toast.error('Error al verificar proveedor');
          return { data: null, error: providerError };
        }
        
        if (!providerData) {
          console.log('No user found with this email:', email);
          toast.error('Usuario no encontrado. Por favor verifique su email.');
          return { data: null, error: new Error('User not found') };
        }
        
        // Provider found, create user object
        const userData = {
          id: providerData.id || '',
          email: email, // Use the email from the input as we know it matches
          name: providerData.name || 'Provider',
          phone: providerData.phone || '',
          buildingId: '',
          buildingName: '', 
          hasPaymentMethod: providerData.has_payment_method || false,
          role: 'provider' as UserRole,
          avatarUrl: ''
        };
        
        setAuthUser(userData);
        console.log('Provider login successful');
        return { data: { user: userData }, error: null };
      }
      
      // Client found, create user object
      const userData = {
        id: clientData.id || '',
        email: email, // Use the email from the input
        name: clientData.name || 'Client',
        phone: clientData.phone || '',
        buildingId: clientData.residencia_id || '',
        buildingName: '', 
        hasPaymentMethod: clientData.has_payment_method || false,
        role: 'client' as UserRole,
        avatarUrl: ''
      };
      
      setAuthUser(userData);
      console.log('Client login successful');
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
      clearAuthUser();
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
