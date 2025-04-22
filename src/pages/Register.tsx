
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
import { Mail, Lock, Phone, User, UserPlus, CreditCard, Building } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building as BuildingType } from '@/lib/types';

// Mock buildings data
const MOCK_BUILDINGS: BuildingType[] = [
  { id: '1', name: 'Colinas de Montealegre', address: 'Tres Rios' },
  { id: '2', name: 'Gregal', address: 'Tres Rios' },
  { id: '3', name: 'El Herran', address: 'Tres Rios' }
];

// Esquema de validación
const registerSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  email: z.string().email('Correo electrónico inválido'),
  phone: z.string().min(8, 'Número de teléfono inválido'),
  buildingId: z.string().min(1, 'Debe seleccionar una residencia'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      buildingId: '',
      password: '',
      confirmPassword: ''
    }
  });

  const onSubmit = (values: RegisterFormValues) => {
    // Buscar el nombre del edificio seleccionado
    const selectedBuilding = MOCK_BUILDINGS.find(b => b.id === values.buildingId);
    
    // Registrar al usuario con la información de su residencia
    register({
      id: Date.now().toString(),
      name: values.name,
      email: values.email,
      phone: values.phone,
      buildingId: values.buildingId,
      buildingName: selectedBuilding?.name || '',
      hasPaymentMethod: false
    });
    
    toast.success('Registro exitoso, ahora completa tus datos de pago');
    navigate('/payment-setup');
  };

  return (
    <PageContainer 
      title="Crear Cuenta" 
      subtitle="Regístrate para agendar servicios"
    >
      <div className="max-w-md mx-auto mt-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
            
            <FormField
              control={form.control}
              name="buildingId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Seleccione su Residencia</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                      <Select onValueChange={field.onChange} value={field.value}>
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
