import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CompletedService {
  id: string;
  service_name: string;
  client_name?: string;
  provider_name?: string;
  service_date: string;
  final_price: number;
  payment_type: 'prepaid' | 'postpaid';
  listing_title: string;
}

export const useCompletedServices = (userType: 'client' | 'provider', limit?: number) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['completed-services', userType, user?.id, limit],
    queryFn: async () => {
      if (!user?.id) return [];

      const query = supabase
        .from('appointments')
        .select(`
          id,
          start_time,
          final_price,
          client_name,
          provider_name,
          listings!inner(
            title,
            is_post_payment
          ),
          onvopay_payments(
            status,
            amount
          ),
          post_payment_invoices(
            status,
            total_price
          )
        `)
        .eq('status', 'completed')
        .order('start_time', { ascending: false });

      if (userType === 'client') {
        query.eq('client_id', user.id);
      } else {
        query.eq('provider_id', user.id);
      }

      if (limit) {
        query.limit(limit);
      }

      const { data: appointments, error } = await query;

      if (error) {
        console.error('Error fetching completed services:', error);
        throw error;
      }

      if (!appointments) return [];

      // Filter and transform appointments based on transaction completion
      const completedServices: CompletedService[] = appointments
        .filter(appointment => {
          const listing = appointment.listings as any;
          const isPostPayment = listing?.is_post_payment;
          const payments = Array.isArray(appointment.onvopay_payments) ? appointment.onvopay_payments : [];
          const invoices = Array.isArray(appointment.post_payment_invoices) ? appointment.post_payment_invoices : [];
          
          if (!isPostPayment) {
            // Pre-paid service: completed appointment with captured payment
            return payments.some((payment: any) => payment.status === 'captured');
          } else {
            // Post-paid service: completed appointment with captured payment OR approved invoice
            return (
              payments.some((payment: any) => payment.status === 'captured') ||
              invoices.some((invoice: any) => invoice.status === 'approved')
            );
          }
        })
        .map(appointment => {
          const listing = appointment.listings as any;
          const isPostPayment = listing?.is_post_payment;
          const payments = Array.isArray(appointment.onvopay_payments) ? appointment.onvopay_payments : [];
          const invoices = Array.isArray(appointment.post_payment_invoices) ? appointment.post_payment_invoices : [];
          
          // Calculate final price
          let finalPrice = 0;
          if (appointment.final_price) {
            finalPrice = Number(appointment.final_price);
          } else if (payments.length > 0) {
            const capturedPayment = payments.find((p: any) => p.status === 'captured');
            finalPrice = capturedPayment ? capturedPayment.amount / 100 : 0; // Convert from cents
          } else if (invoices.length > 0) {
            const approvedInvoice = invoices.find((i: any) => i.status === 'approved');
            finalPrice = approvedInvoice ? Number(approvedInvoice.total_price) : 0;
          }

          return {
            id: appointment.id,
            service_name: listing?.title || 'Servicio',
            client_name: appointment.client_name,
            provider_name: appointment.provider_name,
            service_date: appointment.start_time,
            final_price: finalPrice,
            payment_type: isPostPayment ? 'postpaid' : 'prepaid',
            listing_title: listing?.title || 'Servicio'
          };
        });

      return completedServices;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
};