
import { supabase } from '@/integrations/supabase/client';

export const checkPhoneExists = async (phone: string): Promise<boolean> => {
  try {
    if (!phone) {
      return false;
    }
    
    console.log('Checking if phone exists:', phone);
    
    // Check in the clients table
    const { count: clientCount, error: clientError } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('phone', phone);
    
    if (clientError) {
      console.error('Error checking client phone:', clientError);
      throw clientError;
    }
    
    if (clientCount && clientCount > 0) {
      console.log('Phone found in clients table');
      return true;
    }
    
    // Check in the providers table
    const { count: providerCount, error: providerError } = await supabase
      .from('providers')
      .select('*', { count: 'exact', head: true })
      .eq('phone', phone);
    
    if (providerError) {
      console.error('Error checking provider phone:', providerError);
      throw providerError;
    }
    
    const exists = providerCount ? providerCount > 0 : false;
    console.log('Phone already registered?:', exists);
    
    return exists;
  } catch (error) {
    console.error('Error checking phone existence:', error);
    return false;
  }
};
