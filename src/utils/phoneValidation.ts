
import { supabase } from '@/integrations/supabase/client';

export const checkPhoneExists = async (phone: string): Promise<boolean> => {
  try {
    if (!phone) {
      return false;
    }
    
    console.log('Checking if phone exists:', phone);
    
    // Check directly in the users table instead of separate tables
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();
    
    if (error) {
      console.error('Error checking phone existence:', error);
      return false;
    }
    
    const exists = !!data;
    console.log('Phone already registered?:', exists);
    
    return exists;
  } catch (error) {
    console.error('Error checking phone existence:', error);
    return false;
  }
};
