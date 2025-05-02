
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Mail, Lock, Phone, User, UserPlus, Building, Loader2, AlertCircle } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Residencia, UserRole } from '@/lib/types';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

// Esquema modificado que no incluye la selección de rol
export const registerSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  email: z.string().email('Correo electrónico inválido'),
  phone: z.string().min(8, 'Número de teléfono inválido'),
  providerResidenciaIds: z.array(z.string()).optional(),
  residenciaId: z.string().optional(),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres')
}).refine(
  (data) => {
    // La validación dependerá del contexto del formulario
    return true;
  },
  {
    message: "Campo requerido",
    path: ["residenciaId"],
  }
);

export type RegisterFormValues = z.infer<typeof registerSchema>;

interface RegisterFormProps {
  residencias: Residencia[];
  loadingResidencias: boolean;
  onRegisterSuccess?: (userData: any) => void;
  onGoogleSignIn?: () => void;
  userRole: UserRole; // Ahora recibimos el rol como prop
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  residencias,
  loadingResidencias,
  onRegisterSuccess,
  onGoogleSignIn,
  userRole
}) => {
  const { signUp, isLoading } = useSupabaseAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  
  // Refinamos el esquema según el rol del usuario
  const formSchema = z.object({
    name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
    email: z.string().email('Correo electrónico inválido'),
    phone: z.string().min(8, 'Número de teléfono inválido'),
    providerResidenciaIds: userRole === 'provider' ? z.array(z.string()).min(1, 'Selecciona al menos una residencia') : z.array(z.string()).optional(),
    residenciaId: userRole === 'client' ? z.string().min(1, 'Selecciona una residencia') : z.string().optional(),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres')
  });
  
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      providerResidenciaIds: [],
      residenciaId: '',
      password: ''
    }
  });

  const email = form.watch('email');

  const onSubmit = async (values: RegisterFormValues) => {
    if (isSubmitting) {
      console.log('Ya hay un envío en curso, ignorando');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setRegistrationError(null);
      
      if (userRole === 'client' && !values.residenciaId) {
        setRegistrationError('Debes seleccionar una residencia');
        return;
      }
      
      if (userRole === 'provider' && (!values.providerResidenciaIds || values.providerResidenciaIds.length === 0)) {
        setRegistrationError('Debes seleccionar al menos una residencia');
        return;
      }

      console.log('Datos de registro:', values);
      
      const userData = {
        name: values.name,
        phone: values.phone,
        role: userRole, // Usamos el rol predefinido
        residenciaId: userRole === 'client' ? values.residenciaId : null,
        providerResidenciaIds: userRole === 'provider' ? values.providerResidenciaIds : []
      };
      
      const result = await signUp(values.email, values.password, userData);
      
      if (result.error) {
        console.error('Error durante el registro:', result.error);
        
        if (result.error.message.includes('teléfono ya está en uso')) {
          setRegistrationError('Este número de teléfono ya está registrado. Por favor, utilice otro número.');
        } else if (result.error.message.includes('Email rate limit exceeded')) {
          const suggestedEmail = `${values.email.split('@')[0]}_${Math.floor(Math.random() * 1000)}@${values.email.split('@')[1]}`;
          setRegistrationError(`Has alcanzado el límite de intentos de registro con este correo. Por favor utiliza otra dirección de correo (por ejemplo: ${suggestedEmail}) o intenta más tarde.`);
        } else if (result.error.message.includes('Email signups are disabled')) {
          setRegistrationError('El registro por correo está deshabilitado. Por favor, inténtalo más tarde o utiliza el inicio de sesión con Google.');
        } else {
          setRegistrationError(result.error.message || "Error desconocido");
        }
      } else if (result.data?.user) {
        console.log('Registro exitoso!');
        if (onRegisterSuccess) {
          onRegisterSuccess({ 
            user: result.data.user
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {registrationError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4 mr-2" />
            <AlertDescription className="text-sm">{registrationError}</AlertDescription>
          </Alert>
        )}
        
        {onGoogleSignIn && (
          <div className="space-y-4">
            <Button 
              type="button" 
              variant="outline" 
              className="w-full flex items-center justify-center gap-2" 
              onClick={onGoogleSignIn}
              disabled={isSubmitting || isLoading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5">
                <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
                <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
                <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
                <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
              </svg>
              Continuar con Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">O registrarse con email</span>
              </div>
            </div>
          </div>
        )}

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

        {/* Mostramos campos específicos según el rol */}
        {userRole === 'client' && (
          <ClientResidenceField 
            residencias={residencias} 
            isSubmitting={isSubmitting} 
            loadingResidencias={loadingResidencias} 
            form={form} 
          />
        )}
        
        {userRole === 'provider' && (
          <ProviderResidencesField 
            residencias={residencias} 
            isSubmitting={isSubmitting} 
            loadingResidencias={loadingResidencias} 
            form={form} 
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

        <div className="text-center">
          <p>¿Ya tienes una cuenta? {' '}
            <Link to="/login" className="text-navy hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
      </form>
    </Form>
  );
};

// Componente para la selección de residencia de cliente
interface ClientResidenceFieldProps {
  residencias: Residencia[];
  isSubmitting: boolean;
  loadingResidencias: boolean;
  form: any;
}

const ClientResidenceField: React.FC<ClientResidenceFieldProps> = ({ 
  residencias, 
  isSubmitting, 
  loadingResidencias,
  form 
}) => {
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
};

// Componente para la selección de residencias de proveedor
interface ProviderResidencesFieldProps {
  residencias: Residencia[];
  isSubmitting: boolean;
  loadingResidencias: boolean;
  form: any;
}

const ProviderResidencesField: React.FC<ProviderResidencesFieldProps> = ({ 
  residencias, 
  isSubmitting, 
  loadingResidencias,
  form 
}) => {
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
};
