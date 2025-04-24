
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
).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

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
    console.log('Formulario enviado con valores:', JSON.stringify(values, (key, value) => {
      // No mostrar el archivo de imagen completo en el log, solo un indicador
      if (key === 'profileImage' && value instanceof File) return `[File: ${value.name}]`;
      return value;
    }));
    
    // Depuración: Verificando validaciones específicas para proveedores
    if (values.role === 'provider') {
      console.log('Modo proveedor detectado');
      console.log('Imagen de perfil:', values.profileImage ? 'Presente' : 'Ausente');
      console.log('Residencias seleccionadas:', values.providerResidenciaIds);
      
      // Verificar validación de imagen
      const tieneImagen = values.profileImage && typeof values.profileImage !== "string";
      console.log('¿Tiene imagen válida?', tieneImagen);
      
      // Verificar validación de residencias
      const tieneResidencias = values.providerResidenciaIds && values.providerResidenciaIds.length > 0;
      console.log('¿Tiene residencias seleccionadas?', tieneResidencias);
      
      if (!tieneImagen || !tieneResidencias) {
        console.warn('Falló validación de proveedor:', !tieneImagen ? 'Falta imagen' : 'Faltan residencias');
      }
    }
    
    setRegistrationError(null);
    
    if (isSubmitting) {
      console.log('Ya hay una solicitud en curso, ignorando el envío');
      return;
    }
    
    try {
      setIsSubmitting(true);
      console.log('Iniciando proceso de registro...');
      
      // Para cliente: residenciaId simple. Para proveedor: providerResidenciaIds.
      let selectedResidenciaId = '';
      let selectedResidenciaNames: string[] = [];
      
      if (values.role === 'provider' && values.providerResidenciaIds) {
        // Para proveedores, tomamos la primer residencia seleccionada como principal
        selectedResidenciaId = values.providerResidenciaIds[0] || '';
        selectedResidenciaNames = residencias.filter(r => values.providerResidenciaIds!.includes(r.id)).map(r => r.name);
        console.log('Residencias seleccionadas para proveedor:', selectedResidenciaNames);
      }
      
      if (values.role === 'client' && values.residenciaId) {
        selectedResidenciaId = values.residenciaId;
        const selectedResidencia = residencias.find(r => r.id === values.residenciaId);
        selectedResidenciaNames = [selectedResidencia?.name || ''];
        console.log('Residencia seleccionada para cliente:', selectedResidenciaNames[0]);
      }

      const userData = {
        name: values.name,
        phone: values.phone,
        role: values.role,
        residenciaId: selectedResidenciaId,
        residenciaName: selectedResidenciaNames[0] || '',
        offerResidencias: values.role === 'provider' ? values.providerResidenciaIds : [values.residenciaId].filter(Boolean)
      };
      
      console.log('Enviando datos de usuario a signUp:', JSON.stringify(userData));

      const { error } = await signUp(values.email, values.password, userData);
      
      if (error) {
        console.error('Error en registro:', error);
        setRegistrationError(error.message || 'Ha ocurrido un error durante el registro');
        toast.error(`Error en registro: ${error.message || 'Ha ocurrido un error durante el registro'}`);
      } else {
        console.log('Registro exitoso, redirigiendo a /payment-setup');
        toast.success('¡Cuenta creada exitosamente!');
        navigate('/payment-setup', { 
          state: { fromClientView: values.role === 'client' } 
        });
      }
    } catch (error: any) {
      console.error('Error en el proceso de registro:', error);
      setRegistrationError(error.message || 'Ha ocurrido un error inesperado');
      toast.error(`Error: ${error.message || 'Ha ocurrido un error inesperado'}`);
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Image className="h-6 w-6 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Adjuntar imagen</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageChange}
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
                      />
                    </div>
                  </FormControl>
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
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Residencias */}
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
                        <Select onValueChange={field.onChange} value={field.value || ''}>
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
