
import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import PageContainer from '@/components/layout/PageContainer';
import { toast } from 'sonner';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { useResidencias } from '@/hooks/useResidencias';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

const Register = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { residencias, isLoading: loadingResidencias } = useResidencias();
  
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleRegisterSuccess = (data: { user: any }) => {
    toast.info('¡Registro exitoso! Configurando tu cuenta...');
    
    navigate('/payment-setup', { 
      state: { fromClientView: true } 
    });
  };

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/payment-setup`,
        }
      });
      
      if (error) {
        console.error('Error al iniciar sesión con Google:', error);
        toast.error('Error al iniciar sesión con Google: ' + error.message);
      } else {
        toast.info('Redirigiendo a Google para autenticación...');
      }
    } catch (error: any) {
      console.error('Error inesperado:', error);
      toast.error('Error inesperado durante el inicio de sesión');
    }
  };

  return (
    <PageContainer
      title="Crear Cuenta de Cliente"
    >
      <div className="max-w-md mx-auto mt-12 md:mt-8 px-6 md:px-0">
        <RegisterForm 
          residencias={residencias}
          loadingResidencias={loadingResidencias}
          onRegisterSuccess={handleRegisterSuccess}
          onGoogleSignIn={handleGoogleSignIn}
          userRole="client"
        />
        
        <div className="mt-6 text-center">
          <p className="text-muted-foreground mb-2">¿Eres un proveedor de servicios?</p>
          <Button variant="outline" asChild>
            <Link to="/register-provider">Regístrate como Proveedor</Link>
          </Button>
        </div>
      </div>
    </PageContainer>
  );
};

export default Register;
