import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, CreditCard } from 'lucide-react';

interface NewCardFormProps {
  onBack: () => void;
  onCardDataChange: (cardData: {
    cardNumber: string;
    expiryDate: string;
    cvv: string;
    cardholderName: string;
    saveCard: boolean;
  }) => void;
  initialData?: {
    cardNumber: string;
    expiryDate: string;
    cvv: string;
    cardholderName: string;
    saveCard: boolean;
  };
}

export const NewCardForm: React.FC<NewCardFormProps> = ({
  onBack,
  onCardDataChange,
  initialData
}) => {
  const [formData, setFormData] = useState({
    cardNumber: initialData?.cardNumber || '',
    expiryDate: initialData?.expiryDate || '',
    cvv: initialData?.cvv || '',
    cardholderName: initialData?.cardholderName || '',
    saveCard: initialData?.saveCard ?? true
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Formateo automático para números de tarjeta
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\D/g, '');
    if (v.length <= 2) return v;
    const mm = v.slice(0, 2);
    const yyyyOrYy = v.slice(2, 6); // admite AA o AAAA
    return `${mm}/${yyyyOrYy}`;
  };

  // Validación en tiempo real de tarjeta
  const validateCardNumber = (number: string) => {
    const cleanNumber = number.replace(/\D/g, '');
    
    // Luhn algorithm para validar número de tarjeta
    let sum = 0;
    let isEven = false;
    
    for (let i = cleanNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cleanNumber.charAt(i), 10);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0 && cleanNumber.length >= 13;
  };

  // Detectar tipo de tarjeta
  const getCardType = (number: string) => {
    const cleanNumber = number.replace(/\D/g, '');
    
    if (cleanNumber.startsWith('4')) return 'Visa';
    if (cleanNumber.startsWith('5') || cleanNumber.startsWith('2')) return 'Mastercard';
    if (cleanNumber.startsWith('3')) return 'American Express';
    
    return '';
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    const newData = { ...formData, cardNumber: formatted };
    setFormData(newData);
    onCardDataChange(newData);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExpiryDate(e.target.value);
    const newData = { ...formData, expiryDate: formatted };
    setFormData(newData);
    onCardDataChange(newData);
  };

  const handleInputChange = (field: string, value: string) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    onCardDataChange(newData);
  };

  const handleSaveCardChange = (checked: boolean) => {
    const newData = { ...formData, saveCard: checked };
    setFormData(newData);
    onCardDataChange(newData);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.cardNumber || formData.cardNumber.replace(/\D/g, '').length < 16) {
      errors.cardNumber = 'Número de tarjeta inválido';
    }

    if (!formData.expiryDate || !/^\d{2}\/\d{2,4}$/.test(formData.expiryDate)) {
      errors.expiryDate = 'Formato requerido: MM/AA o MM/AAAA';
    }

    if (!formData.cvv || formData.cvv.length < 3) {
      errors.cvv = 'CVV inválido';
    }

    if (!formData.cardholderName.trim()) {
      errors.cardholderName = 'Nombre del titular requerido';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Nueva Tarjeta
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="cardNumber">Número de Tarjeta *</Label>
          <div className="relative">
            <Input
              id="cardNumber"
              placeholder="1234 5678 9012 3456"
              value={formData.cardNumber}
              onChange={handleCardNumberChange}
              maxLength={19}
              className={validationErrors.cardNumber ? 'border-red-500' : ''}
            />
            {getCardType(formData.cardNumber) && (
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
                {getCardType(formData.cardNumber)}
              </span>
            )}
            {formData.cardNumber && validateCardNumber(formData.cardNumber) && (
              <span className="absolute right-8 top-1/2 transform -translate-y-1/2 text-green-500 text-xs">
                ✓
              </span>
            )}
          </div>
          {validationErrors.cardNumber && (
            <p className="text-sm text-red-500 mt-1">{validationErrors.cardNumber}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="expiryDate">Vencimiento *</Label>
            <Input
              id="expiryDate"
              placeholder="MM/AA o MM/AAAA"
              value={formData.expiryDate}
              onChange={handleExpiryChange}
              maxLength={7}
              className={validationErrors.expiryDate ? 'border-red-500' : ''}
            />
            {validationErrors.expiryDate && (
              <p className="text-sm text-red-500 mt-1">{validationErrors.expiryDate}</p>
            )}
          </div>
          <div>
            <Label htmlFor="cvv">CVV *</Label>
            <Input
              id="cvv"
              placeholder="123"
              value={formData.cvv}
              onChange={(e) => handleInputChange('cvv', e.target.value)}
              maxLength={4}
              className={validationErrors.cvv ? 'border-red-500' : ''}
            />
            {validationErrors.cvv && (
              <p className="text-sm text-red-500 mt-1">{validationErrors.cvv}</p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="cardholderName">Nombre del Titular *</Label>
          <Input
            id="cardholderName"
            placeholder="Nombre como aparece en la tarjeta"
            value={formData.cardholderName}
            onChange={(e) => handleInputChange('cardholderName', e.target.value)}
            className={validationErrors.cardholderName ? 'border-red-500' : ''}
          />
          {validationErrors.cardholderName && (
            <p className="text-sm text-red-500 mt-1">{validationErrors.cardholderName}</p>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="saveCard"
            checked={formData.saveCard}
            onCheckedChange={handleSaveCardChange}
          />
          <Label htmlFor="saveCard" className="text-sm">
            Guardar esta tarjeta para futuros pagos
          </Label>
        </div>
      </CardContent>
    </Card>
  );
};