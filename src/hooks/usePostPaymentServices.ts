import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CompletedServiceForPricing {
  id: string;
  client_name: string;
  service_name: string;
  start_time: string;
  end_time: string;
  listing_id: string;
  final_price: number | null;
  price_finalized: boolean;
}

export const usePostPaymentServices = (providerId?: string) => {
  return useQuery({
    queryKey: ['post-payment-services', providerId],
    queryFn: async () => {
      if (!providerId) return [];

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          client_name,
          start_time,
          end_time,
          listing_id,
          final_price,
          price_finalized,
          listings!inner(
            title,
            is_post_payment,
            service_variants
          )
        `)
        .eq('provider_id', providerId)
        .eq('status', 'completed')
        .or('price_finalized.is.null,price_finalized.eq.false')
        .order('start_time', { ascending: false });

      if (error) {
        console.error('Error fetching post-payment services:', error);
        throw error;
      }

      // Filter services that need price finalization
      const needsPricing = data?.filter(appointment => {
        const listing = appointment.listings as any;
        return (
          listing?.is_post_payment === true || 
          (listing?.service_variants && 
           JSON.stringify(listing.service_variants).includes('"ambas"'))
        ) && (!appointment.price_finalized);
      });

      return needsPricing?.map(appointment => ({
        id: appointment.id,
        client_name: appointment.client_name || 'Cliente sin nombre',
        service_name: (appointment.listings as any)?.title || 'Servicio',
        start_time: appointment.start_time,
        end_time: appointment.end_time,
        listing_id: appointment.listing_id,
        final_price: appointment.final_price,
        price_finalized: appointment.price_finalized || false
      })) || [];
    },
    enabled: !!providerId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useUpdateFinalPrice = () => {
  const updateFinalPrice = async (appointmentId: string, finalPrice: number, evidenceFiles?: File[]) => {
    try {
      // First, update the appointment with final price
      const { error: appointmentError } = await supabase
        .from('appointments')
        .update({
          final_price: finalPrice,
          price_finalized: true
        })
        .eq('id', appointmentId);

      if (appointmentError) throw appointmentError;

      // Upload evidence files if provided
      if (evidenceFiles && evidenceFiles.length > 0) {
        for (const file of evidenceFiles) {
          const fileName = `${appointmentId}_${Date.now()}_${file.name}`;
          
          // Upload file to storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('service-gallery')
            .upload(`evidence/${fileName}`, file);

          if (uploadError) {
            console.error('Error uploading evidence file:', uploadError);
            continue; // Continue with other files even if one fails
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('service-gallery')
            .getPublicUrl(`evidence/${fileName}`);

          // Save evidence record
          const { error: evidenceError } = await supabase
            .from('post_payment_evidence')
            .insert({
              appointment_id: appointmentId,
              provider_id: (await supabase.auth.getUser()).data.user?.id,
              file_url: urlData.publicUrl,
              file_type: file.type.startsWith('image/') ? 'invoice' : 'other',
              description: `Evidence for appointment ${appointmentId}`
            });

          if (evidenceError) {
            console.error('Error saving evidence record:', evidenceError);
          }
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating final price:', error);
      throw error;
    }
  };

  return { updateFinalPrice };
};