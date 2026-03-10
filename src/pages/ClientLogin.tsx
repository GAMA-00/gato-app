
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, LogIn, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { authLogger } from '@/utils/logger';

const loginSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres')
});

type LoginFormValues = z.infer<typeof loginSchema>;

const ClientLogin = () => {
  const { login, isAuthenticated, user, profile, isLoading } = useAuth();
  const navigate = useNavigate();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  // Redirect authenticated users
  useEffect(() => {
    if (isAuthenticated && !isLoading && profile) {
      const role = profile?.role || user?.role;
      if (role) {
        // Check if profile is incomplete (Google OAuth user who hasn't completed profile)
        if (role === 'client' && (!profile.residencia_id || !profile.phone || !profile.house_number)) {
          authLogger.info('Incomplete profile detected, redirecting to complete-profile');
          navigate('/complete-profile', { replace: true });
          return;
        }
        authLogger.info('User authenticated, redirecting to role', { role });
        if (role === 'admin') {
          navigate('/admin/dashboard', { replace: true });
        } else if (role === 'client') {
          navigate('/client/categories', { replace: true });
        } else if (role === 'provider') {
          navigate('/dashboard', { replace: true });
        }
      }
    }
  }, [isAuthenticated, isLoading, profile, user, navigate]);

  const onSubmit = async (values: LoginFormValues) => {
    if (isSubmitting) return;
    
    setLoginError(null);
    setIsSubmitting(true);
    
    try {
      authLogger.info('Starting login process', { email: values.email });
      const result = await login(values.email, values.password);
      
      if (result.success) {
        authLogger.info('Login successful');
        // Additional validation will happen in useEffect
      } else {
        authLogger.warn('Login failed', { error: result.error });
        const errorMessage = 'Usuario o contraseña incorrecto';
        setLoginError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (error) {
      authLogger.error('Submission error', error);
      const errorMessage = 'Error inesperado al iniciar sesión';
      setLoginError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4">
            <img 
              src="/gato-icon.png?v=1" 
              width="64"
              height="64"
              alt="Gato Logo" 
              decoding="async"
              className="w-full h-full object-contain"
            />
          </div>
          <CardTitle className="text-2xl">Portal de Cliente</CardTitle>
        </CardHeader>
        <CardContent>
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
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between mb-2">
                      <FormLabel>Contraseña</FormLabel>
                      <Link 
                        to="/forgot-password" 
                        className="text-xs text-primary hover:underline"
                      >
                        ¿Olvidaste tu contraseña?
                      </Link>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          type="password" 
                          placeholder="••••••" 
                          className="pl-10 h-12" 
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
                className="w-full h-12 bg-coral hover:bg-coral-light"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
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
          
          <div className="mt-6 text-center space-y-3">
            <p className="text-muted-foreground">¿No tienes cuenta?</p>
            <Button 
              variant="outline" 
              asChild
              className="w-full"
              disabled={isSubmitting}
            >
              <Link to="/register">Crear cuenta de Cliente</Link>
            </Button>

            <Button
              variant="outline"
              className="w-full h-12 border-border bg-background hover:bg-muted"
              disabled={isSubmitting || isGoogleLoading}
              onClick={async () => {
                setIsGoogleLoading(true);
                try {
                  const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                      redirectTo: window.location.origin + '/client/login',
                    },
                  });
                  if (error) {
                    toast.error('Error al iniciar sesión con Google');
                    setIsGoogleLoading(false);
                  }
                } catch {
                  toast.error('Error al iniciar sesión con Google');
                  setIsGoogleLoading(false);
                }
              }}
            >
              {isGoogleLoading ? (
                <Loader2 className="animate-spin mr-2 h-4 w-4" />
              ) : (
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              Continuar con Google
            </Button>
            
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">¿Eres proveedor de servicios?</p>
              <Button 
                variant="ghost" 
                asChild
                className="text-sm"
                disabled={isSubmitting}
              >
                <Link to="/provider/login">Acceder como Proveedor</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientLogin;
