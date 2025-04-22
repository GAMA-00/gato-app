
import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import PageContainer from '@/components/layout/PageContainer';
import { Mail, Lock, LogIn } from 'lucide-react';

// Esquema de validación
const loginSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres')
});

type LoginFormValues = z.infer<typeof loginSchema>;

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  
  // Get the intended destination from location state, or default to "/client"
  const from = location.state?.from?.pathname || '/client';

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const onSubmit = (values: LoginFormValues) => {
    // In a real application, we would verify with the backend
    // We're simulating a successful login with admin-like permissions
    login({
      id: '1',
      name: 'Usuario Demo',
      email: values.email,
      phone: '123456789',
      buildingId: '1',
      buildingName: 'Colinas de Montealegre',
      hasPaymentMethod: true, // Set to true to avoid payment method restrictions
      role: 'provider' // Using provider role to enable access to both views
    });
    
    toast.success('Inicio de sesión exitoso');
    navigate(from);
  };

  return (
    <PageContainer 
      title="Iniciar Sesión" 
      subtitle="Accede a tu cuenta para gestionar tus reservas"
    >
      <div className="max-w-md mx-auto mt-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
            
            <Button type="submit" className="w-full bg-golden-whisker text-heading hover:bg-golden-whisker-hover">
              <LogIn className="mr-2 h-4 w-4" />
              Iniciar Sesión
            </Button>
          </form>
        </Form>
        
        <div className="mt-6 text-center">
          <p>¿No tienes una cuenta? {' '}
            <Link to="/register" className="text-golden-whisker hover:underline">
              Regístrate
            </Link>
          </p>
        </div>
      </div>
    </PageContainer>
  );
};

export default Login;
