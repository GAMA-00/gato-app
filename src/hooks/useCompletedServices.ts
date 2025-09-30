import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CompletedService {
  id: string;
  invoice_id: string;
  invoice_number: string;
  service_name: string;
  client_name?: string;
  provider_name?: string;
  service_date: string;
  invoice_date: string;
  final_price: number;
  payment_type: 'prepaid' | 'postpaid';
  invoice_status: string;
  listing_title: string;
}

export const useCompletedServices = (userType: 'client' | 'provider', limit?: number) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['completed-services', userType, user?.id, limit],
    queryFn: async () => {
      if (!user?.id) return [];

      // Query the unified invoices table
      let query = supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          invoice_date,
          total_price,
          status,
          appointments!inner(
            id,
            start_time,
            client_name,
            provider_name,
            listings!inner(
              title,
              is_post_payment
            )
          )
        `)
        .in('status', ['completed', 'paid'])
        .order('invoice_date', { ascending: false });

      if (userType === 'client') {
        query = query.eq('client_id', user.id);
      } else {
        query = query.eq('provider_id', user.id);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data: invoices, error } = await query;

      if (error) {
        console.error('Error fetching completed services:', error);
        throw error;
      }

      if (!invoices) return [];

      const completedServices: CompletedService[] = invoices.map(invoice => {
        const appointment = invoice.appointments as any;
        const listing = appointment?.listings as any;
        
        return {
          id: appointment?.id || invoice.id,
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          service_name: listing?.title || 'Servicio',
          client_name: appointment?.client_name,
          provider_name: appointment?.provider_name,
          service_date: appointment?.start_time,
          invoice_date: invoice.invoice_date,
          final_price: Number(invoice.total_price),
          payment_type: listing?.is_post_payment ? 'postpaid' : 'prepaid',
          invoice_status: invoice.status,
          listing_title: listing?.title || 'Servicio'
        };
      });

      return completedServices;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
};