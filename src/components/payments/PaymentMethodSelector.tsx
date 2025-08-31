import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Banknote, RefreshCw, AlertCircle } from 'lucide-react';

interface PaymentMethodSelectorProps {
  serviceType: 'one-time' | 'recurring';
  onMethodSelect: (method: 'cash' | 'subscription') => void;
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  serviceType,
  onMethodSelect
}) => {
  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Selecciona Método de Pago
        </CardTitle>
        <CardDescription>
          Elige cómo deseas pagar por este servicio
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Opción Cash */}
        <Button
          variant="outline"
          className="w-full h-auto p-4 justify-start"
          onClick={() => onMethodSelect('cash')}
        >
          <div className="flex items-center gap-4">
            <div className="bg-green-100 p-2 rounded-full">
              <Banknote className="h-6 w-6 text-green-600" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold">Pago Único</h3>
              <p className="text-sm text-gray-500">
                Autorizar ahora, cobrar al completar servicio
              </p>
            </div>
          </div>
        </Button>

        {/* Opción Recurrente (solo si aplica) */}
        {serviceType === 'recurring' && (
          <Button
            variant="outline"
            className="w-full h-auto p-4 justify-start"
            onClick={() => onMethodSelect('subscription')}
          >
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-2 rounded-full">
                <RefreshCw className="h-6 w-6 text-blue-600" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">Pago Recurrente</h3>
                <p className="text-sm text-gray-500">
                  Suscripción automática según frecuencia
                </p>
              </div>
            </div>
          </Button>
        )}

        <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">Pagos procesados por Onvopay 🇨🇷</p>
              <p>Todos los precios incluyen IVA (13%)</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};