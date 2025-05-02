
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import PageContainer from '@/components/layout/PageContainer';
import { ClientPaymentForm } from '@/components/payments/ClientPaymentForm';
import { ProviderPaymentForm } from '@/components/payments/ProviderPaymentForm';

const PaymentSetup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateUserPaymentMethod } = useAuth();
  const [isProvider, setIsProvider] = useState(false);
  
  // Check if we came from client view to maintain that context
  const fromClientView = location.state?.fromClientView === true;
  
  useEffect(() => {
    // Determine if the current user is a provider
    const checkUserRole = async () => {
      if (user?.id) {
        try {
          // Get user role from the auth context or fetch it if needed
          if (user.role === 'provider') {
            setIsProvider(true);
          }
        } catch (error) {
          console.error("Error checking user role:", error);
        }
      }
    };
    
    checkUserRole();
  }, [user]);

  const handlePaymentComplete = (hasPaymentMethod: boolean) => {
    updateUserPaymentMethod(hasPaymentMethod);
  };

  const handleSubmitComplete = () => {
    // Navigate based on user role
    if (isProvider) {
      navigate('/dashboard');
    } else {
      // Navigate to client home if we came from client view, or to the default dashboard otherwise
      navigate(fromClientView ? '/client' : '/dashboard');
    }
  };

  if (!user) {
    return null; // Or a loading state or redirect to login
  }

  return (
    <PageContainer 
      title={isProvider ? "Configurar Información Bancaria" : "Configurar Pago"} 
      subtitle={isProvider 
        ? "Ingresa los datos de tu cuenta bancaria para recibir pagos" 
        : "Ingresa los datos de tu tarjeta de crédito"
      }
    >
      <div className="max-w-md mx-auto mt-8">
        {isProvider ? (
          <ProviderPaymentForm
            userId={user.id}
            userName={user.name}
            onSuccess={handlePaymentComplete}
            onSubmit={handleSubmitComplete}
          />
        ) : (
          <ClientPaymentForm
            userId={user.id}
            onSuccess={handlePaymentComplete}
            onSubmit={handleSubmitComplete}
          />
        )}
      </div>
    </PageContainer>
  );
};

export default PaymentSetup;
