
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
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
    // Registrar usuario en Supabase Auth con metadata
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
        
        toast({
          title: "Error",
          description: `Has alcanzado el límite de intentos de registro con este correo. Prueba con otro correo como ${suggestedEmail} o espera unos minutos.`,
          variant: "destructive"
        });
        return { 
          data: null, 
          error: new Error('Email rate limit exceeded. Try with a different email address or wait a few minutes.')
        };
      }
      
      // Check if user already registered
      if (authError.message.includes('already registered')) {
        toast({
          title: "Error",
          description: "Este correo ya está registrado. Por favor inicia sesión o utiliza otro correo.",
          variant: "destructive"
        });
        return {
          data: null,
          error: new Error('User already registered. Please login or use a different email.')
        };
      }
      
      toast({
        title: "Error",
        description: 'Error al crear la cuenta: ' + authError.message,
        variant: "destructive"
      });
      return { data: null, error: authError };
    }

    if (!authData.user) {
      console.error('No user returned from auth signup');
      toast({
        title: "Error",
        description: 'Error al crear la cuenta: No se pudo crear el usuario',
        variant: "destructive"
      });
      return { data: null, error: new Error('No user returned from auth signup') };
    }

    // Handle role-specific operations
    const userId = authData.user.id;
    
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
        toast({
          title: "Advertencia",
          description: 'Hubo un problema al registrar los datos del cliente.',
          variant: "default"
        });
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
        toast({
          title: "Advertencia",
          description: 'Hubo un problema al registrar los datos del proveedor.',
          variant: "default"
        });
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
 * Fetch user info directly from auth metadata
 */
export const fetchUserFromAuth = async (userId: string): Promise<AuthResult> => {
  try {
    const { data: userData, error } = await supabase.auth.getUser();
    
    if (error || !userData.user) {
      console.error('Error fetching user from auth:', error);
      return { data: null, error: error || new Error('No user found') };
    }
    
    return { data: userData.user, error: null };
  } catch (error: any) {
    console.error('Exception fetching auth user:', error);
    return { data: null, error };
  }
};
