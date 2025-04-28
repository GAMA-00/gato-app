
import { supabase } from '@/integrations/supabase/client';

export const checkPhoneExists = async (phone: string): Promise<boolean> => {
  try {
    if (!phone) {
      return false;
    }
    
    console.log('Checking if phone exists:', phone);
    
    // Check in the clients table
    const { data: clientData } = await supabase
      .from('clients')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();
    
    if (clientData) {
      console.log('Phone found in clients table');
      return true;
    }
    
    // Check in the providers table
    const { data: providerData } = await supabase
      .from('providers')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();
    
    const exists = !!providerData;
    console.log('Phone already registered?:', exists);
    
    return exists;
  } catch (error) {
    console.error('Error checking phone existence:', error);
    return false;
  }
};
