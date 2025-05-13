import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import PageContainer from '@/components/layout/PageContainer';
import { ClientPaymentForm } from '@/components/payments/ClientPaymentForm';
import { ProviderPaymentForm } from '@/components/payments/ProviderPaymentForm';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

const PaymentSetup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateUserPaymentMethod } = useAuth();
  const [isProvider, setIsProvider] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Check if we came from client view to maintain that context
  const fromClientView = location.state?.fromClientView === true;
  
  useEffect(() => {
    // Determine if the current user is a provider
    const checkUserRole = async () => {
      setIsLoading(true);
      if (user?.id) {
        try {
          // Check if user exists in the database
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, role')
            .eq('id', user.id)
            .single();
            
          if (userError && userError.code !== 'PGRST116') {
            console.error("Error checking user data:", userError);
            toast({
              title: "Error",
              description: "No se pudo verificar la información del usuario",
              variant: "destructive",
            });
          }
          
          // Determine role
          if (user.role === 'provider' || (userData && userData.role === 'provider')) {
            setIsProvider(true);
          }
        } catch (error) {
          console.error("Error checking user role:", error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
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

  if (isLoading) {
    return (
      <PageContainer title="Cargando...">
        <div className="flex justify-center items-center min-h-[300px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-golden-whisker"></div>
        </div>
      </PageContainer>
    );
  }

  if (!user) {
    // Redirect to login if no user
    setTimeout(() => navigate('/login', { replace: true }), 100);
    return null;
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
