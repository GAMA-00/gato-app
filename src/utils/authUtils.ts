
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
  try {
    const phoneExists = await checkPhoneExists(phone);
    console.log('Phone already registered?:', phoneExists);
    return !phoneExists;
  } catch (error) {
    console.error('Error checking phone uniqueness:', error);
    // Si hay error al verificar, asumimos que el teléfono es único para no bloquear el registro
    return true;
  }
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
  
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: userData.name,
          role: userData.role,
          phone: userData.phone || ''
        },
        emailRedirectTo: window.location.origin
      }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      
      // Enhanced error detection
      if (authError.message.includes('email rate limit exceeded') || 
          authError.message.includes('rate limit') ||
          authError.status === 429) {
        // Suggest an alternative email
        const username = email.split('@')[0];
        const domain = email.split('@')[1];
        const randomSuffix = Math.floor(Math.random() * 1000);
        const suggestedEmail = `${username}_${randomSuffix}@${domain}`;
        
        toast.error(`Has alcanzado el límite de intentos de registro con este correo. Prueba con otro correo como ${suggestedEmail} o espera unos minutos.`);
        return { 
          data: null, 
          error: new Error('Email rate limit exceeded. Try with a different email address or wait a few minutes.')
        };
      }
      
      // Check if user already registered
      if (authError.message.includes('already registered')) {
        toast.error('Este correo ya está registrado. Por favor inicia sesión o utiliza otro correo.');
        return {
          data: null,
          error: new Error('User already registered. Please login or use a different email.')
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
  } catch (error: any) {
    console.error('Exception during auth signup:', error);
    return { data: null, error };
  }
};

/**
 * Handle sign in with Supabase
 */
export const signInWithSupabase = async (email: string, password: string): Promise<AuthResult> => {
  console.log('Attempting login with email:', email);
  
  try {
    // Try to authenticate the user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (authError || !authData.user) {
      console.error('Login error:', authError);
      
      // More user-friendly error message for invalid credentials
      if (authError?.message.includes('Invalid login credentials')) {
        return { 
          data: null, 
          error: new Error('El correo o la contraseña son incorrectos. Por favor verifica tus credenciales.') 
        };
      }
      
      return { data: null, error: authError || new Error('No user data returned') };
    }

    return { data: authData, error: null };
  } catch (error: any) {
    console.error('Exception during login:', error);
    return { data: null, error };
  }
};

/**
 * Fetch user profile data
 */
export const fetchUserProfile = async (userId: string): Promise<AuthResult> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching profile:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error: any) {
    console.error('Exception fetching profile:', error);
    return { data: null, error };
  }
};
