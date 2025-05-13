
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
    // If there's an error checking, assume the phone is unique to not block registration
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
    residenciaId?: string;
    condominiumId?: string;
    houseNumber?: string;
    providerResidenciaIds?: string[];
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
          phone: userData.phone || '',
          residenciaId: userData.residenciaId || '',
          condominiumId: userData.condominiumId || '',
          houseNumber: userData.houseNumber || '',
          providerResidenciaIds: userData.providerResidenciaIds || []
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

    // Now that we have created the auth user, manually insert into the users table
    const userId = authData.user.id;
    console.log('Auth user created with ID:', userId, 'Now creating user record');
    
    const { error: userInsertError } = await supabase.from('users').insert({
      id: userId,
      name: userData.name,
      email: email,
      phone: userData.phone || '',
      role: userData.role,
      residencia_id: userData.residenciaId || null,
      condominium_id: userData.condominiumId || null,
      house_number: userData.houseNumber || '',
      has_payment_method: false
    });

    if (userInsertError) {
      console.error('Error inserting into users table:', userInsertError);
      toast.warning('Cuenta de autenticación creada, pero hubo un problema guardando los datos adicionales.');
      // We don't return error here as auth user is created successfully
    }
    
    // Handle role-specific operations
    if (userData.role === 'client') {
      // Insert into clients table
      const { error: clientError } = await supabase.from('clients').insert({
        id: userId,
        name: userData.name,
        email: email,
        phone: userData.phone || '',
        residencia_id: userData.residenciaId || null
      });
      
      if (clientError) {
        console.error('Error inserting into clients table:', clientError);
        toast.warning('Hubo un problema al registrar los datos del cliente.');
      }
    } else if (userData.role === 'provider') {
      // Insert into providers table
      const { error: providerError } = await supabase.from('providers').insert({
        id: userId,
        name: userData.name,
        email: email,
        phone: userData.phone || ''
      });
      
      if (providerError) {
        console.error('Error inserting into providers table:', providerError);
        toast.warning('Hubo un problema al registrar los datos del proveedor.');
      }
      
      // If provider has residencias, insert them
      if (userData.providerResidenciaIds?.length) {
        for (const residenciaId of userData.providerResidenciaIds) {
          const { error: providerResidenciaError } = await supabase
            .from('provider_residencias')
            .insert({
              provider_id: userId,
              residencia_id: residenciaId
            });
          
          if (providerResidenciaError) {
            console.error('Error inserting into provider_residencias:', providerResidenciaError);
          }
        }
      }
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
 * Fetch user profile data from the unified users table
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
