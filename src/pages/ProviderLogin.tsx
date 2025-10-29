
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, LogIn, AlertCircle, Briefcase } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const loginSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres')
});

type LoginFormValues = z.infer<typeof loginSchema>;

const ProviderLogin = () => {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  // Redirect authenticated users
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('ProviderLogin: User authenticated, role:', user.role);
      const redirectTo = user.role === 'provider' ? '/dashboard' : '/client/categories';
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const onSubmit = async (values: LoginFormValues) => {
    if (isSubmitting) return;
    
    setLoginError(null);
    setIsSubmitting(true);
    
    try {
      console.log('ProviderLogin: Starting login process for:', values.email);
      const result = await login(values.email, values.password);
      
      if (result.success) {
        console.log('ProviderLogin: Login successful');
        // Additional validation will happen in useEffect
      } else {
        console.log('ProviderLogin: Login failed -', result.error);
        const errorMessage = 'Usuario o contraseña incorrecto';
        setLoginError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('ProviderLogin: Submission error:', error);
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
              src="/lovable-uploads/7940cf6c-ca54-4600-baf8-e31bdbbc4ffa.png" 
              width="64"
              height="64"
              alt="Gato Logo" 
              decoding="async"
              className="w-full h-full object-contain"
            />
          </div>
          <CardTitle className="text-2xl">Portal de Proveedor</CardTitle>
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
                className="w-full h-12 bg-black hover:bg-gray-800"
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
              <Link to="/register-provider">Crear cuenta de Proveedor</Link>
            </Button>
            
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">¿Buscas servicios?</p>
              <Button 
                variant="ghost" 
                asChild
                className="text-sm"
                disabled={isSubmitting}
              >
                <Link to="/client/login">Acceder como Cliente</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProviderLogin;
