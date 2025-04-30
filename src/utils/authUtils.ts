
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
    return { data: null, error: authError || new Error('No user data returned') };
  }

  return { data: authData, error: null };
};

/**
 * Fetch user profile data
 */
export const fetchUserProfile = async (userId: string): Promise<AuthResult> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) {
    console.error('Error fetching profile:', error);
    return { data: null, error };
  }
  
  return { data, error: null };
};
