import React, { useState } from 'react';
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
import { Building as BuildingType } from '@/lib/types';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

// Mock buildings data
const MOCK_BUILDINGS: BuildingType[] = [
  { id: '1', name: 'Colinas de Montealegre', address: 'Tres Rios' },
  { id: '2', name: 'Gregal', address: 'Tres Rios' },
  { id: '3', name: 'El Herran', address: 'Tres Rios' }
];

const registerSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  email: z.string().email('Correo electrónico inválido'),
  phone: z.string().min(8, 'Número de teléfono inválido'),
  role: z.enum(['client', 'provider']),
  providerBuildingIds: z.array(z.string()).optional(),
  buildingId: z.string().min(1, 'Debe seleccionar una residencia').optional(), // Para clientes
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  confirmPassword: z.string(),
  profileImage: z.any().optional() // será validado/manual para el proveedor
}).refine(
  (data) =>
    (data.role === 'client' && !!data.buildingId) ||
    (data.role === 'provider' && data.providerBuildingIds && data.providerBuildingIds.length > 0),
  {
    message: "Debe seleccionar al menos una residencia",
    path: ["providerBuildingIds"],
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

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      role: 'client',
      providerBuildingIds: [],
      buildingId: '',
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
      form.setValue('profileImage', file, { shouldValidate: true });
      setProfilePreview(URL.createObjectURL(file));
    }
  };

  const onSubmit = async (values: RegisterFormValues) => {
    // Para cliente: buildingId simple. Para proveedor: providerBuildingIds.
    let selectedBuildingNames: string[] = [];
    if (values.role === 'provider' && values.providerBuildingIds) {
      selectedBuildingNames = MOCK_BUILDINGS.filter(b => values.providerBuildingIds!.includes(b.id)).map(b => b.name);
    }
    if (values.role === 'client' && values.buildingId) {
      selectedBuildingNames = [MOCK_BUILDINGS.find(b => b.id === values.buildingId)?.name || ''];
    }

    const userData = {
      name: values.name,
      phone: values.phone,
      role: values.role,
      buildingId: values.role === 'client' ? values.buildingId : values.providerBuildingIds?.[0],
      buildingName: selectedBuildingNames[0] || '',
      offerBuildings: values.providerBuildingIds
    };

    const { error } = await signUp(values.email, values.password, userData);
    
    if (!error) {
      navigate('/payment-setup', { 
        state: { fromClientView: values.role === 'client' } 
      });
    }
  };

  return (
    <PageContainer
      title="Crear Cuenta"
      subtitle="Regístrate para agendar u ofrecer servicios"
    >
      <div className="max-w-md mx-auto mt-8">
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
                name="buildingId"
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
                            {MOCK_BUILDINGS.map((building) => (
                              <SelectItem key={building.id} value={building.id}>
                                {building.name}
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
                name="providerBuildingIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Residencias donde ofreces tus servicios</FormLabel>
                    <div className="flex flex-col gap-2">
                      {MOCK_BUILDINGS.map((building) => (
                        <div key={building.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`building-checkbox-${building.id}`}
                            checked={field.value?.includes(building.id)}
                            onCheckedChange={(checked) => {
                              const checkedArr = Array.isArray(field.value) ? field.value : [];
                              if (checked) {
                                field.onChange([...checkedArr, building.id]);
                              } else {
                                field.onChange(checkedArr.filter((id: string) => id !== building.id));
                              }
                            }}
                          />
                          <label htmlFor={`building-checkbox-${building.id}`} className="text-sm font-medium">
                            {building.name}
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

            <Button type="submit" className="w-full bg-golden-whisker text-heading hover:bg-golden-whisker-hover">
              <UserPlus className="mr-2 h-4 w-4" />
              Crear Cuenta
            </Button>
          </form>
        </Form>

        <div className="mt-6 text-center">
          <p>¿Ya tienes una cuenta? {' '}
            <Link to="/login" className="text-golden-whisker hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </PageContainer>
  );
};

export default Register;
