
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/lib/types';

export async function updateUserProfile(userId: string, data: any) {
  try {
    // Update profile data in the unified profiles table
    const { error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', userId);
      
    if (error) throw error;
    
    return { success: true };
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return { success: false, error: error.message };
  }
}

export async function fetchUserProfile(userId: string) {
  try {
    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (error) throw error;
    
    return profileData;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

export async function deleteUserProfile(userId: string) {
  try {
    // Due to the cascade delete setup, we only need to delete the user from auth
    // and the profile tables will be automatically cleaned up
    const { error } = await supabase.auth.admin.deleteUser(userId);
    
    if (error) throw error;
    
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return { success: false, error: error.message };
  }
}
