import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PaymentStatusTracker } from '@/components/payments/PaymentStatusTracker';
import PageLayout from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

export const PaymentStatus = () => {
  const { paymentId } = useParams<{ paymentId: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!paymentId) {
      navigate('/dashboard');
    }
  }, [paymentId, navigate]);

  const handleStatusChange = (status: string) => {
    // Redirigir a dashboard después de 2 segundos (usuario ya vio mensaje de éxito)
    setTimeout(() => {
      navigate('/dashboard?payment=success');
    }, 2000);
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
          <h1 className="text-2xl font-bold mb-4">Solicitud de Reserva Enviada</h1>
          
          {/* Mensaje fijo con check verde - siempre visible */}
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="h-8 w-8 text-green-600 flex-shrink-0 mt-1" />
              <div className="text-left flex-1">
                <p className="text-green-900 font-semibold text-lg mb-2">
                  ✅ Solicitud Procesada Exitosamente
                </p>
                <p className="text-green-800 text-sm">
                  <strong>Importante:</strong> El pago se realizará en el momento en que el proveedor acepte la cita.
                </p>
              </div>
            </div>
          </div>
        </div>

        <PaymentStatusTracker
          paymentId={paymentId}
          onStatusChange={handleStatusChange}
        />
      </div>
    </PageLayout>
  );
};