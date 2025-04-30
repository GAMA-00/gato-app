
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import PageContainer from '@/components/layout/PageContainer';
import { toast } from 'sonner';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { useResidencias } from '@/hooks/useResidencias';
import { UserRole } from '@/lib/types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

const Register = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { residencias, isLoading: loadingResidencias } = useResidencias();
  
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleRegisterSuccess = (data: { user: any, role: UserRole }) => {
    toast.info('¡Registro exitoso! Configurando tu cuenta...');
    
    navigate('/payment-setup', { 
      state: { fromClientView: data.role === 'client' } 
    });
  };

  return (
    <PageContainer
      title="Crear Cuenta"
      subtitle="Regístrate para agendar u ofrecer servicios"
    >
      <div className="max-w-md mx-auto mt-4 mb-6">
        <Alert variant="warning" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Si tienes problemas al registrarte, prueba las "Opciones Avanzadas" para solucionar el problema.
          </AlertDescription>
        </Alert>
        
        <RegisterForm 
          residencias={residencias}
          loadingResidencias={loadingResidencias}
          onRegisterSuccess={handleRegisterSuccess}
        />
      </div>
    </PageContainer>
  );
};

export default Register;
