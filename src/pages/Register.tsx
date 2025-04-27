
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
import { Mail, Lock, Phone, User, UserPlus, Building, Upload, AlertCircle, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Residencia } from '@/lib/types';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';

// Esquema de validación común para clientes y proveedores
const registerSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  email: z.string().email('Correo electrónico inválido'),
  phone: z.string().min(8, 'Número de teléfono inválido'),
  role: z.enum(['client', 'provider']),
  providerResidenciaIds: z.array(z.string()).optional(),
  residenciaId: z.string().optional(),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  confirmPassword: z.string(),
  avatarUrl: z.string().optional()
}).refine(
  (data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  }
).refine(
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
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showEmailAlert, setShowEmailAlert] = useState(false);
  const [showTipDialog, setShowTipDialog] = useState(false);
  const [alternativeEmail, setAlternativeEmail] = useState<string | null>(null);
  const [loadingResidencias, setLoadingResidencias] = useState(true);
  const { user } = useAuth();
  
  // Si el usuario ya está autenticado, redirigir al dashboard
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Cargar residencias
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
      password: '',
      confirmPassword: '',
      avatarUrl: ''
    }
  });

  // Watch role to switch form elements
  const role = form.watch('role');
  const email = form.watch('email');

  // Manejar la selección de avatar
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar el tamaño del archivo (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no debe superar los 5MB');
      return;
    }

    // Validar el tipo de archivo
    if (!file.type.startsWith('image/')) {
      toast.error('El archivo debe ser una imagen');
      return;
    }

    setAvatarFile(file);
    
    // Crear una URL para previsualizar la imagen
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
  };

  // FUNCIONES PARA MANEJO DE REGISTRO MEJORADO
  const generateAlternativeEmail = (baseEmail: string): string => {
    const emailParts = baseEmail.split('@');
    const randomSuffix = Math.floor(Math.random() * 10000);
    return `${emailParts[0]}+${randomSuffix}@${emailParts[1]}`;
  };
  
  const retryWithDifferentEmail = () => {
    if (!email) return;
    
    const newEmail = generateAlternativeEmail(email);
    setAlternativeEmail(newEmail);
    
    form.setValue('email', newEmail);
    setRegistrationError(null);
    setShowEmailAlert(false);
    
    toast.info(`Email modificado automáticamente: ${newEmail}`);
  };

  const onSubmit = async (values: RegisterFormValues) => {
    if (isSubmitting) {
      console.log('Ya hay un envío en curso, ignorando');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setRegistrationError(null);
      setShowEmailAlert(false);
      setShowTipDialog(false); // Muy importante: no mostrar el diálogo por defecto
      
      console.log('Validando formulario...');
      // Validación básica
      if (role === 'client' && !values.residenciaId) {
        toast.error('Debes seleccionar una residencia');
        setIsSubmitting(false);
        return;
      }
      
      if (role === 'provider' && (!values.providerResidenciaIds || values.providerResidenciaIds.length === 0)) {
        toast.error('Debes seleccionar al menos una residencia');
        setIsSubmitting(false);
        return;
      }

      // Mostrar estado del proceso
      toast.info('Iniciando registro, por favor espere...');
      
      // Usar el email alternativo si existe
      const emailToUse = alternativeEmail || values.email;
      console.log(`Usando email para registro: ${emailToUse}`);
      
      const dataToSend = {
        ...values,
        email: emailToUse,
        avatarFile
      };
      
      // Intentar registro
      const result = await signUp(emailToUse, values.password, dataToSend);
      
      if (result.error) {
        console.error('Error durante el registro:', result.error);
        
        // Determinar si el error está relacionado con "email ya existente"
        const errorMsg = result.error.message || "";
        const isEmailExistsError = 
          errorMsg.includes('ya está en uso') || 
          errorMsg.includes('already in use') ||
          errorMsg.includes('already registered');
        
        if (isEmailExistsError) {
          setShowEmailAlert(true);
          toast.error('Este correo ya está registrado. Intente con otro o use la variante.');
        } else {
          // Mostrar mensaje de error genérico
          toast.error(errorMsg || 'Error durante el registro');
        }
        
        setRegistrationError(result.error.message || "Error desconocido");
      } else if (result.data?.session) {
        // Si tenemos sesión, el usuario fue registrado y autenticado con éxito
        console.log('Registro y autenticación exitosos!');
        toast.success('¡Cuenta creada e iniciada sesión exitosamente!');
        navigate('/payment-setup', { 
          state: { fromClientView: values.role === 'client' } 
        });
      } else {
        // Registro exitoso pero necesita confirmar email o iniciar sesión
        console.log('Registro exitoso, redirigiendo a login!');
        toast.success('¡Cuenta creada! Por favor inicie sesión.');
        navigate('/login');
      }
    } catch (error: any) {
      console.error('Error capturado en onSubmit:', error);
      
      // Mensaje de error genérico, ya que los específicos se manejan en signUp
      setRegistrationError(error.message || "Error desconocido durante el registro");
      toast.error(error.message || "Error durante el registro");
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
        {showEmailAlert && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4 mr-2" />
            <AlertDescription className="text-sm">
              {registrationError || "Este correo electrónico ya está en uso. Por favor, intenta con un correo electrónico diferente o usa el botón para generar una variación del mismo."}
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2 w-full"
                onClick={retryWithDifferentEmail}
              >
                Usar variación de email
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        {registrationError && !showEmailAlert && (
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

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Foto de Perfil</label>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    {avatarPreview ? (
                      <AvatarImage src={avatarPreview} alt="Avatar preview" />
                    ) : (
                      <AvatarFallback>
                        <User className="h-10 w-10 text-gray-400" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <input
                    type="file"
                    id="avatar"
                    className="hidden"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    disabled={isSubmitting}
                  />
                </div>
                <label
                  htmlFor="avatar"
                  className="cursor-pointer inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Subir imagen
                </label>
              </div>
              <p className="text-xs text-gray-500">
                Opcional. Formatos: JPG, PNG. Máximo 5MB.
              </p>
            </div>

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
                        className={`pl-10 ${alternativeEmail ? 'bg-yellow-50 border-yellow-300' : ''}`}
                        {...field}
                        disabled={isSubmitting}
                      />
                    </div>
                  </FormControl>
                  {alternativeEmail && (
                    <p className="text-xs text-amber-600">
                      Se utilizará una variante del correo para evitar limitaciones de registro
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

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar Contraseña</FormLabel>
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

      <Dialog open={showTipDialog} onOpenChange={setShowTipDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Consejos para completar el registro</DialogTitle>
            <DialogDescription>
              Estamos detectando problemas con el registro. Esto puede ocurrir cuando Supabase tiene registros "fantasma" o en caché.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-4">
                <h3 className="font-semibold mb-2">Soluciones recomendadas:</h3>
                <ul className="list-disc pl-5 space-y-2 text-sm">
                  <li>Usa el botón "Usar variación de email" para crear una variante de tu correo (esto añade +número a tu email actual).</li>
                  <li>Usa un correo electrónico completamente diferente que no hayas usado antes.</li>
                  <li>Espera 30-60 minutos y vuelve a intentarlo (los límites de registro pueden restablecerse).</li>
                  <li>Limpia el caché y cookies del navegador, o intenta desde un navegador privado/incógnito.</li>
                  <li>Si tienes acceso a Supabase, verifica la tabla Auth para confirmar si el usuario existe realmente.</li>
                </ul>
              </CardContent>
            </Card>
            <Button 
              className="w-full" 
              onClick={retryWithDifferentEmail}
              variant="default"
            >
              Crear variación de email automáticamente
            </Button>
            <Button 
              className="w-full" 
              onClick={() => setShowTipDialog(false)}
              variant="outline"
            >
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};

export default Register;
