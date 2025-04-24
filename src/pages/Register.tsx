
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
import { Mail, Lock, Phone, User, UserPlus, Building, Image } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Residencia } from '@/lib/types';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { supabase } from '@/integrations/supabase/client';

const registerSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  email: z.string().email('Correo electrónico inválido'),
  phone: z.string().min(8, 'Número de teléfono inválido'),
  role: z.enum(['client', 'provider']),
  providerResidenciaIds: z.array(z.string()).optional(),
  residenciaId: z.string().min(1, 'Debe seleccionar una residencia').optional(), // Para clientes
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  confirmPassword: z.string(),
  profileImage: z.any().optional() // será validado/manual para el proveedor
}).refine(
  (data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  }
).refine(
  (data) =>
    (data.role === 'client' && !!data.residenciaId) ||
    (data.role === 'provider' && data.providerResidenciaIds && data.providerResidenciaIds.length > 0),
  {
    message: "Debe seleccionar al menos una residencia",
    path: ["providerResidenciaIds"],
  }
).refine(
  (data) =>
    data.role === 'client' || (data.role === 'provider' && !!data.profileImage && typeof data.profileImage !== "string"),
  {
    message: "Debes adjuntar una foto de perfil como proveedor",
    path: ["profileImage"],
  }
);

type RegisterFormValues = z.infer<typeof registerSchema>;

const Register = () => {
  const navigate = useNavigate();
  const { signUp } = useSupabaseAuth();
  const [profilePreview, setProfilePreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [residencias, setResidencias] = useState<Residencia[]>([]);
  const [registrationError, setRegistrationError] = useState<string | null>(null);

  // Cargar residencias desde la base de datos
  useEffect(() => {
    const fetchResidencias = async () => {
      try {
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
      profileImage: undefined,
    }
  });

  // Watch role to switch form elements
  const role = form.watch('role');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      console.log('Imagen seleccionada:', file.name, 'tamaño:', file.size);
      form.setValue('profileImage', file, { shouldValidate: true });
      setProfilePreview(URL.createObjectURL(file));
    }
  };

  const onSubmit = async (values: RegisterFormValues) => {
    console.log('[Register] Inicio de envío del formulario');
    console.log('[Register] Valores del formulario:', JSON.stringify(values, (key, value) => {
      if (key === 'profileImage' && value instanceof File) return `[File: ${value.name}]`;
      return value;
    }, 2));
    
    if (isSubmitting) {
      console.log('[Register] Ya hay una solicitud en curso, ignorando');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setRegistrationError(null);
      
      // Verificar validaciones específicas
      console.log('[Register] Verificando validaciones específicas');
      
      if (values.role === 'provider') {
        console.log('[Register] Modo proveedor detectado');
        
        // Verificar imagen de perfil
        const tieneImagen = values.profileImage && typeof values.profileImage !== "string";
        console.log('[Register] ¿Tiene imagen válida?', tieneImagen);
        if (!tieneImagen) {
          toast.error('Debes adjuntar una foto de perfil como proveedor');
          setIsSubmitting(false);
          return;
        }
        
        // Verificar residencias seleccionadas
        const tieneResidencias = values.providerResidenciaIds && values.providerResidenciaIds.length > 0;
        console.log('[Register] ¿Tiene residencias seleccionadas?', tieneResidencias);
        if (!tieneResidencias) {
          toast.error('Debes seleccionar al menos una residencia donde ofreces servicios');
          setIsSubmitting(false);
          return;
        }
      }
      
      // Para cliente: residenciaId simple. Para proveedor: providerResidenciaIds.
      let selectedResidenciaId = '';
      
      if (values.role === 'provider' && values.providerResidenciaIds && values.providerResidenciaIds.length > 0) {
        // Para proveedores, tomamos la primer residencia seleccionada como principal
        selectedResidenciaId = values.providerResidenciaIds[0] || '';
        const selectedResidenciaNames = residencias
          .filter(r => values.providerResidenciaIds!.includes(r.id))
          .map(r => r.name);
        console.log('[Register] Residencias seleccionadas para proveedor:', selectedResidenciaNames);
      }
      
      if (values.role === 'client' && values.residenciaId) {
        selectedResidenciaId = values.residenciaId;
        const selectedResidencia = residencias.find(r => r.id === values.residenciaId);
        console.log('[Register] Residencia seleccionada para cliente:', selectedResidencia?.name);
      }

      const userData = {
        name: values.name,
        phone: values.phone,
        role: values.role,
        residenciaId: selectedResidenciaId,
        offerResidencias: values.role === 'provider' 
          ? values.providerResidenciaIds 
          : [values.residenciaId].filter(Boolean)
      };
      
      console.log('[Register] Enviando datos de registro a useSupabaseAuth');
      console.log('[Register] Datos de usuario:', JSON.stringify(userData, null, 2));

      // Intentar registrar al usuario
      const result = await signUp(values.email, values.password, userData);
      
      console.log('[Register] Resultado del registro:', { 
        success: !!result.data, 
        error: result.error ? result.error.message : null 
      });
      
      if (result.error) {
        console.error('[Register] Error en registro:', result.error);
        setRegistrationError(result.error.message || 'Ha ocurrido un error durante el registro');
        toast.error(`Error en registro: ${result.error.message || 'Ha ocurrido un error durante el registro'}`);
      } else {
        console.log('[Register] Registro exitoso, redirigiendo a /payment-setup');
        toast.success('¡Cuenta creada exitosamente!');
        navigate('/payment-setup', { 
          state: { fromClientView: values.role === 'client' } 
        });
      }
    } catch (error: any) {
      console.error('[Register] Error en el proceso de registro:', error);
      setRegistrationError(error.message || 'Ha ocurrido un error inesperado');
      toast.error(`Error: ${error.message || 'Ha ocurrido un error inesperado'}`);
    } finally {
      console.log('[Register] Finalizando proceso de envío');
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
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            <p className="text-sm">{registrationError}</p>
          </div>
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

            {/* Nombre */}
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

            {/* Foto de perfil SOLO proveedor */}
            {role === 'provider' && (
              <FormField
                control={form.control}
                name="profileImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Foto de Perfil
                    </FormLabel>
                    <FormControl>
                      <div className="flex gap-4 items-center">
                        <label className={`flex items-center gap-2 ${!isSubmitting ? 'cursor-pointer' : 'opacity-70'}`}>
                          <Image className="h-6 w-6 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Adjuntar imagen</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageChange}
                            disabled={isSubmitting}
                          />
                        </label>
                        {profilePreview && (
                          <img
                            src={profilePreview}
                            alt="Vista previa"
                            className="h-12 w-12 rounded-full ring-2 object-cover"
                          />
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Email */}
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
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Teléfono */}
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

            {/* Residencias - Cliente */}
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
                          disabled={isSubmitting}
                        >
                          <SelectTrigger className="pl-10">
                            <SelectValue placeholder="Elija una residencia" />
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

            {/* Residencias - Proveedor */}
            {role === 'provider' && (
              <FormField
                control={form.control}
                name="providerResidenciaIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Residencias donde ofreces tus servicios</FormLabel>
                    <div className="flex flex-col gap-2">
                      {residencias.map((residencia) => (
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
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Contraseña */}
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

            {/* Confirmar Contraseña */}
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

            {/* Botón de envío */}
            <Button 
              type="submit" 
              className="w-full bg-navy text-white hover:bg-navy-hover"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>Creando cuenta...</>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Crear Cuenta
                </>
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
