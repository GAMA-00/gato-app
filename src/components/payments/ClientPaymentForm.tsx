
import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CalendarRange, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Credit card form schema for clients
const creditCardSchema = z.object({
  cardNumber: z.string().min(16, 'Número de tarjeta inválido').max(19),
  cardholderName: z.string().min(3, 'Nombre del titular inválido'),
  expiryDate: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Formato debe ser MM/YY'),
  cvv: z.string().min(3, 'CVV inválido').max(4)
});

export type CreditCardFormValues = z.infer<typeof creditCardSchema>;

interface ClientPaymentFormProps {
  userId: string;
  onSuccess: (hasPaymentMethod: boolean) => void;
  onSubmit: () => void;
}

export const ClientPaymentForm = ({ userId, onSuccess, onSubmit }: ClientPaymentFormProps) => {
  const clientForm = useForm<CreditCardFormValues>({
    resolver: zodResolver(creditCardSchema),
    defaultValues: {
      cardNumber: '',
      cardholderName: '',
      expiryDate: '',
      cvv: ''
    }
  });

  const handleClientSubmit = async (values: CreditCardFormValues) => {
    if (!userId) {
      toast.error('Usuario no autenticado');
      return;
    }
    
    try {
      // Insert the payment method into the new payment_methods table
      const { error } = await supabase.from('payment_methods').insert({
        user_id: userId,
        method_type: 'card',
        cardholder_name: values.cardholderName,
        card_number: values.cardNumber,
        expiry_date: values.expiryDate
      });
      
      if (error) throw error;
      
      // Update the user's has_payment_method flag
      await supabase
        .from('users')
        .update({ has_payment_method: true })
        .eq('id', userId);
      
      onSuccess(true);
      toast.success('Método de pago registrado exitosamente');
      onSubmit();
    } catch (error: any) {
      console.error('Error al guardar método de pago:', error);
      toast.error('Error al guardar la información de pago');
    }
  };

  return (
    <Form {...clientForm}>
      <form onSubmit={clientForm.handleSubmit(handleClientSubmit)} className="space-y-6">
        <FormField
          control={clientForm.control}
          name="cardNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número de Tarjeta</FormLabel>
              <FormControl>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="**** **** **** ****" 
                    className="pl-10" 
                    {...field} 
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={clientForm.control}
          name="cardholderName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Titular</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Como aparece en la tarjeta" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex gap-4">
          <FormField
            control={clientForm.control}
            name="expiryDate"
            render={({ field }) => (
              <FormItem className="w-1/2">
                <FormLabel>Fecha de Expiración</FormLabel>
                <FormControl>
                  <div className="relative">
                    <CalendarRange className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="MM/YY" 
                      className="pl-10" 
                      {...field} 
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={clientForm.control}
            name="cvv"
            render={({ field }) => (
              <FormItem className="w-1/2">
                <FormLabel>CVV</FormLabel>
                <FormControl>
                  <Input 
                    type="password" 
                    placeholder="•••" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <Button type="submit" className="w-full bg-golden-whisker text-heading hover:bg-golden-whisker-hover">
          Guardar
        </Button>
      </form>
    </Form>
  );
};
