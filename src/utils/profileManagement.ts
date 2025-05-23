
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/lib/types';

export async function updateUserProfile(userId: string, data: any) {
  try {
    console.log('=== updateUserProfile ===');
    console.log('Updating user profile for:', userId, 'with data:', data);
    
    // Update only the users table since we consolidated everything
    const { error } = await supabase
      .from('users')
      .update(data)
      .eq('id', userId);
      
    if (error) {
      console.error('=== updateUserProfile Error ===', error);
      throw error;
    }
    
    console.log('=== updateUserProfile Success ===');
    return { success: true };
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return { success: false, error: error.message };
  }
}

export async function fetchUserProfile(userId: string, role: UserRole = 'client') {
  try {
    console.log('=== fetchUserProfile ===');
    console.log('Fetching profile for user:', userId, 'with role:', role);
    
    // Fetch from users table only
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    console.log('=== fetchUserProfile Query Result ===');
    console.log('Data:', data);
    console.log('Error:', error);
        
    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
      
    if (!data) {
      console.error('No profile data found');
      return null;
    }
    
    // If user has residencia_id, fetch the building name
    let buildingName = '';
    let condominiumName = '';
    
    if (data.residencia_id) {
      console.log('=== Fetching Residencia Data ===');
      const { data: residenciaData } = await supabase
        .from('residencias')
        .select('name')
        .eq('id', data.residencia_id)
        .single();
        
      if (residenciaData) {
        buildingName = residenciaData.name || '';
        console.log('Building name fetched:', buildingName);
      }
    }
    
    // If user has condominium_id, fetch the condominium name
    if (data.condominium_id) {
      console.log('=== Fetching Condominium Data ===');
      console.log('Fetching condominium data for ID:', data.condominium_id);
      
      const { data: condominiumData, error: condoError } = await supabase
        .from('condominiums')
        .select('name')
        .eq('id', data.condominium_id)
        .single();
      
      console.log('Condominium query result:', { condominiumData, error: condoError });
      
      if (condoError) {
        console.log('Error fetching condominium:', condoError);
        condominiumName = '';
      } else if (!condominiumData) {
        console.log('No condominium data found');
        condominiumName = '';
      } else {
        condominiumName = condominiumData?.name || '';
        console.log('Condominium name extracted:', condominiumName);
      }
    }
    
    const finalAvatarUrl = data.avatar_url || '';
    console.log('=== Final Avatar URL ===', finalAvatarUrl);
    
    // Create a result object with the consolidated data
    const result = {
      ...data,
      buildingName,
      condominiumName,
      houseNumber: data.house_number || '',
      avatarUrl: finalAvatarUrl // Keep both for compatibility
    };
    
    console.log('=== Profile Result ===', result);
    return result;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

export async function deleteUserProfile(userId: string) {
  try {
    // Delete from users table and cascade will handle the rest
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);
    
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
    
    // Update only the users table
    const { error } = await supabase
      .from('users')
      .update({ avatar_url: avatarUrl })
      .eq('id', userId);
      
    if (error) {
      console.error('Error updating avatar:', error);
      throw error;
    }
    
    console.log('Avatar updated successfully');
    return { success: true, avatarUrl };
  } catch (error: any) {
    console.error('Error updating avatar:', error);
    return { success: false, error: error.message };
  }
}
