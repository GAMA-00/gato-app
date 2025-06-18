
import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Banknote, Wallet } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Bank account schema for providers
const bankAccountSchema = z.object({
  accountHolder: z.string().min(3, 'Nombre del titular inválido'),
  accountNumber: z.string().min(10, 'Número de cuenta inválido'),
  bankName: z.string().min(3, 'Nombre del banco inválido'),
  sinpeNumber: z.string().min(8, 'Número SINPE inválido')
});

export type BankAccountFormValues = z.infer<typeof bankAccountSchema>;

interface ProviderPaymentFormProps {
  onSuccess: () => void;
  onError: (error: string) => void;
  onSkip: () => void;
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
}

export const ProviderPaymentForm = ({ onSuccess, onError, onSkip, isSubmitting, setIsSubmitting }: ProviderPaymentFormProps) => {
  const { user } = useAuth();
  
  const providerForm = useForm<BankAccountFormValues>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      accountHolder: user?.name || '',
      accountNumber: '',
      bankName: '',
      sinpeNumber: ''
    },
    mode: 'onBlur'
  });

  const handleProviderSubmit = async (values: BankAccountFormValues) => {
    if (!user?.id) {
      onError("Usuario no autenticado");
      return;
    }
    
    setIsSubmitting(true);
    
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
      
      onSuccess();
      toast({
        title: "Éxito",
        description: "Información bancaria registrada exitosamente"
      });
    } catch (error: any) {
      console.error("Error al guardar información bancaria:", error);
      const errorMessage = "Error al guardar información bancaria";
      onError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Configurar Información Bancaria</h2>
        <p className="text-muted-foreground">Agrega tu información bancaria para recibir pagos</p>
      </div>

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
          
          <div className="flex gap-4">
            <Button 
              type="submit" 
              className="flex-1 bg-golden-whisker text-heading hover:bg-golden-whisker-hover"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></span>
                  Guardando...
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
