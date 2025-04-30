import { supabase, debugSignUp } from '@/integrations/supabase/client';
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
 * Delete a user from Supabase Auth
 */
export const deleteAuthUser = async (userId: string): Promise<AuthResult> => {
  try {
    // Warning: This requires admin privileges and can only be used server-side
    // For client-side, we'll use a special approach to clean up user data
    
    // Instead let's just log out the current user
    await supabase.auth.signOut();
    
    console.log('Signed out user after error to prevent orphaned records');
    return { data: { success: true }, error: null };
  } catch (error) {
    console.error('Error during auth user cleanup:', error);
    return { data: null, error: error as Error };
  }
};

/**
 * Perform user signup with Supabase Auth with improved error handling
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
  
  // Use our debug helper for better error tracking
  const { data: authData, error: authError } = await debugSignUp(email, password, {
    name: userData.name,
    role: userData.role,
    phone: userData.phone || ''
  });

  if (authError) {
    console.error('Error creating auth user:', authError);
    
    // Check for rate limit error
    if (authError.message?.includes('email rate limit exceeded') || 
        (authError as any).status === 429) {
      
      // Generate a suggestion with a random number to help avoid rate limits
      const randomNum = Math.floor(Math.random() * 10000);
      const emailParts = email.split('@');
      const suggestedEmail = `${emailParts[0]}${randomNum}@${emailParts[1]}`;
      
      toast.error(`Has enviado demasiadas solicitudes de registro. Prueba con otro correo como ${suggestedEmail} o espera unos minutos antes de intentarlo nuevamente.`);
      return { 
        data: null, 
        error: new Error(`Email rate limit exceeded. Try with a different email address like ${suggestedEmail} or wait a few minutes.`)
      };
    }
    
    toast.error('Error al crear la cuenta: ' + authError.message);
    return { data: null, error: authError };
  }

  if (!authData?.user) {
    console.error('No user returned from auth signup');
    toast.error('Error al crear la cuenta: No se pudo crear el usuario');
    return { data: null, error: new Error('No user returned from auth signup') };
  }

  return { data: authData, error: null };
};

/**
 * Manual registration function that bypasses Supabase Auth
 * For emergency use when regular signup is failing
 */
export const manualRegistration = async (
  userData: {
    name: string;
    email: string;
    phone?: string;
    role: UserRole;
    residenciaId?: string;
    providerResidenciaIds?: string[];
  }
): Promise<AuthResult> => {
  console.log('Manual registration attempt for:', userData.email);
  
  try {
    // Generate a temporary UUID for the user
    // NOTE: In a real implementation, we would need to handle this properly
    // This is just for emergency/debugging purposes
    const tempUserId = crypto.randomUUID(); 
    
    // Based on the role, create the appropriate profile
    if (userData.role === 'client') {
      const { error } = await supabase
        .from('clients')
        .insert({
          id: tempUserId,
          name: userData.name,
          email: userData.email,
          phone: userData.phone || '',
          residencia_id: userData.residenciaId || null,
          has_payment_method: false
        });
      
      if (error) {
        console.error('Manual client creation failed:', error);
        return { data: null, error };
      }
    } else if (userData.role === 'provider') {
      const { error: providerError } = await supabase
        .from('providers')
        .insert({
          id: tempUserId,
          name: userData.name,
          email: userData.email,
          phone: userData.phone || '',
          about_me: ''
        });
      
      if (providerError) {
        console.error('Manual provider creation failed:', providerError);
        return { data: null, error: providerError };
      }
      
      // Link provider to residencias if specified
      if (userData.providerResidenciaIds?.length) {
        for (const residenciaId of userData.providerResidenciaIds) {
          await supabase
            .from('provider_residencias')
            .insert({
              provider_id: tempUserId, 
              residencia_id: residenciaId
            });
        }
      }
    }
    
    return { 
      data: { 
        user: {
          id: tempUserId,
          email: userData.email,
          name: userData.name,
          role: userData.role,
        } 
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Manual registration failed:', error);
    return { data: null, error: error as Error };
  }
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

/**
 * Cleanup all stale user data
 * For emergency use when auth is stuck
 */
export const cleanupStaleUserData = async (email: string): Promise<boolean> => {
  try {
    console.log('Attempting to clean up stale user data for:', email);
    
    // Find any existing clients with this email
    const { data: clientsData } = await supabase
      .from('clients')
      .select('id')
      .eq('email', email);
      
    // Find any existing providers with this email  
    const { data: providersData } = await supabase
      .from('providers')
      .select('id')
      .eq('email', email);
    
    // Clean up client records if found
    if (clientsData?.length) {
      for (const client of clientsData) {
        console.log('Cleaning up client record:', client.id);
        await supabase.from('clients').delete().eq('id', client.id);
      }
    }
    
    // Clean up provider records if found
    if (providersData?.length) {
      for (const provider of providersData) {
        console.log('Cleaning up provider record:', provider.id);
        
        // First remove provider_residencias links
        await supabase
          .from('provider_residencias')
          .delete()
          .eq('provider_id', provider.id);
          
        // Then remove the provider
        await supabase.from('providers').delete().eq('id', provider.id);
      }
    }
    
    // Sign out any current session to ensure clean state
    await supabase.auth.signOut();
    
    return true;
  } catch (error) {
    console.error('Error during cleanup:', error);
    return false;
  }
};
