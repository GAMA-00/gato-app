
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

// Bank account schema for providers
const bankAccountSchema = z.object({
  accountHolder: z.string().min(3, 'Nombre del titular inválido'),
  accountNumber: z.string().min(10, 'Número de cuenta inválido'),
  bankName: z.string().min(3, 'Nombre del banco inválido'),
  sinpeNumber: z.string().min(8, 'Número SINPE inválido')
});

export type BankAccountFormValues = z.infer<typeof bankAccountSchema>;

interface ProviderPaymentFormProps {
  userId: string;
  userName?: string;
  onSuccess: (hasPaymentMethod: boolean) => void;
  onSubmit: () => void;
}

export const ProviderPaymentForm = ({ userId, userName, onSuccess, onSubmit }: ProviderPaymentFormProps) => {
  const providerForm = useForm<BankAccountFormValues>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      accountHolder: userName || '',
      accountNumber: '',
      bankName: '',
      sinpeNumber: ''
    },
    mode: 'onBlur'
  });

  const handleProviderSubmit = async (values: BankAccountFormValues) => {
    if (!userId) {
      toast({
        title: "Error",
        description: "Usuario no autenticado",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Insert the payment method into the new payment_methods table
      const { error } = await supabase.from('payment_methods').insert({
        user_id: userId,
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
        .eq('id', userId);
      
      onSuccess(true);
      toast({
        title: "Éxito",
        description: "Información bancaria registrada exitosamente"
      });
      onSubmit();
    } catch (error: any) {
      console.error("Error al guardar información bancaria:", error);
      toast({
        title: "Error",
        description: "Error al guardar información bancaria",
        variant: "destructive"
      });
    }
  };

  return (
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
  );
};
