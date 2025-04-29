import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/lib/types';

export async function updateUserProfile(userId: string, data: any) {
  const { role, ...profileData } = data;
  
  try {
    if (role === 'client') {
      // Update client data
      const { error } = await supabase
        .from('clients')
        .update(profileData)
        .eq('id', userId);
        
      if (error) throw error;
    } else if (role === 'provider') {
      // Update provider data
      const { error } = await supabase
        .from('providers')
        .update(profileData)
        .eq('id', userId);
        
      if (error) throw error;
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return { success: false, error: error.message };
  }
}

export async function fetchUserProfile(userId: string) {
  try {
    // First check if user is a client
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (!clientError && clientData) {
      // User is a client
      return {
        ...clientData,
        role: 'client' as UserRole,
      };
    }
    
    // If not a client, check if user is a provider
    const { data: providerData, error: providerError } = await supabase
      .from('providers')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (!providerError && providerData) {
      // User is a provider
      return {
        ...providerData,
        role: 'provider' as UserRole,
      };
    }
    
    // If not found in either table
    return null;
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
