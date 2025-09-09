import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { SavedCardsSelector } from './SavedCardsSelector';
import { NewCardForm } from './NewCardForm';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';

interface SimplifiedCheckoutFormProps {
  amount: number;
  paymentType: 'cash' | 'subscription';
  appointmentData: any;
  onSuccess: (result: any) => void;
  onError: (error: Error) => void;
}

// Utility functions for Costa Rica
const validatePhoneCR = (phone: string): boolean => {
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.startsWith('506')) {
    return cleanPhone.length === 11;
  }
  return cleanPhone.length === 8;
};

const formatPhoneCR = (phone: string): string => {
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.startsWith('506')) {
    return `+${cleanPhone.slice(0, 3)}-${cleanPhone.slice(3, 7)}-${cleanPhone.slice(7)}`;
  }
  if (cleanPhone.length === 8) {
    return `+506-${cleanPhone.slice(0, 4)}-${cleanPhone.slice(4)}`;
  }
  return phone;
};

export const SimplifiedCheckoutForm: React.FC<SimplifiedCheckoutFormProps> = ({
  amount,
  paymentType,
  appointmentData,
  onSuccess,
  onError
}) => {
  const { user, profile } = useAuth();
  const { paymentMethods, savePaymentMethod, isLoading } = usePaymentMethods();
  
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showNewCardForm, setShowNewCardForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  
  // Formulario simplificado - solo datos esenciales
  const [billingData, setBillingData] = useState({
    phone: profile?.phone || '',
    address: ''
  });
  
  const [newCardData, setNewCardData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
    saveCard: true
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Effect to set initial card selection and form visibility
  React.useEffect(() => {
    if (!isLoading && paymentMethods.length > 0 && !selectedCardId) {
      setSelectedCardId(paymentMethods[0].id);
      setShowNewCardForm(false);
    } else if (!isLoading && paymentMethods.length === 0 && !showNewCardForm) {
      setShowNewCardForm(true);
    }
  }, [paymentMethods, isLoading, selectedCardId, showNewCardForm]);

  // Mostrar loading mientras se cargan los métodos de pago
  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Cargando métodos de pago...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const validateForm = () => {
    const errors: Record<string, string> = {};

    // Validar teléfono
    if (!validatePhoneCR(billingData.phone)) {
      errors.phone = 'Ingresa un número válido de 8 dígitos';
    }

    // Solo requerir dirección si no es posible eliminarla del procesador
    if (!billingData.address.trim()) {
      errors.address = 'La dirección es requerida para el procesador de pagos';
    }

    // Si está usando nueva tarjeta, validar datos de tarjeta
    if (showNewCardForm) {
      if (!newCardData.cardNumber || newCardData.cardNumber.replace(/\D/g, '').length < 16) {
        errors.cardNumber = 'Número de tarjeta inválido';
      }
      if (!newCardData.expiryDate || !/^\d{2}\/\d{2}$/.test(newCardData.expiryDate)) {
        errors.expiryDate = 'Formato requerido: MM/AA';
      }
      if (!newCardData.cvv || newCardData.cvv.length < 3) {
        errors.cvv = 'CVV inválido';
      }
      if (!newCardData.cardholderName.trim()) {
        errors.cardholderName = 'Nombre del titular requerido';
      }
    } else if (!selectedCardId) {
      errors.card = 'Selecciona un método de pago';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || hasSubmitted) return;

    setHasSubmitted(true);
    setIsProcessing(true);
    console.log('Iniciando proceso de reserva y pago...');

    try {
      // PASO 0: Validar que el slot esté disponible
      console.log('🔍 Validando disponibilidad del slot...');
      const { data: existingAppointments, error: validationError } = await supabase
        .from('appointments')
        .select('id, status')
        .eq('provider_id', appointmentData.providerId)
        .eq('start_time', appointmentData.startTime)
        .eq('end_time', appointmentData.endTime)
        .not('status', 'in', '(cancelled,rejected)');

      if (validationError) {
        console.error('❌ Error validating slot:', validationError);
        throw new Error('Error al validar disponibilidad del slot');
      }

      if (existingAppointments && existingAppointments.length > 0) {
        console.error('❌ Slot ya ocupado:', existingAppointments);
        throw new Error('Este horario ya no está disponible. Por favor selecciona otro horario.');
      }

      console.log('✅ Slot disponible, procediendo con creación...');

      // PASO 1: Crear appointment
      console.log('📝 Creando appointment en base de datos...');
      const { data: newAppointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          listing_id: appointmentData.listingId,
          client_id: appointmentData.clientId || user?.id,
          provider_id: appointmentData.providerId,
          start_time: appointmentData.startTime,
          end_time: appointmentData.endTime,
          status: 'pending',
          client_name: appointmentData.clientName || user?.name,
          client_email: appointmentData.clientEmail || user?.email,
          client_phone: formatPhoneCR(billingData.phone),
          client_address: billingData.address,
          notes: appointmentData.notes || '',
          recurrence: appointmentData.recurrenceType === 'once' ? null : appointmentData.recurrenceType,
          custom_variable_selections: appointmentData.customVariableSelections || null,
          custom_variables_total_price: appointmentData.customVariablesTotalPrice || 0,
          residencia_id: appointmentData.residenciaId || profile?.residencia_id
        })
        .select()
        .single();

      if (appointmentError) {
        console.error('❌ Error creando appointment:', appointmentError);
        throw new Error('No se pudo crear la reserva. Intenta nuevamente.');
      }

      console.log('✅ Appointment creado exitosamente:', newAppointment.id);

      // PASO 2: Si es nueva tarjeta y se quiere guardar, guardarla
      if (showNewCardForm && newCardData.saveCard) {
        try {
          await savePaymentMethod({
            cardNumber: newCardData.cardNumber.replace(/\D/g, ''),
            cardholderName: newCardData.cardholderName,
            expiryDate: newCardData.expiryDate
          });
        } catch (saveError) {
          console.warn('⚠️ No se pudo guardar la tarjeta (no crítico):', saveError);
        }
      }

      // PASO 3: Procesar pago
      console.log('💳 Procesando pago...');
      const cardDataForPayment = showNewCardForm 
        ? {
            number: newCardData.cardNumber.replace(/\D/g, ''),
            expiry: newCardData.expiryDate,
            cvv: newCardData.cvv,
            name: newCardData.cardholderName
          }
        : {
            // Para tarjetas guardadas, usamos datos simulados ya que Onvopay-authorize es mock
            number: '4111111111111111',
            expiry: '12/25',
            cvv: '123',
            name: 'Tarjeta Guardada'
          };

      const response = await supabase.functions.invoke('onvopay-authorize', {
        body: {
          appointmentId: newAppointment.id,
          amount: amount,
          payment_type: paymentType,
          payment_method: 'card',
          card_data: cardDataForPayment,
          billing_info: {
            name: newCardData.cardholderName || 'Cliente',
            phone: formatPhoneCR(billingData.phone),
            address: billingData.address
          }
        }
      });

      const { data: paymentData, error: paymentError } = response;

      if (paymentError) {
        console.error('❌ Error de pago:', paymentError);
        
        // Eliminar appointment si el pago falla
        await supabase
          .from('appointments')
          .delete()
          .eq('id', newAppointment.id);

        throw paymentError;
      }

      if (paymentData && !paymentData.success) {
        console.error('❌ Error en la respuesta:', paymentData.error);
        
        await supabase
          .from('appointments')
          .delete()
          .eq('id', newAppointment.id);

        throw new Error(paymentData.error || 'Error desconocido en el pago');
      }

      // PASO 4: Actualizar appointment con pago exitoso
      if (paymentData && paymentData.success) {
        await supabase
          .from('appointments')
          .update({
            status: 'confirmed',
            onvopay_payment_id: paymentData.payment_id
          })
          .eq('id', newAppointment.id);

        console.log('✅ Appointment actualizado con pago exitoso');

        // Para citas recurrentes, bloquear slots futuros
        if (appointmentData.recurrenceType && appointmentData.recurrenceType !== 'once') {
          console.log('🔒 Bloqueando slots recurrentes para:', newAppointment.id);
          try {
            await supabase.rpc('block_recurring_slots_for_appointment', {
              p_appointment_id: newAppointment.id,
              p_months_ahead: 3
            });
            console.log('✅ Slots recurrentes bloqueados exitosamente');
          } catch (slotError) {
            console.warn('⚠️ Error bloqueando slots recurrentes (no crítico):', slotError);
          }
        }
      }

      console.log('🎉 Proceso completo exitoso');
      toast({
        title: "Reserva y pago completados",
        description: paymentData?.message || "Reserva creada y pago procesado exitosamente",
      });

      onSuccess({
        ...paymentData,
        appointmentId: newAppointment.id,
        appointment: newAppointment
      });

    } catch (error: any) {
      console.error('❌ Error en proceso completo:', error);

      let errorMessage = 'Error al procesar la reserva y pago';
      if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      toast({
        title: "Error en el proceso",
        description: errorMessage,
        variant: "destructive",
      });
      onError(error);
    } finally {
      setHasSubmitted(false);
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Selector de tarjetas o formulario de nueva tarjeta */}
      {showNewCardForm ? (
        <NewCardForm
          onBack={() => setShowNewCardForm(false)}
          onCardDataChange={setNewCardData}
          initialData={newCardData}
        />
      ) : (
        <SavedCardsSelector
          selectedCardId={selectedCardId}
          onCardSelect={setSelectedCardId}
          onAddNewCard={() => setShowNewCardForm(true)}
        />
      )}

      {validationErrors.card && (
        <p className="text-sm text-red-500">{validationErrors.card}</p>
      )}

      {/* Información de facturación mínima */}
      <Card>
        <CardHeader>
          <CardTitle>Información de Contacto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="phone">Teléfono *</Label>
            <Input
              id="phone"
              placeholder="+506-8888-9999"
              value={billingData.phone}
              onChange={(e) => setBillingData({...billingData, phone: e.target.value})}
              className={validationErrors.phone ? 'border-red-500' : ''}
            />
            {validationErrors.phone && (
              <p className="text-sm text-red-500 mt-1">{validationErrors.phone}</p>
            )}
          </div>

          <div>
            <Label htmlFor="address">Dirección *</Label>
            <Input
              id="address"
              placeholder="Dirección completa"
              value={billingData.address}
              onChange={(e) => setBillingData({...billingData, address: e.target.value})}
              className={validationErrors.address ? 'border-red-500' : ''}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Requerido por el procesador de pagos
            </p>
            {validationErrors.address && (
              <p className="text-sm text-red-500 mt-1">{validationErrors.address}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Botón de pago */}
      <Card>
        <CardContent className="pt-6">
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isProcessing || hasSubmitted}
            onClick={handleSubmit}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando Pago...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Autorizar Pago ${amount.toFixed(2)}
              </>
            )}
          </Button>

          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">
              Al autorizar el pago, aceptas nuestros términos y condiciones.
              Tu información está protegida con encriptación SSL.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};