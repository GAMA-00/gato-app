
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Lock, LogIn, AlertCircle, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { toast } from 'sonner';

const loginSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres')
});

type LoginFormValues = z.infer<typeof loginSchema>;

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetRole = searchParams.get('role');
  const { signIn, loading: authLoading } = useSupabaseAuth();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [loginError, setLoginError] = useState<string | null>(null);
  
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      console.log('Usuario autenticado, redirigiendo:', user.role);
      
      if (user.role === 'provider') {
        navigate('/dashboard', { replace: true });
      } else if (user.role === 'client') {
        navigate('/client', { replace: true });
      } else {
        navigate('/profile', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate, isLoading]);

  const onSubmit = async (values: LoginFormValues) => {
    setLoginError(null);
    
    try {
      const { data, error } = await signIn(values.email, values.password);
      
      if (error) {
        let errorMessage = 'Credenciales incorrectas. Verifica tu email y contraseña.';
        
        if (error.message?.includes('Email not confirmed')) {
          errorMessage = 'Por favor confirma tu email antes de iniciar sesión.';
        } else if (error.message?.includes('Too many requests')) {
          errorMessage = 'Demasiados intentos. Intenta de nuevo en unos minutos.';
        }
        
        setLoginError(errorMessage);
        toast.error(errorMessage);
      } else if (data?.user) {
        toast.success('¡Inicio de sesión exitoso!');
      }
      
    } catch (error: any) {
      console.error('Error durante login:', error);
      const errorMessage = 'Error inesperado durante el inicio de sesión';
      setLoginError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const getTitle = () => {
    if (targetRole === 'client') return 'Iniciar Sesión como Cliente';
    if (targetRole === 'provider') return 'Iniciar Sesión como Proveedor';
    return 'Iniciar Sesión';
  };

  const getRegisterLink = () => {
    if (targetRole === 'provider') return '/register-provider';
    return '/register';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin mx-auto h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-shrink-0 p-4 md:p-6">
        <Button 
          variant="outline" 
          onClick={() => navigate('/landing', { replace: true })}
          className="flex items-center gap-2"
          disabled={authLoading}
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 md:px-6 pb-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              {getTitle()}
            </h1>
          </div>

          {loginError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{loginError}</AlertDescription>
            </Alert>
          )}
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
                          className="pl-10 h-12" 
                          {...field}
                          disabled={authLoading}
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
                          className="pl-10 h-12" 
                          {...field}
                          disabled={authLoading}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                className="w-full h-12"
                disabled={authLoading}
              >
                {authLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                    <span>Iniciando sesión...</span>
                  </div>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Iniciar Sesión
                  </>
                )}
              </Button>
            </form>
          </Form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 mb-3">¿No tienes una cuenta?</p>
            <Button variant="outline" size="lg" asChild className="w-full h-12">
              <Link to={getRegisterLink()}>
                Regístrate
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
