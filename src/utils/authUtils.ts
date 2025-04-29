
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { checkPhoneExists } from '@/utils/phoneValidation';
import { UserRole } from '@/lib/types';

interface SignUpParams {
  email: string;
  password: string;
  userData: {
    name: string;
    role: UserRole;
    phone?: string;
    residenciaId?: string;
    providerResidenciaIds?: string[];
  };
}

interface AuthResult {
  data: any | null;
  error: Error | null;
}

/**
 * Check if a phone number is unique (not already registered)
 */
export const checkPhoneUniqueness = async (phone: string): Promise<boolean> => {
  if (!phone) return true;
  
  console.log('Checking if phone exists:', phone);
  const phoneExists = await checkPhoneExists(phone);
  console.log('Phone already registered?:', phoneExists);
  
  return !phoneExists;
};

/**
 * Register a client in the clients table
 */
export const createClient = async (
  userId: string, 
  name: string, 
  email: string, 
  phone: string = '', 
  residenciaId: string | null = null
): Promise<AuthResult> => {
  console.log('Creating client profile for user:', userId);
  
  const { error } = await supabase
    .from('clients')
    .insert({
      id: userId,
      name,
      email,
      phone,
      residencia_id: residenciaId,
      has_payment_method: false
    });
  
  if (error) {
    console.error('Error creating client profile:', error);
    toast.error('Error al crear el cliente');
    return { data: null, error };
  }
  
  return { data: { success: true }, error: null };
};

/**
 * Register a provider in the providers table
 */
export const createProvider = async (
  userId: string, 
  name: string, 
  email: string, 
  phone: string = ''
): Promise<AuthResult> => {
  console.log('Creating provider profile for user:', userId);
  
  const { error } = await supabase
    .from('providers')
    .insert({
      id: userId,
      name,
      email,
      phone,
      about_me: ''
    });
  
  if (error) {
    console.error('Error creating provider profile:', error);
    toast.error('Error al crear el proveedor');
    return { data: null, error };
  }
  
  return { data: { success: true }, error: null };
};

/**
 * Link a provider to residencias
 */
export const linkProviderToResidencias = async (
  providerId: string,
  residenciaIds: string[]
): Promise<AuthResult> => {
  if (!residenciaIds || residenciaIds.length === 0) {
    return { data: { success: true }, error: null };
  }
  
  console.log('Linking provider to residencias:', residenciaIds);
  
  for (const residenciaId of residenciaIds) {
    const { error } = await supabase
      .from('provider_residencias')
      .insert({
        provider_id: providerId, 
        residencia_id: residenciaId
      });
      
    if (error) {
      console.error('Error linking provider to residencia:', error);
      // Log but don't stop the process for this error
    }
  }
  
  return { data: { success: true }, error: null };
};

/**
 * Perform user signup with Supabase Auth
 */
export const signUpWithSupabase = async (
  email: string,
  password: string,
  userData: { 
    name: string; 
    role: UserRole; 
    phone?: string;
  }
): Promise<AuthResult> => {
  console.log('Creating auth user with email:', email);
  
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

  if (authError) {
    console.error('Error creating auth user:', authError);
    
    // Check for rate limit error
    if (authError.message.includes('email rate limit exceeded') || 
        authError.status === 429) {
      const suggestedEmail = `${email.split('@')[0]}_${Math.floor(Math.random() * 1000)}@${email.split('@')[1]}`;
      toast.error(`Has enviado demasiados correos de verificación recientemente. Prueba con otro correo como ${suggestedEmail} o espera unos minutos antes de intentarlo nuevamente.`);
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

  return { data: authData, error: null };
};

/**
 * Handle sign in with Supabase
 */
export const signInWithSupabase = async (email: string, password: string): Promise<AuthResult> => {
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

  return { data: authData, error: null };
};

/**
 * Fetch client data for a user
 */
export const fetchClientData = async (userId: string): Promise<AuthResult> => {
  const { data: clientData, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (clientError) {
    return { data: null, error: clientError };
  }
  
  return { data: clientData, error: null };
};

/**
 * Fetch provider data for a user
 */
export const fetchProviderData = async (userId: string): Promise<AuthResult> => {
  const { data: providerData, error: providerError } = await supabase
    .from('providers')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (providerError) {
    return { data: null, error: providerError };
  }
  
  return { data: providerData, error: null };
};
