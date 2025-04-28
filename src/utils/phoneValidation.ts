
import { supabase } from '@/integrations/supabase/client';

export const checkPhoneExists = async (phone: string): Promise<boolean> => {
  try {
    if (!phone) {
      return false;
    }
    
    console.log('Checking if phone exists:', phone);
    
    // Check in the clients table
    const { data: clients, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('phone', phone)
      .limit(1);
    
    if (clientError) {
      console.error('Error checking client phone:', clientError);
      throw clientError;
    }
    
    if (clients && clients.length > 0) {
      console.log('Phone found in clients table');
      return true;
    }
    
    // Check in the providers table
    const { data: providers, error: providerError } = await supabase
      .from('providers')
      .select('id')
      .eq('phone', phone)
      .limit(1);
    
    if (providerError) {
      console.error('Error checking provider phone:', providerError);
      throw providerError;
    }
    
    const exists = providers && providers.length > 0;
    console.log('Phone already registered?:', exists);
    
    return exists;
  } catch (error) {
    console.error('Error checking phone existence:', error);
    return false;
  }
};
