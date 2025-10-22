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
    enabled: !!paymentId
    // ❌ ELIMINADO: refetchInterval - no más polling innecesario
    // Los pagos se capturan inmediatamente al evento correspondiente
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
  const statusMap = {
    'pending_authorization': {
      icon: <CheckCircle2 className="h-12 w-12 text-green-500" />,
      title: 'Solicitud Procesada',
      description: 'Tu solicitud fue recibida correctamente. El pago se procesará en el momento correspondiente.',
      color: 'green'
    },
    'requires_confirmation': {
      icon: <CheckCircle2 className="h-12 w-12 text-green-500" />,
      title: 'Solicitud Procesada',
      description: 'El pago se procesará cuando el proveedor acepte tu cita.',
      color: 'green'
    },
    'authorized': {
      icon: <CheckCircle2 className="h-12 w-12 text-green-500" />,
      title: 'Pago Autorizado',
      description: 'El pago se procesará cuando el proveedor acepte tu cita.',
      color: 'green'
    },
    'captured': {
      icon: <CheckCircle2 className="h-12 w-12 text-green-500" />,
      title: 'Pago Completado',
      description: 'Tu pago fue procesado exitosamente. Servicio confirmado.',
      color: 'green'
    },
    'failed': {
      icon: <XCircle className="h-12 w-12 text-red-500" />,
      title: 'Error en el Proceso',
      description: 'Hubo un problema procesando tu pago. Por favor, intenta nuevamente.',
      color: 'red'
    },
    'cancelled': {
      icon: <XCircle className="h-12 w-12 text-gray-500" />,
      title: 'Pago Cancelado',
      description: 'El pago fue cancelado.',
      color: 'gray'
    }
  };

  // Manejar suscripciones
  if (payment?.payment_type === 'subscription' && status !== 'failed') {
    return {
      icon: <CheckCircle2 className="h-12 w-12 text-green-500" />,
      title: 'Suscripción Activada',
      description: 'Los pagos se procesarán automáticamente según la frecuencia configurada.',
      color: 'green'
    };
  }

  return statusMap[status] || statusMap['pending_authorization'];
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
