
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  useEffect(() => {
    console.log('Login component - Auth state:', { isLoading, isAuthenticated, userRole: user?.role });
    
    if (!isLoading && isAuthenticated && user) {
      console.log('Redirecting authenticated user:', user.role);
      
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
    console.log('Login form submitted');
    setIsSubmitting(true);
    setLoginError(null);
    
    try {
      const { data, error } = await signIn(values.email, values.password);
      
      if (error) {
        console.error('Login error:', error);
        
        let errorMessage = 'Error durante el inicio de sesión';
        
        if (error.message?.includes('Invalid login credentials')) {
          errorMessage = 'Credenciales incorrectas. Verifica tu email y contraseña.';
        } else if (error.message?.includes('Email not confirmed')) {
          errorMessage = 'Por favor confirma tu email antes de iniciar sesión.';
        } else if (error.message?.includes('Too many requests')) {
          errorMessage = 'Demasiados intentos. Intenta de nuevo en unos minutos.';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        setLoginError(errorMessage);
        setIsSubmitting(false);
        return;
      }
      
      console.log('Login successful, redirection will be handled by useEffect');
      
    } catch (error: any) {
      console.error('Login exception:', error);
      setLoginError('Error inesperado durante el inicio de sesión');
      setIsSubmitting(false);
    }
  };

  const handleBackToLanding = () => {
    navigate('/landing', { replace: true });
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

  const totalLoading = authLoading || isSubmitting;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin mx-auto h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
          <p className="text-muted-foreground">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-shrink-0 p-4 md:p-6">
        <Button 
          variant="outline" 
          onClick={handleBackToLanding}
          className="flex items-center gap-2"
          disabled={totalLoading}
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
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertDescription className="text-sm">{loginError}</AlertDescription>
            </Alert>
          )}
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Correo Electrónico</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="correo@ejemplo.com" 
                          className="pl-10 h-12" 
                          {...field}
                          disabled={totalLoading}
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
                    <FormLabel className="text-sm font-medium">Contraseña</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          type="password" 
                          placeholder="••••••" 
                          className="pl-10 h-12" 
                          {...field}
                          disabled={totalLoading}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="pt-2">
                <Button 
                  type="submit" 
                  size="login"
                  className="w-full justify-center bg-app-text text-white hover:bg-app-text/90 text-sm h-12"
                  disabled={totalLoading}
                >
                  {totalLoading ? (
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
              </div>
            </form>
          </Form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 mb-3">¿No tienes una cuenta? </p>
            <Button variant="outline" size="lg" asChild className="w-full h-12 text-base font-medium" disabled={totalLoading}>
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
