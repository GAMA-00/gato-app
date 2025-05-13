
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
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
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
      toast.error("Usuario no autenticado");
      return;
    }
    
    setError(null);
    setIsSubmitting(true);
    
    try {
      console.log("Guardando método de pago para el usuario:", userId);
      
      // Verificar primero que el usuario exista en la tabla users
      const { data: existingUser, error: userCheckError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();
      
      if (userCheckError || !existingUser) {
        console.error("El usuario no existe en la tabla users:", userCheckError || "No se encontró el usuario");
        
        // Si el usuario existe en auth pero no en users, intentamos crearlo
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: userId,
            role: 'client',
            has_payment_method: false
          });
          
        if (insertError) {
          console.error("Error al crear registro de usuario:", insertError);
          throw new Error(`No se pudo crear el registro de usuario: ${insertError.message}`);
        }
      }
      
      // Una vez que nos aseguramos que el usuario existe, insertamos el método de pago
      const { error } = await supabase.from('payment_methods').insert({
        user_id: userId,
        method_type: 'card',
        cardholder_name: values.cardholderName,
        card_number: values.cardNumber.substring(values.cardNumber.length - 4), // Solo guardamos los últimos 4 dígitos por seguridad
        expiry_date: values.expiryDate
      });
      
      if (error) {
        console.error("Error al guardar método de pago:", error);
        throw error;
      }
      
      // Actualizar el flag has_payment_method del usuario
      await supabase
        .from('users')
        .update({ has_payment_method: true })
        .eq('id', userId);
      
      onSuccess(true);
      toast.success("¡Método de pago registrado exitosamente!");
      onSubmit();
    } catch (error: any) {
      console.error('Error al guardar método de pago:', error);
      setError(`Error al guardar la información de pago: ${error.message || 'Intente nuevamente'}`);
      toast.error("Error al guardar la información de pago");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...clientForm}>
      <form onSubmit={clientForm.handleSubmit(handleClientSubmit)} className="space-y-6">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
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
        
        <Button 
          type="submit" 
          className="w-full bg-golden-whisker text-heading hover:bg-golden-whisker-hover"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></span>
              Procesando...
            </>
          ) : "Guardar"}
        </Button>
      </form>
    </Form>
  );
};
