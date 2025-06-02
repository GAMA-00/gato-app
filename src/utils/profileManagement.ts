
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
    
    const finalAvatarUrl = data.avatar_url || '';
    console.log('=== Final Avatar URL ===', finalAvatarUrl);
    
    // Create a result object with the consolidated data
    const result = {
      ...data,
      buildingName,
      condominiumName: data.condominium_text || '', // Use condominium_text from database
      houseNumber: data.house_number || '',
      avatarUrl: finalAvatarUrl
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
    console.log('=== updateUserAvatar ===');
    console.log('Updating avatar for user:', userId, 'URL:', avatarUrl);
    
    // First verify the image is accessible
    try {
      const response = await fetch(avatarUrl, { method: 'HEAD' });
      if (!response.ok) {
        throw new Error(`Image not accessible: ${response.status}`);
      }
      console.log('Avatar URL verified as accessible');
    } catch (error) {
      console.warn('Could not verify avatar URL:', error);
    }
    
    // Update the users table with the new avatar URL
    const { data, error } = await supabase
      .from('users')
      .update({ avatar_url: avatarUrl })
      .eq('id', userId)
      .select('avatar_url')
      .single();
      
    if (error) {
      console.error('Error updating avatar in users table:', error);
      throw error;
    }
    
    console.log('Avatar updated successfully in users table:', data);
    
    // Double-check the update was successful by fetching the data again
    const { data: verifyData, error: verifyError } = await supabase
      .from('users')
      .select('avatar_url')
      .eq('id', userId)
      .single();
    
    if (verifyError) {
      console.error('Error verifying avatar update:', verifyError);
    } else {
      console.log('Avatar verification after update:', verifyData);
      
      if (verifyData?.avatar_url !== avatarUrl) {
        console.warn('Avatar URL mismatch after update!');
        console.warn('Expected:', avatarUrl);
        console.warn('Actual:', verifyData?.avatar_url);
      }
    }
    
    return { success: true, avatarUrl: data.avatar_url };
  } catch (error: any) {
    console.error('Error updating avatar:', error);
    return { success: false, error: error.message };
  }
}
