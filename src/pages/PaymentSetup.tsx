
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import PageContainer from '@/components/layout/PageContainer';
import { CreditCard, Calendar, ShieldCheck } from 'lucide-react';

// Esquema de validación
const paymentSchema = z.object({
  cardNumber: z.string().min(16, 'Número de tarjeta inválido').max(19),
  cardName: z.string().min(3, 'Nombre en la tarjeta requerido'),
  expiryDate: z.string().regex(/^\d{2}\/\d{2}$/, 'Formato MM/YY requerido'),
  cvv: z.string().regex(/^\d{3,4}$/, 'CVV inválido')
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

const PaymentSetup = () => {
  const navigate = useNavigate();
  const { user, login } = useAuth();

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      cardNumber: '',
      cardName: '',
      expiryDate: '',
      cvv: ''
    }
  });

  const onSubmit = (values: PaymentFormValues) => {
    // En una aplicación real, aquí se enviaría a Stripe
    // Por ahora simulamos la actualización
    if (user) {
      login({
        ...user,
        hasPaymentMethod: true
      });
    }
    
    toast.success('¡Método de pago registrado correctamente!');
    navigate('/client');
  };

  return (
    <PageContainer 
      title="Configurar Método de Pago" 
      subtitle="Añade una tarjeta para poder realizar reservas"
    >
      <div className="max-w-md mx-auto mt-8">
        <div className="mb-6 p-4 border rounded-lg bg-amber-50 text-amber-800 text-sm">
          <ShieldCheck className="inline-block mr-2 h-5 w-5" />
          Tus datos de pago están seguros y se procesarán a través de nuestra pasarela de pago segura.
        </div>
        
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
                        placeholder="1234 5678 9012 3456" 
                        className="pl-10" 
                        {...field} 
                        onChange={(e) => {
                          // Solo permitir números y espacios
                          const value = e.target.value.replace(/[^\d\s]/g, '');
                          field.onChange(value);
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="cardName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre en la Tarjeta</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="NOMBRE COMO APARECE EN LA TARJETA" 
                      {...field} 
                      className="uppercase"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="expiryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Expiración</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="MM/YY" 
                          className="pl-10" 
                          {...field} 
                          onChange={(e) => {
                            let value = e.target.value.replace(/[^\d]/g, '');
                            if (value.length > 2) {
                              value = value.slice(0, 2) + '/' + value.slice(2, 4);
                            }
                            field.onChange(value);
                          }}
                          maxLength={5}
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
                  <FormItem>
                    <FormLabel>CVV</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="123" 
                        maxLength={4}
                        {...field} 
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <Button type="submit" className="w-full bg-golden-whisker text-heading hover:bg-golden-whisker-hover">
              <CreditCard className="mr-2 h-4 w-4" />
              Guardar Método de Pago
            </Button>
          </form>
        </Form>
      </div>
    </PageContainer>
  );
};

export default PaymentSetup;
