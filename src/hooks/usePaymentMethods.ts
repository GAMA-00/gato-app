import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface PaymentMethod {
  id: string;
  method_type: string;
  card_number: string | null;
  cardholder_name: string | null;
  expiry_date: string | null;
  bank_name: string | null;
  onvopay_payment_method_id: string | null;
  created_at: string;
}

export const usePaymentMethods = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const paymentMethodsQuery = useQuery({
    queryKey: ['payment-methods', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', user.id)
        .eq('method_type', 'card')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PaymentMethod[];
    },
    enabled: !!user?.id
  });

  const savePaymentMethodMutation = useMutation({
    mutationFn: async (cardData: {
      cardNumber: string;
      cardholderName: string;
      expiryDate: string;
      onvopayPaymentMethodId?: string;
    }) => {
      if (!user?.id) throw new Error('Usuario no autenticado');

      // Enmascarar el número de tarjeta (solo mostrar últimos 4 dígitos)
      const maskedCardNumber = '**** **** **** ' + cardData.cardNumber.slice(-4);

      const { data, error } = await supabase
        .from('payment_methods')
        .insert({
          user_id: user.id,
          method_type: 'card',
          card_number: maskedCardNumber,
          cardholder_name: cardData.cardholderName,
          expiry_date: cardData.expiryDate,
          onvopay_payment_method_id: cardData.onvopayPaymentMethodId || null
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods', user?.id] });
      toast({
        title: "Tarjeta guardada",
        description: "Tu método de pago ha sido guardado exitosamente"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar el método de pago",
        variant: "destructive"
      });
    }
  });

  const deletePaymentMethodMutation = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', paymentMethodId)
        .eq('user_id', user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods', user?.id] });
      toast({
        title: "Tarjeta eliminada",
        description: "El método de pago ha sido eliminado"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el método de pago",
        variant: "destructive"
      });
    }
  });

  return {
    paymentMethods: paymentMethodsQuery.data || [],
    isLoading: paymentMethodsQuery.isLoading,
    error: paymentMethodsQuery.error,
    savePaymentMethod: savePaymentMethodMutation.mutate,
    deletePaymentMethod: deletePaymentMethodMutation.mutate,
    isSaving: savePaymentMethodMutation.isPending,
    isDeleting: deletePaymentMethodMutation.isPending
  };
};