
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import PageContainer from '@/components/layout/PageContainer';
import { Mail, Lock, Phone, User, UserPlus, Building, Loader2, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Residencia } from '@/lib/types';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';

const registerSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  email: z.string().email('Correo electrónico inválido'),
  phone: z.string().min(8, 'Número de teléfono inválido'),
  role: z.enum(['client', 'provider']),
  providerResidenciaIds: z.array(z.string()).optional(),
  residenciaId: z.string().optional(),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres')
}).refine(
  (data) => {
    if (data.role === 'client') {
      return !!data.residenciaId;
    }
    if (data.role === 'provider') {
      return !!data.providerResidenciaIds && data.providerResidenciaIds.length > 0;
    }
    return false;
  },
  {
    message: "Debe seleccionar al menos una residencia",
    path: ["residenciaId"],
  }
);

type RegisterFormValues = z.infer<typeof registerSchema>;

const Register = () => {
  const navigate = useNavigate();
  const { signUp, isLoading } = useSupabaseAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [residencias, setResidencias] = useState<Residencia[]>([]);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [loadingResidencias, setLoadingResidencias] = useState(true);
  const { user } = useAuth();
  
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    const fetchResidencias = async () => {
      try {
        setLoadingResidencias(true);
        console.log('Consultando residencias desde Supabase');
        const { data, error } = await supabase
          .from('residencias')
          .select('id, name, address');
        
        if (error) {
          console.error('Error al cargar residencias:', error);
          toast.error('Error al cargar las residencias');
          return;
        }
        
        console.log('Residencias cargadas:', data);
        setResidencias(data || []);
      } catch (error) {
        console.error('Error al cargar residencias:', error);
        toast.error('Error al cargar las residencias');
      } finally {
        setLoadingResidencias(false);
      }
    };
    
    fetchResidencias();
  }, []);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      role: 'client',
      providerResidenciaIds: [],
      residenciaId: '',
      password: ''
    }
  });

  const role = form.watch('role');
  const email = form.watch('email');

  const onSubmit = async (values: RegisterFormValues) => {
    if (isSubmitting) {
      console.log('Ya hay un envío en curso, ignorando');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setRegistrationError(null);
      
      if (role === 'client' && !values.residenciaId) {
        toast.error('Debes seleccionar una residencia');
        return;
      }
      
      if (role === 'provider' && (!values.providerResidenciaIds || values.providerResidenciaIds.length === 0)) {
        toast.error('Debes seleccionar al menos una residencia');
        return;
      }

      toast.info('Iniciando registro, por favor espere...');
      console.log('Datos de registro:', values);
      
      const userData = {
        name: values.name,
        phone: values.phone,
        role: values.role,
        residenciaId: values.role === 'client' ? values.residenciaId : null,
        providerResidenciaIds: values.role === 'provider' ? values.providerResidenciaIds : []
      };
      
      const result = await signUp(values.email, values.password, userData);
      
      if (result.error) {
        console.error('Error durante el registro:', result.error);
        
        if (result.error.message.includes('teléfono ya está en uso')) {
          toast.error('Este número de teléfono ya está registrado. Por favor, utilice otro número.');
        } else if (result.error.message.includes('Email rate limit exceeded')) {
          const suggestedEmail = `${values.email.split('@')[0]}_${Math.floor(Math.random() * 1000)}@${values.email.split('@')[1]}`;
          setRegistrationError(`Has alcanzado el límite de intentos de registro con este correo. Por favor utiliza otra dirección de correo (por ejemplo: ${suggestedEmail}) o intenta más tarde.`);
        } else {
          toast.error('Error durante el registro: ' + result.error.message);
        }
        
        setRegistrationError(result.error.message || "Error desconocido");
      } else if (result.data?.user) {
        console.log('Registro exitoso!');
        navigate('/payment-setup', { 
          state: { fromClientView: values.role === 'client' } 
        });
      } 
    } catch (error: any) {
      console.error('Error capturado en onSubmit:', error);
      setRegistrationError(error.message || "Error desconocido durante el registro");
      toast.error('Error durante el registro: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageContainer
      title="Crear Cuenta"
      subtitle="Regístrate para agendar u ofrecer servicios"
    >
      <div className="max-w-md mx-auto mt-8">
        {registrationError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4 mr-2" />
            <AlertDescription className="text-sm">{registrationError}</AlertDescription>
          </Alert>
        )}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de usuario</FormLabel>
                  <FormControl>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="client">Cliente</SelectItem>
                        <SelectItem value="provider">Proveedor</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre Completo</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Tu nombre completo"
                        className="pl-10"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo Electrónico</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="correo@ejemplo.com"
                        className="pl-10"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </div>
                  </FormControl>
                  {registrationError?.includes('Email rate limit exceeded') && (
                    <p className="text-xs text-blue-600 mt-1">
                      Sugerencia: Intenta usar otro correo o agrega números al final. Ejemplo: {field.value.split('@')[0]}123@{field.value.split('@')[1]}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de Teléfono</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="+52 1234567890"
                        className="pl-10"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {role === 'client' && (
              <FormField
                control={form.control}
                name="residenciaId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seleccione su Residencia</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value || ''}
                          disabled={isSubmitting || loadingResidencias}
                        >
                          <SelectTrigger className="pl-10">
                            <SelectValue placeholder={loadingResidencias ? "Cargando..." : "Elija una residencia"} />
                          </SelectTrigger>
                          <SelectContent>
                            {residencias.map((residencia) => (
                              <SelectItem key={residencia.id} value={residencia.id}>
                                {residencia.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {role === 'provider' && (
              <FormField
                control={form.control}
                name="providerResidenciaIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Residencias donde ofreces tus servicios</FormLabel>
                    {loadingResidencias ? (
                      <div className="flex items-center justify-center p-4 border rounded-md">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span>Cargando residencias...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 p-4 border rounded-md">
                        {residencias.length === 0 ? (
                          <p className="text-sm text-gray-500">No hay residencias disponibles</p>
                        ) : (
                          residencias.map((residencia) => (
                            <div key={residencia.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`residencia-checkbox-${residencia.id}`}
                                checked={field.value?.includes(residencia.id)}
                                onCheckedChange={(checked) => {
                                  const checkedArr = Array.isArray(field.value) ? field.value : [];
                                  if (checked) {
                                    field.onChange([...checkedArr, residencia.id]);
                                  } else {
                                    field.onChange(checkedArr.filter((id: string) => id !== residencia.id));
                                  }
                                }}
                                disabled={isSubmitting}
                              />
                              <label htmlFor={`residencia-checkbox-${residencia.id}`} className="text-sm font-medium">
                                {residencia.name}
                              </label>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="password"
                        placeholder="••••••"
                        className="pl-10"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full bg-navy text-white hover:bg-navy-hover"
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting || isLoading ? (
                <div className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando cuenta...
                </div>
              ) : (
                <div className="flex items-center">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Crear Cuenta
                </div>
              )}
            </Button>
          </form>
        </Form>

        <div className="mt-6 text-center">
          <p>¿Ya tienes una cuenta? {' '}
            <Link to="/login" className="text-navy hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </PageContainer>
  );
};

export default Register;
