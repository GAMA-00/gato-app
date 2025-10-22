import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CreditCard } from 'lucide-react';
import { PaymentMethod } from '@/hooks/usePaymentMethods';

interface LegacyCardReEntryProps {
  legacyCard: PaymentMethod;
  onComplete: (cardData: {
    cardNumber: string;
    cvv: string;
    expiryDate: string;
    cardholderName: string;
  }) => void;
  onCancel: () => void;
  isProcessing: boolean;
}

export const LegacyCardReEntry: React.FC<LegacyCardReEntryProps> = ({
  legacyCard,
  onComplete,
  onCancel,
  isProcessing
}) => {
  const [formData, setFormData] = useState({
    cardNumber: '',
    cvv: '',
    expiryDate: legacyCard.expiry_date || '',
    cardholderName: legacyCard.cardholder_name || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const parts = [];
    for (let i = 0; i < v.length; i += 4) {
      parts.push(v.substring(i, i + 4));
    }
    return parts.join(' ');
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    const cleanNumber = formData.cardNumber.replace(/\D/g, '');
    if (cleanNumber.length < 16) {
      newErrors.cardNumber = 'Número de tarjeta debe tener 16 dígitos';
    }

    if (formData.cvv.length < 3) {
      newErrors.cvv = 'CVV debe tener al menos 3 dígitos';
    }

    if (!formData.cardholderName.trim()) {
      newErrors.cardholderName = 'Nombre del titular es requerido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onComplete(formData);
    }
  };

  return (
    <Card className="border-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-900 dark:text-yellow-100">
          <CreditCard className="h-5 w-5" />
          Actualización de Tarjeta Requerida
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Por seguridad, necesitamos que confirmes los datos completos de esta tarjeta. 
            Esta actualización solo se realizará una vez.
          </AlertDescription>
        </Alert>

        <div className="space-y-3 bg-muted/50 p-3 rounded-lg">
          <p className="text-sm font-medium">Tarjeta a actualizar:</p>
          <p className="text-sm text-muted-foreground">
            {legacyCard.card_number} • {legacyCard.cardholder_name}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="legacy-cardNumber">Número de Tarjeta Completo *</Label>
            <Input
              id="legacy-cardNumber"
              placeholder="1234 5678 9012 3456"
              value={formData.cardNumber}
              onChange={(e) => setFormData({ ...formData, cardNumber: formatCardNumber(e.target.value) })}
              maxLength={19}
              className={errors.cardNumber ? 'border-red-500' : ''}
            />
            {errors.cardNumber && (
              <p className="text-sm text-red-500 mt-1">{errors.cardNumber}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Últimos 4 dígitos deben coincidir: {legacyCard.card_number?.slice(-4)}
            </p>
          </div>

          <div>
            <Label htmlFor="legacy-cvv">CVV *</Label>
            <Input
              id="legacy-cvv"
              placeholder="123"
              type="password"
              value={formData.cvv}
              onChange={(e) => setFormData({ ...formData, cvv: e.target.value.replace(/\D/g, '') })}
              maxLength={4}
              className={errors.cvv ? 'border-red-500' : ''}
            />
            {errors.cvv && (
              <p className="text-sm text-red-500 mt-1">{errors.cvv}</p>
            )}
          </div>

          <div>
            <Label htmlFor="legacy-cardholderName">Nombre del Titular *</Label>
            <Input
              id="legacy-cardholderName"
              placeholder="Nombre como aparece en la tarjeta"
              value={formData.cardholderName}
              onChange={(e) => setFormData({ ...formData, cardholderName: e.target.value })}
              className={errors.cardholderName ? 'border-red-500' : ''}
            />
            {errors.cardholderName && (
              <p className="text-sm text-red-500 mt-1">{errors.cardholderName}</p>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isProcessing}
            className="flex-1"
          >
            {isProcessing ? 'Procesando...' : 'Actualizar y Continuar con Pago'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
