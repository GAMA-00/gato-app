import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const usePaymentStatus = (paymentId: string) => {
  return useQuery({
    queryKey: ['payment-status', paymentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('onvopay_payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (error) throw error;
      return data;
    },
    refetchInterval: (query) => {
      // Keep polling if status is pending
      if (query?.state?.data?.status === 'pending_authorization') {
        return 2000; // Poll every 2 seconds
      }
      return false; // Stop polling
    },
    enabled: !!paymentId
  });
};

export const useClientPayments = (clientId: string) => {
  return useQuery({
    queryKey: ['client-payments', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('onvopay_payments')
        .select(`
          *,
          appointments (
            start_time,
            end_time,
            listings (title)
          )
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!clientId
  });
};

export const useProviderPayments = (providerId: string) => {
  return useQuery({
    queryKey: ['provider-payments', providerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('onvopay_payments')
        .select(`
          *,
          appointments (
            start_time,
            end_time,
            client_name,
            listings (title)
          )
        `)
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!providerId
  });
};
