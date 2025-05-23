
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
