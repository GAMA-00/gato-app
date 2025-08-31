import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { CreditCard, MapPin, Shield, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface OnvopayCheckoutFormProps {
  amount: number;
  paymentType: 'cash' | 'subscription';
  appointmentData: any;
  onSuccess: (result: any) => void;
  onError: (error: Error) => void;
}

// Utility functions for Costa Rica
const validatePhoneCR = (phone: string): boolean => {
  const cleanPhone = phone.replace(/\D/g, '');
  // Si empieza con 506, debe tener 11 dígitos total
  if (cleanPhone.startsWith('506')) {
    return cleanPhone.length === 11;
  }
  // Si no empieza con 506, debe tener 8 dígitos (se agregará 506 automáticamente)
  return cleanPhone.length === 8;
};

const formatPhoneCR = (phone: string): string => {
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.startsWith('506')) {
    return `+${cleanPhone.slice(0, 3)}-${cleanPhone.slice(3, 7)}-${cleanPhone.slice(7)}`;
  }
  // Si no tiene 506, lo agregamos
  if (cleanPhone.length === 8) {
    return `+506-${cleanPhone.slice(0, 4)}-${cleanPhone.slice(4)}`;
  }
  return phone;
};

const validateAddressCR = (address: string): boolean => {
  return address.trim().length > 0; // Solo requiere que no esté vacío
};

const calculateIVA = (amount: number) => {
  const subtotal = Math.round(amount / 1.13);
  const iva = amount - subtotal;
  return { subtotal, iva, total: amount };
};

const formatCurrencyUSD = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount / 100);
};

