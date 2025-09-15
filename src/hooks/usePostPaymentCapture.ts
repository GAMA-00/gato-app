import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface CapturePaymentParams {
  paymentIntentId: string;
  cardData: {
    number: string;
    expiry: string;
    cvv: string;
    name: string;
  };
  billingInfo: {
    name: string;
    phone: string;
    address: string;
  };
}

export const usePostPaymentCapture = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CapturePaymentParams) => {
      console.log('🔐 Capturing post-payment...', {
        paymentIntentId: params.paymentIntentId
      });

      const { data, error } = await supabase.functions.invoke('onvopay-confirm', {
        body: {
          payment_intent_id: params.paymentIntentId,
          card_data: params.cardData,
          billing_info: params.billingInfo
        }
      });

      if (error) {
        console.error('❌ Error capturing payment:', error);
        throw new Error(error.message || 'Error procesando el pago');
      }

      if (!data.success) {
        console.error('❌ Capture failed:', data.error);
        throw new Error(data.error || 'Error confirmando el pago');
      }

      console.log('✅ Payment captured successfully:', data);
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Pago Procesado",
        description: "El pago se ha procesado exitosamente",
      });

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['post-payment-services'] });
      queryClient.invalidateQueries({ queryKey: ['client-payments'] });
      queryClient.invalidateQueries({ queryKey: ['provider-payments'] });
    },
    onError: (error: Error) => {
      console.error('❌ Payment capture failed:', error);
      toast({
        variant: "destructive",
        title: "Error de Pago",
        description: error.message || "No se pudo procesar el pago. Intenta nuevamente.",
      });
    }
  });
};