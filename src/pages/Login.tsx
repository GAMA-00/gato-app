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
import { supabase } from '@/integrations/supabase/client';

// Validation schema
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
  
  console.log('📱 ==> LOGIN PAGE RENDER');
  console.log('📱 URL actual:', window.location.href);
  console.log('📱 Target role:', targetRole);
  console.log('📱 Auth states:', {
    isLoading,
    authLoading,
    isSubmitting,
    isAuthenticated,
    userRole: user?.role,
    userEmail: user?.email
  });
  
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  // Only redirect if user is actually authenticated with a session
  useEffect(() => {
    console.log('📱 useEffect de redirección ejecutándose...');
    console.log('📱 Estados para redirección:', {
      isLoading,
      isAuthenticated,
      userRole: user?.role,
      userName: user?.name
    });
    
    // Wait for auth context to finish loading before making decisions
    if (isLoading) {
      console.log('📱 AuthContext aún cargando, esperando...');
      return;
    }
    
    if (isAuthenticated && user) {
      console.log('📱 Usuario autenticado detectado, procesando redirección...');
      console.log('📱 Datos del usuario para redirección:', {
        id: user.id,
        email: user.email,
        role: user.role
      });
      
      if (user.role === 'provider') {
        console.log('📱 Redirigiendo proveedor a /dashboard');
        navigate('/dashboard', { replace: true });
      } else if (user.role === 'client') {
        console.log('📱 Redirigiendo cliente a /client');
        navigate('/client', { replace: true });
      } else {
        console.log('📱 Redirigiendo usuario genérico a /profile');
        navigate('/profile', { replace: true });
      }
    } else {
      console.log('📱 No hay usuario autenticado, mostrando formulario de login');
    }
  }, [isAuthenticated, user, navigate, isLoading]);

  const onSubmit = async (values: LoginFormValues) => {
    console.log('📱 INICIO DE SESIÓN INICIADO');
    console.log('📱 Email del formulario:', values.email);
    console.log('📱 Timestamp de inicio:', new Date().toISOString());
    
    setIsSubmitting(true);
    setLoginError(null);
    
    try {
      console.log('📱 Llamando a signIn...');
      const { data, error } = await signIn(values.email, values.password);
      
      console.log('📱 Respuesta de signIn:', {
        tieneData: !!data,
        errorMessage: error?.message,
        timestamp: new Date().toISOString()
      });
      
      if (error) {
        console.error('📱 ERROR en signIn:', error);
        let errorMessage = 'Error durante el inicio de sesión';
        
        // Handle specific Supabase errors
        if (error.message?.includes('Invalid login credentials')) {
          errorMessage = 'Credenciales incorrectas. Verifica tu email y contraseña.';
        } else if (error.message?.includes('Email not confirmed')) {
          errorMessage = 'Por favor confirma tu email antes de iniciar sesión.';
        } else if (error.message?.includes('Too many requests')) {
          errorMessage = 'Demasiados intentos. Intenta de nuevo en unos minutos.';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        console.log('📱 Mensaje de error procesado:', errorMessage);
        setLoginError(errorMessage);
        setIsSubmitting(false);
        return;
      }
      
      console.log('📱 signIn exitoso, la redirección será manejada por useEffect');
      
    } catch (error: any) {
      console.error('📱 EXCEPCIÓN en onSubmit:', {
        message: error.message,
        stack: error.stack,
        fullError: error
      });
      setLoginError('Error inesperado durante el inicio de sesión');
      setIsSubmitting(false);
    }
  };
  
  const handleGoogleSignIn = async () => {
    try {
      setIsSubmitting(true);
      setLoginError(null);
      
      console.log('Google sign-in attempt started');
      
      const redirectUrl = targetRole === 'client' ? '/client' : '/dashboard';
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${redirectUrl}`,
        }
      });
      
      if (error) {
        console.error('Error al iniciar sesión con Google:', error);
        setLoginError(error.message);
        setIsSubmitting(false);
      }
    } catch (error: any) {
      console.error('Error inesperado:', error);
      setLoginError(error.message || 'Error inesperado durante el inicio de sesión');
      setIsSubmitting(false);
    }
  };

  const handleBackToLanding = () => {
    navigate('/', { replace: true });
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

  console.log('📱 Estados finales antes de render:', {
    isLoading,
    authLoading,
    isSubmitting,
    isAuthenticated,
    userRole: user?.role,
    totalLoading,
    mostrarFormulario: !isLoading
  });

  // Show loading only for a brief moment while checking auth
  if (isLoading) {
    console.log('📱 Mostrando pantalla de carga...');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin mx-auto h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
          <p className="text-muted-foreground">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  console.log('📱 Renderizando formulario de login...');

  // Always show the login form if not authenticated
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with back button - fixed at top */}
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

      {/* Main content - centered */}
      <div className="flex-1 flex items-center justify-center px-4 md:px-6 pb-8">
        <div className="w-full max-w-md">
          {/* Title only */}
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              {getTitle()}
            </h1>
          </div>

          {/* Error alert */}
          {loginError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertDescription className="text-sm">{loginError}</AlertDescription>
            </Alert>
          )}
          
          {/* Google sign in and divider */}
          <div className="space-y-4 mb-6">
            <Button 
              type="button" 
              variant="outline" 
              size="login"
              className="w-full flex items-center justify-center gap-2 text-sm" 
              onClick={handleGoogleSignIn}
              disabled={totalLoading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-4 w-4">
                <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
                <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
                <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
                <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
              </svg>
              {totalLoading ? 'Procesando...' : 'Continuar con Google'}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">O iniciar con email</span>
              </div>
            </div>
          </div>
          
          {/* Login form */}
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
          
          {/* Register link with larger button */}
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
