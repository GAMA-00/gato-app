
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
      state: { fromClientView: false } 
    });
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