export const OnvopayCheckoutForm: React.FC<OnvopayCheckoutFormProps> = ({
  amount,
  paymentType,
  appointmentData,
  onSuccess,
  onError
}) => {
  const [formData, setFormData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
    phone: '',
    address: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const { subtotal, iva, total } = calculateIVA(amount);

  const validateForm = () => {
    const errors: Record<string, string> = {};

    // Validar teléfono Costa Rica
    if (!validatePhoneCR(formData.phone)) {
      errors.phone = 'Ingresa un número válido de 8 dígitos';
    }

    // Validar dirección CR
    if (!validateAddressCR(formData.address)) {
      errors.address = 'La dirección es requerida';
    }

    // Validar tarjeta (básico)
    if (!formData.cardNumber || formData.cardNumber.replace(/\D/g, '').length < 16) {
      errors.cardNumber = 'Número de tarjeta inválido';
    }

    if (!formData.expiryDate || !/^\d{2}\/\d{2}$/.test(formData.expiryDate)) {
      errors.expiryDate = 'Formato requerido: MM/AA';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsProcessing(true);
    console.log('Iniciando proceso de pago...');

    try {
      // Validar que appointmentData tenga ID antes del envío
      if (!appointmentData?.id) {
        throw new Error('Datos de la cita requeridos para procesar el pago');
      }

      console.log('📋 Enviando datos de pago:', {
        appointmentId: appointmentData.id,
        amount: total,
        paymentType,
        hasPhone: !!formData.phone,
        hasAddress: !!formData.address,
        hasCardData: !!formData.cardNumber
      });

      const response = await supabase.functions.invoke('onvopay-authorize', {
        body: {
          appointmentId: appointmentData.id,
          amount: total,
          payment_type: paymentType,
          payment_method: 'card',
          card_data: {
            number: formData.cardNumber.replace(/\D/g, ''),
            expiry: formData.expiryDate,
            cvv: formData.cvv,
            name: formData.cardholderName
          },
          billing_info: {
            name: formData.cardholderName,
            phone: formatPhoneCR(formData.phone),
            address: formData.address
          }
        }
      });

      console.log('Respuesta completa de la edge function:', response);

      const { data, error } = response;

      if (error) {
        console.error('Error de Supabase:', error);
        console.error('Error completo:', JSON.stringify(error, null, 2));
        
        // Intenta obtener el error específico de la función
        if (error.message.includes('Edge Function returned a non-2xx status code')) {
          // Probablemente hay un error específico en el data
          console.error('Data en caso de error:', data);
          if (data && data.error) {
            throw new Error(data.error);
          }
        }
        throw error;
      }

      // Check if the response indicates an error
      if (data && !data.success) {
        console.error('Error en la respuesta:', data.error);
        throw new Error(data.error || 'Error desconocido en el pago');
      }

      console.log('Pago exitoso:', data);
      toast({
        title: "Pago procesado",
        description: data?.message || "Pago completado exitosamente",
      });

      onSuccess(data);

    } catch (error: any) {
      console.error('Payment error:', error);
      
      let errorMessage = 'Error desconocido en el pago';
      if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast({
        title: "Error en el pago",
        description: errorMessage,
        variant: "destructive",
      });
      onError(error);
    } finally {
      setIsProcessing(false);
      console.log('Proceso de pago finalizado');
    }
  };

  // Formateo automático para números de tarjeta
  const formatCardNumber = (value: string) => {
    // Remover espacios y caracteres no numéricos
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    
    // Agregar espacios cada 4 dígitos
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

  // Formateo automático para fecha de vencimiento
  const formatExpiryDate = (value: string) => {
    // Remover caracteres no numéricos
    const v = value.replace(/\D/g, '');
    
    // Agregar "/" después de los primeros dos dígitos
    if (v.length >= 2) {
      return v.slice(0, 2) + '/' + v.slice(2, 4);
    }
    
    return v;
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
    setFormData(prev => ({ ...prev, cardNumber: formatted }));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExpiryDate(e.target.value);
    setFormData(prev => ({ ...prev, expiryDate: formatted }));
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Resumen de Pago */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Resumen de Pago</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span>{formatCurrencyUSD(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>IVA (13%):</span>
            <span>{formatCurrencyUSD(iva)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-semibold">
            <span>Total:</span>
            <span className="text-lg">{formatCurrencyUSD(total)}</span>
          </div>

          {paymentType === 'subscription' && (
            <Badge variant="outline" className="w-full justify-center">
              🔄 Pago recurrente cada {appointmentData.recurrence || 'semana'}
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Formulario de Pago */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Datos de Pago
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Datos de Tarjeta */}
            <div className="grid grid-cols-1 gap-4">
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
                    placeholder="MM/AA"
                    value={formData.expiryDate}
                    onChange={handleExpiryChange}
                    maxLength={5}
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
                    onChange={(e) => setFormData({...formData, cvv: e.target.value})}
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
                  onChange={(e) => setFormData({...formData, cardholderName: e.target.value})}
                  className={validationErrors.cardholderName ? 'border-red-500' : ''}
                />
                {validationErrors.cardholderName && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors.cardholderName}</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Datos de Facturación CR */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Información de Costa Rica
              </h4>

              <div>
                <Label htmlFor="phone">Teléfono *</Label>
                <Input
                  id="phone"
                  placeholder="+506-8888-9999"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className={validationErrors.phone ? 'border-red-500' : ''}
                />
                {validationErrors.phone && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors.phone}</p>
                )}
              </div>

              <div>
                <Label htmlFor="address">Dirección Completa *</Label>
                <Textarea
                  id="address"
                  placeholder="Provincia, Cantón, Distrito, Señas exactas"
                  rows={3}
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className={validationErrors.address ? 'border-red-500' : ''}
                />
                {validationErrors.address && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors.address}</p>
                )}
              </div>
            </div>

            {/* Botón de Pago */}
            <Button
              type="submit"
              className="w-full"
              disabled={isProcessing}
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  {paymentType === 'cash' ? 'Autorizar Pago' : 'Crear Suscripción'}
                </>
              )}
            </Button>

            {/* Disclaimer Legal */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600">
                🔒 Tus datos están protegidos con encriptación SSL.
                Procesado por Onvopay, certificado PCI DSS.
                Al continuar, aceptas nuestros términos y condiciones.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};