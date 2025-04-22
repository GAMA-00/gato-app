import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import PageContainer from '@/components/layout/PageContainer';
import { CreditCard, CalendarRange } from 'lucide-react';

// Esquema de validación para tarjeta de crédito
const paymentSchema = z.object({
  cardNumber: z.string().min(16, 'Número de tarjeta inválido').max(19),
  cardholderName: z.string().min(3, 'Nombre del titular inválido'),
  expiryDate: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Formato debe ser MM/YY'),
  cvv: z.string().min(3, 'CVV inválido').max(4)
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

const PaymentSetup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateUserPaymentMethod } = useAuth();
  
  // Check if we came from client view to maintain that context
  const fromClientView = location.state?.fromClientView === true;
  
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      cardNumber: '',
      cardholderName: '',
      expiryDate: '',
      cvv: ''
    }
  });

  const onSubmit = (values: PaymentFormValues) => {
    // En una aplicación real, aquí enviaríamos la información a un procesador de pagos
    // Simulamos una actualización exitosa
    updateUserPaymentMethod(true);
    
    toast.success('Método de pago registrado exitosamente');
    
    // Navigate to client home if we came from client view, or to the default dashboard otherwise
    navigate(fromClientView ? '/client' : '/');
  };

  return (
    <PageContainer 
      title="Configurar Pago" 
      subtitle="Ingresa los datos de tu tarjeta de crédito"
    >
      <div className="max-w-md mx-auto mt-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
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
              control={form.control}
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
                control={form.control}
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
                control={form.control}
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
      </div>
    </PageContainer>
  );
};

export default PaymentSetup;
