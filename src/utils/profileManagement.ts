
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/lib/types';

export async function updateUserProfile(userId: string, data: any) {
  try {
    // Determine if we're updating a client or provider
    const { role } = data;
    const isClient = role === 'client';
    const table = isClient ? 'clients' : 'providers';
    
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
    // Determine which table to query based on role
    const table = role === 'client' ? 'clients' : 'providers';
    
    const { data: profileData, error } = await supabase
      .from(table)
      .select('*')
      .eq('id', userId)
      .single();
      
    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    
    if (!profileData) {
      console.error('No profile data found');
      return null;
    }
    
    // Si client tiene residencia_id, fetch the building name
    let buildingName = '';
    let condominiumName = '';
    
    // Type guard to check if we're dealing with a client profile
    const isClient = role === 'client';
    
    if (isClient && 'residencia_id' in profileData && profileData.residencia_id) {
      const { data: residenciaData } = await supabase
        .from('residencias')
        .select('name')
        .eq('id', profileData.residencia_id)
        .single();
        
      if (residenciaData) {
        // TypeScript fix: explicitly cast data.name to string using String() constructor
        buildingName = String(residenciaData.name || '');
      }
    }
    
    // Si client tiene condominium_id, fetch the condominium name
    if (isClient && 'condominium_id' in profileData && profileData.condominium_id) {
      const { data: condominiumData } = await supabase
        .from('condominiums')
        .select('name')
        .eq('id', profileData.condominium_id)
        .single();
        
      if (condominiumData && condominiumData.name !== null && condominiumData.name !== undefined) {
        // TypeScript fix: Explicitly assert the type and provide a default value
        condominiumName = String(condominiumData.name);
      }
    }
    
    // Create a result object with safe defaults
    const result = {
      ...profileData,
      buildingName,
      condominiumName,
      // Use optional chaining and provide defaults for potentially missing properties
      houseNumber: isClient && 'house_number' in profileData ? profileData.house_number || '' : '',
      avatarUrl: 'avatar_url' in profileData ? profileData.avatar_url || '' : ''
    };
    
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
    // Determine which table to update based on role
    const table = role === 'client' ? 'clients' : 'providers';
    
    // Use type assertion to tell TypeScript that this is a valid update object
    const updateData = { avatar_url: avatarUrl } as any;
    
    const { error } = await supabase
      .from(table)
      .update(updateData)
      .eq('id', userId);
      
    if (error) throw error;
    
    return { success: true, avatarUrl };
  } catch (error: any) {
    console.error('Error updating avatar:', error);
    return { success: false, error: error.message };
  }
}
