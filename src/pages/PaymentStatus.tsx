import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PaymentStatusTracker } from '@/components/payments/PaymentStatusTracker';
import PageLayout from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export const PaymentStatus = () => {
  const { paymentId } = useParams<{ paymentId: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!paymentId) {
      navigate('/dashboard');
    }
  }, [paymentId, navigate]);

  const handleStatusChange = (status: string) => {
    if (status === 'captured') {
      // Redirect to dashboard with success message after 3 seconds
      setTimeout(() => {
        navigate('/dashboard?payment=success');
      }, 3000);
    } else if (status === 'authorized') {
      // Redirect to dashboard after 5 seconds for authorized payments
      setTimeout(() => {
        navigate('/dashboard?payment=authorized');
      }, 5000);
    }
  };

  if (!paymentId) {
    return null;
  }

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al Dashboard
          </Button>
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Estado del Pago</h1>
          <p className="text-gray-600">
            Verificando el estado de tu transacción
          </p>
        </div>

        <PaymentStatusTracker
          paymentId={paymentId}
          onStatusChange={handleStatusChange}
        />
      </div>
    </PageLayout>
  );
};