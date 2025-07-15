
import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import PageContainer from '@/components/layout/PageContainer';
import { toast } from 'sonner';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { useResidencias } from '@/hooks/useResidencias';
import { Button } from '@/components/ui/button';

const Register = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { residencias, isLoading: loadingResidencias } = useResidencias();
  
  useEffect(() => {
    if (user) {
      // Redirect based on user role
      const redirectTo = user.role === 'provider' ? '/dashboard' : '/client/categories';
      navigate(redirectTo);
    }
  }, [user, navigate]);

  const handleRegisterSuccess = (data: { user: any }) => {
    toast.success('¡Registro exitoso! Explora nuestros servicios.');
    // La redirección se maneja automáticamente por el contexto de autenticación
    // No necesitamos navigate aquí
  };

  return (
    <PageContainer title="Crear Cuenta de Cliente">
      <div className="max-w-md mx-auto mt-12 md:mt-8 px-6 md:px-0">
        <RegisterForm 
          residencias={residencias}
          loadingResidencias={loadingResidencias}
          onRegisterSuccess={handleRegisterSuccess}
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
