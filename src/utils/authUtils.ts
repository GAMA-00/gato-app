
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export async function checkPhoneUniqueness(phone: string): Promise<boolean> {
  try {
    // Check in users table (consolidated table)
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('phone', phone)
      .limit(1);
    
    if (error) {
      console.error('Error checking phone uniqueness:', error);
      return false;
    }
    
    return data.length === 0;
  } catch (error) {
    console.error('Unexpected error checking phone uniqueness:', error);
    return false;
  }
}

export async function signUpWithSupabase(
  email: string, 
  password: string, 
  userData: {
    name: string;
    role: string;
    phone?: string;
    residenciaId?: string;
    condominiumId?: string;
    houseNumber?: string;
    providerResidenciaIds?: string[];
  }
) {
  try {
    console.log('Starting Supabase signup with email:', email);
    console.log('User metadata:', userData);

    // Create the user in Supabase Auth with metadata
    // The trigger will automatically create the user in the users table
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
      return { data: null, error: authError };
    }

    if (!authData.user) {
      console.error('No user data returned from auth signup');
      return { data: null, error: new Error('No user data returned') };
    }

    console.log('Auth user created successfully:', authData.user.id);

    // If it's a provider and has residencia IDs, add them to provider_residencias
    if (userData.role === 'provider' && userData.providerResidenciaIds?.length) {
      console.log('Adding provider residencias:', userData.providerResidenciaIds);
      
      const providerResidencias = userData.providerResidenciaIds.map(residenciaId => ({
        provider_id: authData.user!.id,
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

    return { data: authData, error: null };
  } catch (error: any) {
    console.error('Unexpected error during signup:', error);
    return { data: null, error };
  }
}

export async function checkEmailUniqueness(email: string): Promise<boolean> {
  try {
    // Check in users table
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .limit(1);
    
    if (error) {
      console.error('Error checking email uniqueness:', error);
      return false;
    }
    
    return data.length === 0;
  } catch (error) {
    console.error('Unexpected error checking email uniqueness:', error);
    return false;
  }
}
