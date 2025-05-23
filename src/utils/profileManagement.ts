
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/lib/types';

// Define interfaces for the expected data structures from Supabase
interface Residencia {
  name: string;
}

interface Condominium {
  name: string;
}

// Define interfaces for profile data
interface ClientProfile {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  residencia_id?: string;
  condominium_id?: string;
  house_number?: string;
  avatar_url?: string;
  has_payment_method?: boolean;
  created_at?: string;
}

interface ProviderProfile {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  about_me?: string;
  experience_years?: number;
  average_rating?: number;
  certification_files?: any;
  created_at?: string;
}

export async function updateUserProfile(userId: string, data: any) {
  try {
    // Determine if we're updating a client or provider
    const { role } = data;
    const isClient = role === 'client';
    const table = isClient ? 'clients' : 'providers';
    
    // Also update the users table to keep it in sync
    const { error: usersError } = await supabase
      .from('users')
      .update({
        name: data.name,
        email: data.email,
        phone: data.phone,
      })
      .eq('id', userId);
    
    if (usersError) {
      console.error('Error updating users table:', usersError);
    }
    
    // Update profile data in the appropriate table
    const { error } = await supabase
      .from(table)
      .update(data)
      .eq('id', userId);
      
    if (error) throw error;
    
    return { success: true };
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return { success: false, error: error.message };
  }
}

export async function fetchUserProfile(userId: string, role: UserRole = 'client') {
  try {
    console.log('Fetching profile for user:', userId, 'with role:', role);
    
    // First get the basic user data from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (userError) {
      console.error('Error fetching user data:', userError);
    }

    // Determine which table to query based on role
    const table = role === 'client' ? 'clients' : 'providers';
    const isClient = role === 'client';
    
    // Query with proper typing based on role
    let profileData: ClientProfile | ProviderProfile | null;
    
    if (isClient) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', userId)
        .single<ClientProfile>();
        
      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      
      profileData = data;
    } else {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', userId)
        .single<ProviderProfile>();
        
      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      
      profileData = data;
    }
      
    if (!profileData) {
      console.error('No profile data found');
      return null;
    }
    
    // Si client tiene residencia_id, fetch the building name
    let buildingName = '';
    let condominiumName = '';
    
    if (isClient && 'residencia_id' in profileData && profileData.residencia_id) {
      const { data: residenciaData } = await supabase
        .from('residencias')
        .select('name')
        .eq('id', profileData.residencia_id)
        .single<Residencia>();
        
      if (residenciaData) {
        buildingName = residenciaData.name || '';
      }
    }
    
    // Si client tiene condominium_id, fetch the condominium name
    if (isClient && 'condominium_id' in profileData && profileData.condominium_id) {
      console.log('Fetching condominium data for ID:', profileData.condominium_id);
      
      const { data: condominiumData, error: condoError } = await supabase
        .from('condominiums')
        .select('name')
        .eq('id', profileData.condominium_id)
        .single<Condominium>();
      
      console.log('Condominium query result:', { condominiumData, error: condoError });
      
      // Check for errors or missing data before accessing properties
      if (condoError) {
        console.log('Error fetching condominium:', condoError);
        condominiumName = '';
      } else if (!condominiumData) {
        console.log('No condominium data found');
        condominiumName = '';
      } else {
        // Now we can safely access the name property
        condominiumName = condominiumData?.name || '';
        console.log('Condominium name extracted:', condominiumName);
      }
    }
    
    // Prioritize avatar_url from users table, then from profile table
    const finalAvatarUrl = userData?.avatar_url || profileData.avatar_url || '';
    console.log('Final avatar URL:', finalAvatarUrl);
    
    // Create a result object with safe defaults, prioritizing users table data
    const result = {
      ...profileData,
      // Use users table data as primary source, fallback to role-specific tables
      name: userData?.name || profileData.name || '',
      email: userData?.email || profileData.email || '',
      phone: userData?.phone || profileData.phone || '',
      avatar_url: finalAvatarUrl,
      buildingName,
      condominiumName,
      // Use optional chaining and provide defaults for potentially missing properties
      houseNumber: isClient && 'house_number' in profileData ? profileData.house_number || '' : '',
      avatarUrl: finalAvatarUrl // Keep both for compatibility
    };
    
    console.log('Profile result:', result);
    return result;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

export async function deleteUserProfile(userId: string) {
  try {
    // Due to the cascade delete setup, we only need to delete the user from auth
    // and the users table will be automatically cleaned up
    const { error } = await supabase.auth.admin.deleteUser(userId);
    
    if (error) throw error;
    
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return { success: false, error: error.message };
  }
}

export async function updateUserAvatar(userId: string, avatarUrl: string, role: UserRole = 'client') {
  try {
    console.log('Updating avatar for user:', userId, 'URL:', avatarUrl);
    
    // Update both users table and role-specific table
    const { error: usersError } = await supabase
      .from('users')
      .update({ avatar_url: avatarUrl })
      .eq('id', userId);
    
    if (usersError) {
      console.error('Error updating users table avatar:', usersError);
      throw usersError;
    }
    
    // Determine which table to update based on role
    const table = role === 'client' ? 'clients' : 'providers';
    
    // Use type assertion to tell TypeScript that this is a valid update object
    const updateData = { avatar_url: avatarUrl } as any;
    
    const { error } = await supabase
      .from(table)
      .update(updateData)
      .eq('id', userId);
      
    if (error) {
      console.error('Error updating role-specific table avatar:', error);
      throw error;
    }
    
    console.log('Avatar updated successfully');
    return { success: true, avatarUrl };
  } catch (error: any) {
    console.error('Error updating avatar:', error);
    return { success: false, error: error.message };
  }
}
