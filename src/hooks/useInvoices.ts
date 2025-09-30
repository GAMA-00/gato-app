import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Invoice {
  id: string;
  invoice_number: string;
  appointment_id: string;
  client_id: string;
  provider_id: string;
  listing_id: string;
  base_price: number;
  custom_variables_total: number;
  total_price: number;
  status: 'draft' | 'pending_payment' | 'paid' | 'completed' | 'cancelled';
  onvopay_payment_id?: string;
  post_payment_invoice_id?: string;
  invoice_date: string;
  due_date?: string;
  paid_at?: string;
  completed_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  appointments?: {
    id: string;
    start_time: string;
    end_time: string;
    client_name?: string;
    provider_name?: string;
    listings?: {
      title: string;
    };
  };
}

export const useClientInvoices = (statusFilter?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['client-invoices', user?.id, statusFilter],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('invoices')
        .select(`
          *,
          appointments!inner(
            id,
            start_time,
            end_time,
            client_name,
            provider_name,
            listings!inner(
              title
            )
          )
        `)
        .eq('client_id', user.id)
        .order('invoice_date', { ascending: false });

      // Apply status filter if provided
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching client invoices:', error);
        throw error;
      }

      return (data || []) as Invoice[];
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useProviderInvoices = (statusFilter?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['provider-invoices', user?.id, statusFilter],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('invoices')
        .select(`
          *,
          appointments!inner(
            id,
            start_time,
            end_time,
            client_name,
            provider_name,
            listings!inner(
              title
            )
          )
        `)
        .eq('provider_id', user.id)
        .order('invoice_date', { ascending: false });

      // Apply status filter if provided
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching provider invoices:', error);
        throw error;
      }

      return (data || []) as Invoice[];
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });
};
