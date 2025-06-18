
import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CalendarRange, CreditCard } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';

// Credit card form schema for clients
const creditCardSchema = z.object({
  cardNumber: z.string().min(16, 'Número de tarjeta inválido').max(19),
  cardholderName: z.string().min(3, 'Nombre del titular inválido'),
  expiryDate: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Formato debe ser MM/YY'),
  cvv: z.string().min(3, 'CVV inválido').max(4)
});

export type CreditCardFormValues = z.infer<typeof creditCardSchema>;

interface ClientPaymentFormProps {
  onSuccess: () => void;
  onError: (error: string) => void;
  onSkip: () => void;
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
}

export const ClientPaymentForm = ({ onSuccess, onError, onSkip, isSubmitting, setIsSubmitting }: ClientPaymentFormProps) => {
  const { user } = useAuth();
  const [error, setError] = React.useState<string | null>(null);
  
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
    if (!user?.id) {
      onError("Usuario no autenticado");
      return;
    }
    
    setError(null);
    setIsSubmitting(true);
    
    try {
      console.log("Guardando método de pago para el usuario:", user.id);
      
      // Verificar primero que el usuario exista en la tabla users
      const { data: existingUser, error: userCheckError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();
      
      if (userCheckError || !existingUser) {
        console.error("El usuario no existe en la tabla users:", userCheckError || "No se encontró el usuario");
        
        // Si el usuario existe en auth pero no en users, intentamos crearlo
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: user.id,
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
        user_id: user.id,
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
        .eq('id', user.id);
      
      onSuccess();
      toast({
        title: "Éxito",
        description: "¡Método de pago registrado exitosamente!"
      });
    } catch (error: any) {
      console.error('Error al guardar método de pago:', error);
      const errorMessage = `Error al guardar la información de pago: ${error.message || 'Intente nuevamente'}`;
      setError(errorMessage);
      onError(errorMessage);
      toast({
        title: "Error",
        description: "Error al guardar la información de pago",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Configurar Método de Pago</h2>
        <p className="text-muted-foreground">Agrega tu tarjeta de crédito para realizar pagos</p>
      </div>

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
          
          <div className="flex gap-4">
            <Button 
              type="submit" 
              className="flex-1 bg-golden-whisker text-heading hover:bg-golden-whisker-hover"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></span>
                  Procesando...
                </>
              ) : "Guardar"}
            </Button>
            
            <Button 
              type="button" 
              variant="outline" 
              onClick={onSkip}
              disabled={isSubmitting}
              className="flex-1"
            >
              Omitir por ahora
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};
