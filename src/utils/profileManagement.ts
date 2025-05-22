
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
      .select(`
        *,
        residencia_id,
        avatar_url
      `)
      .eq('id', userId)
      .single();
      
    if (error) throw error;
    
    // If client has residencia_id, fetch the building name
    let buildingName = '';
    let condominiumName = '';
    
    if (profileData.residencia_id) {
      const { data: residenciaData } = await supabase
        .from('residencias')
        .select('name')
        .eq('id', profileData.residencia_id)
        .single();
        
      if (residenciaData) {
        buildingName = residenciaData.name;
      }
    }
    
    // If client has condominium_id, fetch the condominium name
    if (profileData.condominium_id) {
      const { data: condominiumData } = await supabase
        .from('condominiums')
        .select('name')
        .eq('id', profileData.condominium_id)
        .single();
        
      if (condominiumData) {
        condominiumName = condominiumData.name;
      }
    }
    
    return {
      ...profileData,
      buildingName,
      condominiumName,
      houseNumber: profileData.house_number || '',
      avatarUrl: profileData.avatar_url || ''
    };
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
    
    const { error } = await supabase
      .from(table)
      .update({ avatar_url: avatarUrl })
      .eq('id', userId);
      
    if (error) throw error;
    
    return { success: true, avatarUrl };
  } catch (error: any) {
    console.error('Error updating avatar:', error);
    return { success: false, error: error.message };
  }
}
