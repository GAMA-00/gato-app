import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Mail, Lock, Phone, User, UserPlus, Building, Loader2, AlertCircle, Info } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Residencia, UserRole } from '@/lib/types';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const registerSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  email: z.string().email('Correo electrónico inválido'),
  phone: z.string().min(8, 'Número de teléfono inválido'),
  role: z.enum(['client', 'provider']),
  providerResidenciaIds: z.array(z.string()).optional(),
  residenciaId: z.string().optional(),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  cleanupFirst: z.boolean().optional().default(false),
  useManualRegistration: z.boolean().optional().default(false),
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

export type RegisterFormValues = z.infer<typeof registerSchema>;

interface RegisterFormProps {
  residencias: Residencia[];
  loadingResidencias: boolean;
  onRegisterSuccess?: (userData: any) => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  residencias,
  loadingResidencias,
  onRegisterSuccess
}) => {
  const { signUp, manualSignUp, isLoading, hasRateLimitError } = useSupabaseAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [registrationMode, setRegistrationMode] = useState<'normal' | 'advanced'>('normal');
  const [debugMode, setDebugMode] = useState(false);
  
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      role: 'client',
      providerResidenciaIds: [],
      residenciaId: '',
      password: '',
      cleanupFirst: false,
      useManualRegistration: false
    }
  });

  const role = form.watch('role');
  const email = form.watch('email');
  const useManualRegistration = form.watch('useManualRegistration');
  const cleanupFirst = form.watch('cleanupFirst');

  const onSubmit = async (values: RegisterFormValues) => {
    if (isSubmitting) {
      console.log('Ya hay un envío en curso, ignorando');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setRegistrationError(null);
      
      if (role === 'client' && !values.residenciaId) {
        setRegistrationError('Debes seleccionar una residencia');
        return;
      }
      
      if (role === 'provider' && (!values.providerResidenciaIds || values.providerResidenciaIds.length === 0)) {
        setRegistrationError('Debes seleccionar al menos una residencia');
        return;
      }

      console.log('Datos de registro:', values);
      
      const userData = {
        name: values.name,
        phone: values.phone,
        role: values.role,
        residenciaId: values.role === 'client' ? values.residenciaId : null,
        providerResidenciaIds: values.role === 'provider' ? values.providerResidenciaIds : [],
        cleanupFirst: values.cleanupFirst
      };
      
      // Choose between normal and manual registration
      const result = values.useManualRegistration 
        ? await manualSignUp(values.email, values.password, userData) 
        : await signUp(values.email, values.password, userData);
      
      if (result.error) {
        console.error('Error durante el registro:', result.error);
        
        if (result.error.message.includes('teléfono ya está en uso')) {
          setRegistrationError('Este número de teléfono ya está registrado. Por favor, utilice otro número.');
        } else if (result.error.message.includes('Email rate limit exceeded')) {
          const randomNum = Math.floor(Math.random() * 10000);
          const suggestedEmail = `${values.email.split('@')[0]}_${randomNum}@${values.email.split('@')[1]}`;
          setRegistrationError(`Has alcanzado el límite de intentos de registro con este correo. Prueba con otro correo como ${suggestedEmail}, activa "Limpiar datos antiguos" o usa el "Modo avanzado".`);
        } else {
          setRegistrationError(result.error.message || "Error desconocido");
        }
      } else if (result.data?.user) {
        console.log('Registro exitoso!');
        if (onRegisterSuccess) {
          onRegisterSuccess({ 
            user: result.data.user, 
            role: values.role as UserRole 
          });
        }
      } 
    } catch (error: any) {
      console.error('Error capturado en onSubmit:', error);
      setRegistrationError(error.message || "Error desconocido durante el registro");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleDebugMode = () => {
    setDebugMode(!debugMode);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs value={registrationMode} onValueChange={(val) => setRegistrationMode(val as 'normal' | 'advanced')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="normal">Registro Normal</TabsTrigger>
            <TabsTrigger value="advanced">Opciones Avanzadas</TabsTrigger>
          </TabsList>
          
          <TabsContent value="normal">
            {registrationError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4 mr-2" />
                <AlertDescription className="text-sm">{registrationError}</AlertDescription>
              </Alert>
            )}
          </TabsContent>
          
          <TabsContent value="advanced">
            <Alert>
              <Info className="h-4 w-4 mr-2" />
              <AlertDescription>
                <p className="text-sm mb-3">Opciones avanzadas para problemas de registro:</p>
                
                <div className="flex items-start space-x-2 mb-2">
                  <Checkbox
                    id="cleanup"
                    checked={cleanupFirst}
                    onCheckedChange={(val) => form.setValue('cleanupFirst', !!val)}
                  />
                  <div>
                    <label htmlFor="cleanup" className="text-sm font-medium cursor-pointer">
                      Limpiar datos antiguos
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Elimina cualquier registro previo asociado a este email antes de crear el nuevo usuario
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="manual-reg"
                    checked={useManualRegistration}
                    onCheckedChange={(val) => form.setValue('useManualRegistration', !!val)}
                  />
                  <div>
                    <label htmlFor="manual-reg" className="text-sm font-medium cursor-pointer">
                      Registro Manual (Emergencia)
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Crea el registro directamente en la base de datos sin pasar por Auth. Para uso solo si el registro normal falla persistentemente.
                    </p>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
            
            {registrationError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4 mr-2" />
                <AlertDescription className="text-sm">{registrationError}</AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
        
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

        <ResidenceFields 
          role={role} 
          residencias={residencias} 
          isSubmitting={isSubmitting} 
          loadingResidencias={loadingResidencias} 
          form={form} 
        />

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
              {useManualRegistration ? 'Crear Cuenta (Modo Manual)' : 'Crear Cuenta'}
            </div>
          )}
        </Button>

        <div className="text-center">
          <p>¿Ya tienes una cuenta? {' '}
            <Link to="/login" className="text-navy hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
        
        {debugMode && (
          <div className="mt-4 p-3 border rounded bg-gray-50 text-xs">
            <h4 className="font-bold">Debug Info:</h4>
            <pre>
              {JSON.stringify({
                email,
                role,
                useManualRegistration,
                cleanupFirst
              }, null, 2)}
            </pre>
          </div>
        )}
        
        <div className="text-center mt-2">
          <button 
            type="button"
            onClick={toggleDebugMode}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            {debugMode ? 'Ocultar debug' : '••••'}
          </button>
        </div>
      </form>
    </Form>
  );
};

interface ResidenceFieldsProps {
  role: string;
  residencias: Residencia[];
  isSubmitting: boolean;
  loadingResidencias: boolean;
  form: any;
}

const ResidenceFields: React.FC<ResidenceFieldsProps> = ({ 
  role, 
  residencias, 
  isSubmitting, 
  loadingResidencias,
  form 
}) => {
  if (role === 'client') {
    return (
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
    );
  }

  if (role === 'provider') {
    return (
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
    );
  }

  return null;
};
