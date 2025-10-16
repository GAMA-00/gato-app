import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Mail, Lock, User, UserPlus, Loader2, AlertCircle, Upload, Eye, EyeOff } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PhoneInput } from '@/components/ui/phone-input';
import { Residencia, UserRole } from '@/lib/types';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import ClientResidenceField from './ClientResidenceField';
import ProviderResidencesField from './ProviderResidencesField';
import { unifiedAvatarUpload } from '@/utils/unifiedAvatarUpload';
import { supabase } from '@/integrations/supabase/client';

// Esquema simplificado sin confirmación de contraseña
export const registerSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  email: z.string().email('Correo electrónico inválido'),
  phone: z.string()
    .regex(/^\+506\d{8}$/, 'Debe ser un número costarricense válido (+506 + 8 dígitos)')
    .length(12, 'El número debe tener exactamente 8 dígitos'),
  providerResidenciaIds: z.array(z.string()).optional(),
  residenciaId: z.string().optional(),
  condominiumId: z.string().optional(),
  houseNumber: z.string().optional(),
  profileImage: z.any().optional(),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres')
});

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
  const { signUp, loading } = useSupabaseAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1); // Para manejar los pasos del formulario
  const [showPassword, setShowPassword] = useState(false); // Para controlar visibilidad de contraseña
  
  // Refinamos el esquema según el rol del usuario
  const formSchema = z.object({
    name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
    email: z.string().email('Correo electrónico inválido'),
    phone: z.string()
      .regex(/^\+506\d{8}$/, 'Debe ser un número costarricense válido (+506 + 8 dígitos)')
      .length(12, 'El número debe tener exactamente 8 dígitos'),
    providerResidenciaIds: userRole === 'provider' ? z.array(z.string()).min(1, 'Selecciona al menos una residencia') : z.array(z.string()).optional(),
    residenciaId: userRole === 'client' ? z.string().min(1, 'Selecciona una residencia') : z.string().optional(),
    condominiumId: userRole === 'client' ? z.string().min(1, 'Selecciona un condominio') : z.string().optional(),
    houseNumber: userRole === 'client' ? z.string().min(1, 'Ingresa el número de casa') : z.string().optional(),
    profileImage: z.any().optional(),
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
      condominiumId: '',
      houseNumber: '',
      profileImage: null,
      password: ''
    }
  });

  // Función para validar y avanzar al siguiente paso (solo para clientes)
  const handleNextStep = async () => {
    if (userRole !== 'client') return;
    
    setRegistrationError(null);
    
    // Validar campos del paso 1
    const step1Fields = ['name', 'email', 'password'] as const;
    const step1Valid = await form.trigger(step1Fields);
    
    if (step1Valid) {
      setCurrentStep(2);
    }
  };

  // Función para ir al paso anterior
  const handlePreviousStep = () => {
    setCurrentStep(1);
    setRegistrationError(null);
  };

  const onSubmit = async (values: RegisterFormValues) => {
    if (isSubmitting) {
      console.log('Ya hay un envío en curso, ignorando');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setRegistrationError(null);
      
      // Store profile image for later upload after user creation
      let profileImageToUpload = null;
      if (userRole === 'provider' && values.profileImage) {
        console.log('Storing profile image for post-registration upload...');
        profileImageToUpload = values.profileImage;
      }
      
      if (userRole === 'client' && !values.residenciaId) {
        setRegistrationError('Debes seleccionar una residencia');
        return;
      }
      
      if (userRole === 'client' && !values.condominiumId) {
        setRegistrationError('Debes seleccionar un condominio');
        return;
      }
      
      if (userRole === 'client' && !values.houseNumber) {
        setRegistrationError('Debes ingresar el número de casa');
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
        role: userRole,
        residenciaId: userRole === 'client' ? values.residenciaId : null,
        condominiumId: userRole === 'client' ? values.condominiumId : null,
        houseNumber: userRole === 'client' ? values.houseNumber : null,
        providerResidenciaIds: userRole === 'provider' ? values.providerResidenciaIds : [],
        avatarUrl: '' // Will be updated after user creation
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
        console.log('RegisterForm: Registro exitoso! User ID:', result.data.user.id);
        console.log('RegisterForm: User metadata sent:', userData);
        
        // Upload avatar after user creation if provided - FIX usando unified system
        if (profileImageToUpload && result.data.user.id) {
          console.log('🔵 RegisterForm: Uploading avatar with unified system...');
          try {
            const avatarUrl = await unifiedAvatarUpload(profileImageToUpload, result.data.user.id);
            console.log('✅ RegisterForm: Avatar uploaded successfully:', avatarUrl);
          } catch (avatarError) {
            console.warn('⚠️ RegisterForm: Avatar upload failed:', avatarError);
            // No bloqueamos el registro si falla el avatar
          }
        }
        
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
        
        {/* Sistema de dos pasos solo para clientes */}
        {userRole === 'client' ? (
          <>
            {/* Paso 1: Información básica */}
            {currentStep === 1 && (
              <>
                {onGoogleSignIn && (
                  <div className="space-y-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full flex items-center justify-center gap-2" 
                      onClick={onGoogleSignIn}
                      disabled={isSubmitting || loading}
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
                      <FormLabel className="text-base font-medium">Nombre Completo</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Tu nombre completo"
                            className="pl-10 h-12 text-base"
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
                      <FormLabel className="text-base font-medium">Correo Electrónico</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="correo@ejemplo.com"
                            className="pl-10 h-12 text-base"
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
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">Contraseña</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Tu contraseña"
                            className="pl-10 pr-10 h-12 text-base"
                            {...field}
                            disabled={isSubmitting}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-12 w-10 px-0 py-0 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="button" 
                  onClick={handleNextStep}
                  className="w-full bg-navy text-white hover:bg-navy-hover h-12 text-base font-medium"
                  disabled={isSubmitting || loading}
                >
                  Siguiente
                </Button>
              </>
            )}

            {/* Paso 2: Información de ubicación */}
            {currentStep === 2 && (
              <>
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
                      <FormLabel className="text-base font-medium">Número de Teléfono</FormLabel>
                  <FormControl>
                    <PhoneInput
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isSubmitting}
                      placeholder="12345678"
                    />
                  </FormControl>
                  <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3">
                  <Button 
                    type="button" 
                    onClick={handlePreviousStep}
                    variant="outline"
                    className="flex-1 h-12 text-base font-medium"
                    disabled={isSubmitting || loading}
                  >
                    Atrás
                  </Button>
                  
                  <Button 
                    type="submit" 
                    className="flex-1 bg-navy text-white hover:bg-navy-hover h-12 text-base font-medium"
                    disabled={isSubmitting || loading}
                  >
                    {isSubmitting || loading ? (
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
                </div>
              </>
            )}

            <div className="text-center">
              <p className="text-base">¿Ya tienes una cuenta? {' '}
                <Link to="/login" className="text-navy hover:underline font-medium">
                  Inicia sesión
                </Link>
              </p>
            </div>
          </>
        ) : (
          /* Formulario completo para proveedores (mantener el actual) */
          <>
            {onGoogleSignIn && (
              <div className="space-y-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full flex items-center justify-center gap-2" 
                  onClick={onGoogleSignIn}
                  disabled={isSubmitting || loading}
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
                  <FormLabel className="text-base font-medium">Nombre Completo</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Tu nombre completo"
                        className="pl-10 h-12 text-base"
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
                  <FormLabel className="text-base font-medium">Correo Electrónico</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="correo@ejemplo.com"
                        className="pl-10 h-12 text-base"
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
                  <FormLabel className="text-base font-medium">Número de Teléfono</FormLabel>
              <FormControl>
                <PhoneInput
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isSubmitting}
                  placeholder="12345678"
                />
              </FormControl>
              <FormMessage />
                </FormItem>
              )}
            />

            <ProviderResidencesField 
              residencias={residencias} 
              isSubmitting={isSubmitting} 
              loadingResidencias={loadingResidencias} 
              form={form} 
            />
            
            {/* Profile Image Field for Providers */}
            <FormField
              control={form.control}
              name="profileImage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">Foto de perfil</FormLabel>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      {profileImagePreview ? (
                        <AvatarImage 
                          src={profileImagePreview}
                          alt="Profile preview" 
                        />
                      ) : (
                        <AvatarFallback className="text-lg">
                          {form.getValues('name')?.charAt(0) || '?'}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <FormControl>
                      <div>
                        <label className="flex items-center gap-2 cursor-pointer p-2 bg-muted rounded-md hover:bg-muted/80 transition-colors">
                          <Upload className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Subir imagen</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                field.onChange(file);
                                const previewUrl = URL.createObjectURL(file);
                                setProfileImagePreview(previewUrl);
                              }
                            }}
                            disabled={isSubmitting}
                          />
                        </label>
                      </div>
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">Contraseña</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Tu contraseña"
                        className="pl-10 pr-10 h-12 text-base"
                        {...field}
                        disabled={isSubmitting}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-12 w-10 px-0 py-0 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full bg-navy text-white hover:bg-navy-hover h-12 text-base font-medium"
              disabled={isSubmitting || loading}
            >
              {isSubmitting || loading ? (
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
              <p className="text-base">¿Ya tienes una cuenta? {' '}
                <Link to="/login" className="text-navy hover:underline font-medium">
                  Inicia sesión
                </Link>
              </p>
            </div>
          </>
        )}
      </form>
    </Form>
  );
};
