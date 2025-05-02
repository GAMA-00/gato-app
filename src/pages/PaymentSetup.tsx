
import React, { useEffect, useState } from 'react';
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
import { CreditCard, CalendarRange, Banknote, Wallet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Credit card form schema for clients
const creditCardSchema = z.object({
  cardNumber: z.string().min(16, 'Número de tarjeta inválido').max(19),
  cardholderName: z.string().min(3, 'Nombre del titular inválido'),
  expiryDate: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Formato debe ser MM/YY'),
  cvv: z.string().min(3, 'CVV inválido').max(4)
});

// Bank account schema for providers
const bankAccountSchema = z.object({
  accountHolder: z.string().min(3, 'Nombre del titular inválido'),
  accountNumber: z.string().min(10, 'Número de cuenta inválido'),
  bankName: z.string().min(3, 'Nombre del banco inválido'),
  sinpeNumber: z.string().min(8, 'Número SINPE inválido')
});

type CreditCardFormValues = z.infer<typeof creditCardSchema>;
type BankAccountFormValues = z.infer<typeof bankAccountSchema>;

const PaymentSetup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateUserPaymentMethod } = useAuth();
  const [isProvider, setIsProvider] = useState(false);
  
  // Check if we came from client view to maintain that context
  const fromClientView = location.state?.fromClientView === true;
  
  useEffect(() => {
    // Determine if the current user is a provider
    const checkUserRole = async () => {
      if (user?.id) {
        try {
          // Get user role from the auth context or fetch it if needed
          if (user.role === 'provider') {
            setIsProvider(true);
          }
        } catch (error) {
          console.error("Error checking user role:", error);
        }
      }
    };
    
    checkUserRole();
  }, [user]);

  // Client payment form (credit card)
  const clientForm = useForm<CreditCardFormValues>({
    resolver: zodResolver(creditCardSchema),
    defaultValues: {
      cardNumber: '',
      cardholderName: '',
      expiryDate: '',
      cvv: ''
    }
  });

  // Provider payment form (bank account)
  const providerForm = useForm<BankAccountFormValues>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      accountHolder: user?.name || '',
      accountNumber: '',
      bankName: '',
      sinpeNumber: ''
    }
  });

  const handleClientSubmit = async (values: CreditCardFormValues) => {
    if (!user?.id) {
      toast.error('Usuario no autenticado');
      return;
    }
    
    try {
      // Insert the payment method into the new payment_methods table
      const { error } = await supabase.from('payment_methods').insert({
        user_id: user.id,
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
        .eq('id', user.id);
      
      updateUserPaymentMethod(true);
      toast.success('Método de pago registrado exitosamente');
      
      // Navigate to client home if we came from client view, or to the default dashboard otherwise
      navigate(fromClientView ? '/client' : '/dashboard');
    } catch (error: any) {
      console.error('Error al guardar método de pago:', error);
      toast.error('Error al guardar la información de pago');
    }
  };

  const handleProviderSubmit = async (values: BankAccountFormValues) => {
    if (!user?.id) {
      toast.error('Usuario no autenticado');
      return;
    }
    
    try {
      // Insert the payment method into the new payment_methods table
      const { error } = await supabase.from('payment_methods').insert({
        user_id: user.id,
        method_type: 'bank',
        account_holder: values.accountHolder,
        bank_name: values.bankName,
        account_number: values.accountNumber,
        sinpe_number: values.sinpeNumber
      });
      
      if (error) throw error;
      
      // Update the user's has_payment_method flag
      await supabase
        .from('users')
        .update({ has_payment_method: true })
        .eq('id', user.id);
      
      updateUserPaymentMethod(true);
      toast.success('Información bancaria registrada exitosamente');
      navigate('/dashboard');
    } catch (error: any) {
      console.error("Error al guardar información bancaria:", error);
      toast.error('Error al guardar información bancaria');
    }
  };

  return (
    <PageContainer 
      title={isProvider ? "Configurar Información Bancaria" : "Configurar Pago"} 
      subtitle={isProvider 
        ? "Ingresa los datos de tu cuenta bancaria para recibir pagos" 
        : "Ingresa los datos de tu tarjeta de crédito"
      }
    >
      <div className="max-w-md mx-auto mt-8">
        {isProvider ? (
          // Provider Bank Account Form
          <Form {...providerForm}>
            <form onSubmit={providerForm.handleSubmit(handleProviderSubmit)} className="space-y-6">
              <FormField
                control={providerForm.control}
                name="accountHolder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Titular</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Wallet className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="Nombre completo" 
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
                control={providerForm.control}
                name="bankName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Banco</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Banknote className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="Ej: Banco Nacional" 
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
                control={providerForm.control}
                name="accountNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Cuenta</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Número de cuenta completo" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={providerForm.control}
                name="sinpeNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número SINPE Móvil</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="8 dígitos" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full bg-golden-whisker text-heading hover:bg-golden-whisker-hover">
                Guardar
              </Button>
            </form>
          </Form>
        ) : (
          // Client Credit Card Form
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
        )}
      </div>
    </PageContainer>
  );
};

export default PaymentSetup;
