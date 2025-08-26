import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CompletedServiceForInvoicing {
  id: string;
  client_name: string;
  service_name: string;
  start_time: string;
  end_time: string;
  listing_id: string;
  base_price: number;
  has_invoice: boolean;
}

export const usePostPaymentServices = (providerId?: string) => {
  return useQuery({
    queryKey: ['post-payment-services', providerId],
    queryFn: async () => {
      if (!providerId) return [];

      // Get completed appointments for post-payment services
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          id,
          client_name,
          start_time,
          end_time,
          listing_id,
          listings!inner(
            title,
            is_post_payment,
            base_price
          )
        `)
        .eq('provider_id', providerId)
        .eq('status', 'completed')
        .eq('listings.is_post_payment', true)
        .order('start_time', { ascending: false });

      if (error) {
        console.error('Error fetching post-payment services:', error);
        throw error;
      }

      if (!appointments?.length) return [];

      // Check which appointments already have invoices
      const appointmentIds = appointments.map(apt => apt.id);
      const { data: existingInvoices, error: invoiceError } = await supabase
        .from('post_payment_invoices')
        .select('appointment_id')
        .in('appointment_id', appointmentIds);

      if (invoiceError) {
        console.error('Error fetching existing invoices:', invoiceError);
        throw invoiceError;
      }

      const invoicedAppointmentIds = new Set(existingInvoices?.map(inv => inv.appointment_id) || []);

      // Return appointments that need invoicing (don't have invoices yet)
      return appointments
        .filter(appointment => !invoicedAppointmentIds.has(appointment.id))
        .map(appointment => ({
          id: appointment.id,
          client_name: appointment.client_name || 'Cliente sin nombre',
          service_name: (appointment.listings as any)?.title || 'Servicio',
          start_time: appointment.start_time,
          end_time: appointment.end_time,
          listing_id: appointment.listing_id,
          base_price: (appointment.listings as any)?.base_price || 0,
          has_invoice: false
        }));
    },
    enabled: !!providerId,
    refetchInterval: 30000,
  });
};

// Legacy function for backward compatibility - now creates invoices instead
export const useUpdateFinalPrice = () => {
  const updateFinalPrice = async (appointmentId: string, finalPrice: number, evidenceFiles?: File[]) => {
    console.warn('useUpdateFinalPrice is deprecated. Use the new invoice system instead.');
    
    // This function is kept for backward compatibility but should not be used
    // New implementations should use the invoice system through useInvoiceMutation
    throw new Error('This function has been replaced by the new invoice system');
  };

  return { updateFinalPrice };
};