import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock, 
  RotateCcw, 
  RefreshCw,
  Loader2 
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PaymentStatusTrackerProps {
  paymentId: string;
  onStatusChange?: (status: string) => void;
}

const usePaymentStatus = (paymentId: string) => {
  return useQuery({
    queryKey: ['payment-status', paymentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('onvopay_payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (error) throw error;
      return data;
    },
    refetchInterval: (query) => {
      // Keep polling for intermediate states
      const status = query?.state?.data?.status;
      if (status === 'pending_authorization' || status === 'requires_confirmation') {
        return 2000; // Poll every 2 seconds
      }
      return false; // Stop polling for final states
    }
  });
};

const formatCurrencyUSD = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount / 100);
};

export const PaymentStatusTracker: React.FC<PaymentStatusTrackerProps> = ({
  paymentId,
  onStatusChange
}) => {
  const { data: payment, isLoading } = usePaymentStatus(paymentId);

  React.useEffect(() => {
    if (payment?.status && onStatusChange) {
      onStatusChange(payment.status);
    }
  }, [payment?.status, onStatusChange]);

  const getStatusInfo = (status: string, payment?: any) => {
    // Detectar si es servicio postpago para mensaje contextual
    const isPostPayment = payment?.payment_type === 'prepaid' && status === 'pending_authorization';
    
    const statusMap = {
      'pending_authorization': {
        icon: <Clock className="h-6 w-6 text-yellow-500" />,
        title: 'Pago Pendiente',
        description: isPostPayment 
          ? '⚠️ Completando captura del pago base (T1)...'
          : 'Esperando confirmación al completar servicio...',
        color: 'yellow'
      },
      'requires_confirmation': {
        icon: <Clock className="h-6 w-6 text-blue-500" />,
        title: 'Payment Intent Creado',
        description: 'Confirmando pago automáticamente...',
        color: 'blue'
      },
      'authorized': {
        icon: <CheckCircle className="h-6 w-6 text-blue-500" />,
        title: 'Pago Autorizado',
        description: 'Fondos retenidos. Se cobrará al completar el servicio.',
        color: 'blue'
      },
      'captured': {
        icon: <CheckCircle2 className="h-6 w-6 text-green-500" />,
        title: 'Pago Completado',
        description: 'Transacción exitosa. Servicio pagado.',
        color: 'green'
      },
      'failed': {
        icon: <XCircle className="h-6 w-6 text-red-500" />,
        title: 'Pago Fallido',
        description: 'Error en la transacción. Intenta nuevamente.',
        color: 'red'
      },
      'cancelled': {
        icon: <AlertCircle className="h-6 w-6 text-gray-500" />,
        title: 'Pago Cancelado',
        description: 'Transacción cancelada. Fondos liberados.',
        color: 'gray'
      },
      'refunded': {
        icon: <RotateCcw className="h-6 w-6 text-purple-500" />,
        title: 'Pago Reembolsado',
        description: 'Fondos devueltos a tu cuenta.',
        color: 'purple'
      }
    };

    return statusMap[status] || statusMap['failed'];
  };

  const statusInfo = getStatusInfo(payment?.status || '', payment);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!payment) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="text-center">
            <XCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <h3 className="text-lg font-semibold">Pago no encontrado</h3>
            <p className="text-gray-600 text-sm mt-1">
              No se encontró información del pago
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="pt-6">
        <div className="text-center space-y-4">
          {/* Icono de Estado */}
          <div className="flex justify-center">
            {statusInfo.icon}
          </div>

          {/* Título y Descripción */}
          <div>
            <h3 className="text-lg font-semibold">{statusInfo.title}</h3>
            <p className="text-gray-600 text-sm mt-1">{statusInfo.description}</p>
          </div>

          {/* Información Adicional */}
          <div className="bg-gray-50 p-3 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Monto:</span>
              <span className="font-medium">{formatCurrencyUSD(payment.amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>ID Transacción:</span>
              <span className="font-mono text-xs">
                {payment.onvopay_transaction_id || 'Pendiente'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Fecha:</span>
              <span>{new Date(payment.created_at).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tipo:</span>
              <span className="capitalize">
                {payment.payment_type === 'cash' ? 'Pago único' : 'Suscripción'}
              </span>
            </div>
          </div>

          {/* Acciones según Estado */}
          {payment.status === 'failed' && (
            <Button variant="outline" size="sm" className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Reintentar Pago
            </Button>
          )}

          {payment.status === 'authorized' && (
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                ⏱️ El pago se procesará automáticamente cuando el proveedor
                complete el servicio o en 48 horas máximo.
              </p>
            </div>
          )}

          {payment.status === 'captured' && (
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <p className="text-sm text-green-800">
                ✅ Pago completado exitosamente. El servicio ha sido facturado.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
