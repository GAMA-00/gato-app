
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import PageContainer from '@/components/layout/PageContainer';
import { ClientPaymentForm } from '@/components/payments/ClientPaymentForm';
import { ProviderPaymentForm } from '@/components/payments/ProviderPaymentForm';
import { toast } from 'sonner';

const PaymentSetup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateUserPaymentMethod } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
  }, [user, navigate]);

  const handleSuccess = () => {
    setIsSubmitting(false);
    updateUserPaymentMethod(true);
    toast.success('¡Método de pago configurado exitosamente!');
    
    // Redirect based on user role
    const redirectTo = user?.role === 'provider' ? '/dashboard' : '/client';
    navigate(redirectTo);
  };

  const handleError = (error: string) => {
    setIsSubmitting(false);
    toast.error(error);
  };

  const handleSkip = () => {
    // Redirect based on user role
    const redirectTo = user?.role === 'provider' ? '/dashboard' : '/client';
    navigate(redirectTo);
  };

  if (!user) {
    return null;
  }

  return (
    <PageContainer title="Configurar Método de Pago">
      <div className="max-w-2xl mx-auto">
        {user.role === 'client' ? (
          <ClientPaymentForm
            onSuccess={handleSuccess}
            onError={handleError}
            onSkip={handleSkip}
            isSubmitting={isSubmitting}
            setIsSubmitting={setIsSubmitting}
          />
        ) : (
          <ProviderPaymentForm
            onSuccess={handleSuccess}
            onError={handleError}
            onSkip={handleSkip}
            isSubmitting={isSubmitting}
            setIsSubmitting={setIsSubmitting}
          />
        )}
      </div>
    </PageContainer>
  );
};

export default PaymentSetup;
