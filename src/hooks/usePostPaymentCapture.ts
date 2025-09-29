import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface CapturePaymentParams {
  paymentId: string;
  onvopay_payment_id?: string;
}

export const usePostPaymentCapture = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CapturePaymentParams) => {
      // Add structured logging for better debugging
      const startTime = Date.now();
      const requestId = crypto.randomUUID();
      
      console.log('🔐 Capturing post-payment...', {
        paymentId: params.paymentId,
        onvopay_payment_id: params.onvopay_payment_id,
        timestamp: new Date().toISOString(),
        requestId
      });

      // FIXED: Call onvopay-capture instead of onvopay-confirm
      // Capture doesn't need card data, just the payment ID
      const { data, error } = await supabase.functions.invoke('onvopay-capture', {
        body: {
          paymentId: params.paymentId,
          onvopay_payment_id: params.onvopay_payment_id
        }
      });

      const duration = Date.now() - startTime;
      
      if (error) {
        console.error('❌ Error capturing payment:', {
          error,
          duration: `${duration}ms`,
          requestId
        });
        throw new Error(error.message || 'Error procesando el pago');
      }

      if (!data.success) {
        console.error('❌ Capture failed:', {
          error: data.error,
          duration: `${duration}ms`,
          requestId
        });
        throw new Error(data.error || 'Error confirmando el pago');
      }

      console.log('✅ Payment captured successfully:', {
        ...data,
        duration: `${duration}ms`,
        requestId
      });
      
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