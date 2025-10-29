import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Mail, Loader2 } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.object({
  email: z.string().email({ message: 'Correo electrónico inválido' }).trim().toLowerCase(),
});

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validar email
      const validation = emailSchema.safeParse({ email });
      if (!validation.success) {
        toast({
          title: 'Error de validación',
          description: validation.error.errors[0].message,
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Generar el link de reset usando Supabase Auth
      const redirectUrl = 'https://gato-app.com/reset-password';
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        throw error;
      }

      // Enviar email personalizado con Resend
      const { error: emailError } = await supabase.functions.invoke('send-password-reset', {
        body: {
          email: validation.data.email,
          resetUrl: redirectUrl,
        },
      });

      if (emailError) {
        console.warn('Warning: Custom email failed, but Supabase email was sent', emailError);
      }

      setEmailSent(true);
      toast({
        title: 'Email enviado',
        description: 'Revisa tu correo para restablecer tu contraseña',
      });
    } catch (error: any) {
      console.error('Error sending password reset:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo enviar el email de recuperación',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Revisa tu correo</CardTitle>
            <CardDescription className="text-base">
              Te hemos enviado un enlace para restablecer tu contraseña a <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p className="text-sm text-muted-foreground">
                <strong>Importante:</strong> El enlace expira en 1 hora por seguridad.
              </p>
              <p className="text-sm text-muted-foreground">
                Si no recibes el correo en unos minutos, revisa tu carpeta de spam.
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate('/client/login')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al inicio de sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl font-bold text-center">Recuperar contraseña</CardTitle>
          <CardDescription className="text-center">
            Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Enviar enlace de recuperación
                </>
              )}
            </Button>

            <div className="text-center">
              <Link
                to="/client/login"
                className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                Volver al inicio de sesión
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
