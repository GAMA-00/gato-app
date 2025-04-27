
import { supabase } from '@/integrations/supabase/client';

export const checkPhoneExists = async (phone: string): Promise<boolean> => {
  try {
    if (!phone) {
      return false;
    }
    
    console.log('Checking if phone exists:', phone);
    
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', phone)
      .limit(1);
    
    const exists = !error && profiles && profiles.length > 0;
    console.log('Phone already registered?:', exists);
    
    return exists;
  } catch (error) {
    console.error('Error checking phone existence:', error);
    return false;
  }
};
