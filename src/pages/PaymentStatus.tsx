import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PaymentStatusTracker } from '@/components/payments/PaymentStatusTracker';
import PageLayout from '@/components/layout/PageLayout';
import { CheckCircle2 } from 'lucide-react';

export const PaymentStatus = () => {
  const { paymentId } = useParams<{ paymentId: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!paymentId) {
      navigate('/dashboard');
    }
  }, [paymentId, navigate]);

  const handleStatusChange = (status: string) => {
    // Redirigir al dashboard después de 3 segundos
    setTimeout(() => {
      navigate('/dashboard?payment=success');
    }, 3000);
  };

  if (!paymentId) {
    return null;
  }

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-4">Solicitud de Reserva Enviada</h1>
          
          {/* Check verde fijo - mensaje contextual según tipo de servicio */}
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="h-8 w-8 text-green-600 flex-shrink-0 mt-1" />
              <div className="text-left flex-1">
                <p className="text-green-900 font-semibold text-lg mb-2">
                  ✅ Solicitud Procesada Exitosamente
                </p>
                <p className="text-green-800 text-sm">
                  <strong>¿Cuándo se procesará el pago?</strong>
                </p>
                <ul className="text-green-800 text-sm mt-2 space-y-1">
                  <li>• <strong>Prepago:</strong> Cuando el proveedor acepte tu reserva</li>
                  <li>• <strong>Postpago:</strong> Cuando aceptes el desglose final del servicio</li>
                </ul>
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