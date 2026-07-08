import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PhoneInput } from '@/components/ui/phone-input';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useResidencias } from '@/hooks/useResidencias';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserPlus, Loader2 } from 'lucide-react';
import ClientResidenceField from '@/components/auth/ClientResidenceField';
import LoadingScreen from '@/components/common/LoadingScreen';

const completeProfileSchema = z.object({
  residenciaId: z.string().min(1, 'Seleccione una residencia'),
  condominiumId: z.string().optional(),
  houseNumber: z.string().min(1, 'Ingrese el número de casa'),
  phone: z.string()
    .regex(/^\+506\d{8}$/, 'Debe ser un número costarricense válido (+506 + 8 dígitos)')
    .length(12, 'El número debe tener exactamente 8 dígitos'),
  referredBy: z.string().optional(),
});

type CompleteProfileValues = z.infer<typeof completeProfileSchema>;

const CompleteProfile = () => {
  const { user, profile, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const { residencias, isLoading: loadingResidencias } = useResidencias();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CompleteProfileValues>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: {
      residenciaId: '',
      condominiumId: '',
      houseNumber: '',
      phone: '+506',
      referredBy: '',
    },
  });

  // Redirect if not authenticated or profile already complete
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/client/login', { replace: true });
      return;
    }
    if (profile && profile.residencia_id && profile.phone && profile.house_number) {
      navigate('/client/categories', { replace: true });
    }
  }, [isLoading, isAuthenticated, profile, navigate]);

  const onSubmit = async (values: CompleteProfileValues) => {
    if (!user || isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Resolve condominium name if needed
      let condominiumName: string | null = null;
      let condominiumId: string | null = null;

      if (values.condominiumId) {
        if (values.condominiumId.startsWith('static-')) {
          condominiumName = values.condominiumId; // Will be stored as condominium_text
        } else {
          condominiumId = values.condominiumId;
          const { data: condData } = await supabase
            .from('condominiums')
            .select('name')
            .eq('id', condominiumId)
            .single();
          condominiumName = condData?.name || null;
        }
      }

      const { error } = await supabase
        .from('users')
        .update({
          residencia_id: values.residenciaId,
          condominium_id: condominiumId,
          condominium_name: condominiumName,
          house_number: values.houseNumber,
          phone: values.phone,
        })
        .eq('id', user.id);

      if (error) throw error;

      // Also update clients table
      await supabase
        .from('clients')
        .upsert({ id: user.id, residencia_id: values.residenciaId }, { onConflict: 'id' });

      toast.success('¡Perfil completado exitosamente!');
      // Force reload to refresh profile data
      window.location.href = '/client/categories';
    } catch (error: any) {
      console.error('Error completing profile:', error);
      toast.error('Error al completar el perfil');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Cargando..." />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4">
            <img
              src="/gato-icon.png?v=1"
              width="64"
              height="64"
              alt="Gato Logo"
              decoding="async"
              className="w-full h-full object-contain"
            />
          </div>
          <CardTitle className="text-2xl">Completar Perfil</CardTitle>
          <CardDescription>
            {user?.name ? `¡Hola ${user.name}!` : '¡Bienvenido!'} Completa tus datos para continuar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <ClientResidenceField
                residencias={residencias}
                isSubmitting={isSubmitting}
                loadingResidencias={loadingResidencias}
                form={form}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">Teléfono Celular</FormLabel>
                    <FormControl>
                      <PhoneInput
                        value={field.value}
                        onChange={field.onChange}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="referredBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">
                      ¿Quién te recomendó Gato? <span className="text-muted-foreground text-sm">(opcional)</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nombre de la persona"
                        className="h-12 text-base"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-12 bg-coral hover:bg-coral-light"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                    <span>Guardando...</span>
                  </div>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Crear Cuenta
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompleteProfile;
