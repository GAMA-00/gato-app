
import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import PageContainer from '@/components/layout/PageContainer';
import { toast } from 'sonner';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { useResidencias } from '@/hooks/useResidencias';
import { Button } from '@/components/ui/button';

const ProviderRegister = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { residencias, isLoading: loadingResidencias } = useResidencias();
  
  useEffect(() => {
    console.log('ProviderRegister: Auth state changed', { user: !!user, isAuthenticated, isLoading, userRole: user?.role });
    
    if (isAuthenticated && user && !isLoading) {
      console.log('ProviderRegister: User is authenticated, redirecting based on role:', user.role);
      // Redirect based on user role
      const redirectTo = user.role === 'provider' ? '/dashboard' : '/client';
      navigate(redirectTo, { replace: true });
    }
  }, [user, isAuthenticated, isLoading, navigate]);

  const handleRegisterSuccess = (data: { user: any }) => {
    console.log('ProviderRegister: Registration success callback triggered', data);
    toast.success('¡Registro exitoso! Creando tu perfil...');
    // Don't navigate here - let the useEffect handle it when auth state updates
  };

  return (
    <PageContainer title="Crear Cuenta de Proveedor">
      <div className="max-w-md mx-auto mt-12 md:mt-8 px-6 md:px-0">
        <RegisterForm 
          residencias={residencias}
          loadingResidencias={loadingResidencias}
          onRegisterSuccess={handleRegisterSuccess}
          userRole="provider"
        />
        
        <div className="mt-6 text-center">
          <p className="text-muted-foreground mb-2">¿Buscas servicios para tu residencia?</p>
          <Button variant="outline" asChild>
            <Link to="/register">Regístrate como Cliente</Link>
          </Button>
        </div>
      </div>
    </PageContainer>
  );
};

export default ProviderRegister;
