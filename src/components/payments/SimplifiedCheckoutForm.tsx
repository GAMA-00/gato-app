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
import { updateUserProfile } from '@/utils/profileManagement';

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
    address: profile?.address || ''
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
      if (!newCardData.expiryDate || !/^\d{2}\/\d{2,4}$/.test(newCardData.expiryDate)) {
        errors.expiryDate = 'Formato requerido: MM/AA o MM/AAAA';
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

      // PASO 1: Crear appointment usando RPC para asegurar estado 'pending' y reservar slot
      console.log('📝 Creando appointment con slot reservado...');
      const { data: appointmentResult, error: appointmentError } = await supabase
        .rpc('create_appointment_with_slot', {
          p_provider_id: appointmentData.providerId,
          p_listing_id: appointmentData.listingId,
          p_client_id: appointmentData.clientId || user?.id,
          p_start_time: appointmentData.startTime,
          p_end_time: appointmentData.endTime,
          p_recurrence: appointmentData.recurrenceType === 'once' ? 'none' : appointmentData.recurrenceType,
          p_notes: appointmentData.notes || '',
          p_client_name: appointmentData.clientName || user?.name,
          p_client_email: appointmentData.clientEmail || user?.email,
          p_client_phone: formatPhoneCR(billingData.phone),
          p_client_address: billingData.address,
          p_residencia_id: appointmentData.residenciaId || profile?.residencia_id
        })
        .single();

      if (appointmentError) {
        console.error('❌ Error creando appointment:', appointmentError);
        throw new Error('No se pudo crear la reserva. Intenta nuevamente.');
      }

      const newAppointmentId = appointmentResult?.appointment_id;
      if (!newAppointmentId) {
        throw new Error('No se pudo obtener el ID de la reserva creada');
      }

      if (appointmentError) {
        console.error('❌ Error creando appointment:', appointmentError);
        throw new Error('No se pudo crear la reserva. Intenta nuevamente.');
      }

      console.log('✅ Appointment creado exitosamente:', newAppointmentId);

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
            // Para tarjetas guardadas, usamos tarjetas de prueba válidas de OnvoPay
            number: '4242424242424242',
            expiry: '12/28',
            cvv: '123',
            name: 'Tarjeta Guardada'
          };

      // STEP 1: Create Payment Intent
      const authorizeResponse = await supabase.functions.invoke('onvopay-authorize', {
        body: {
          appointmentId: newAppointmentId,
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

      const { data: authorizeData, error: authorizeError } = authorizeResponse;

      if (authorizeError) {
        console.error('❌ Error creating Payment Intent:', authorizeError);
        
        setIsProcessing(false);
        
        // Try to parse structured error from edge function
        let errorMessage = 'Error en el procesamiento del pago';
        let errorDetails = '';
        
        if (authorizeError.message) {
          try {
            // If it's a structured error from our edge function
            if (authorizeError.message.includes('ONVOPAY_API_ERROR') || authorizeError.message.includes('CONFIGURATION_ERROR')) {
              errorMessage = 'Error de configuración de OnvoPay';
              errorDetails = 'Por favor contacta al administrador del sistema';
            } else {
              errorMessage = authorizeError.message;
            }
          } catch (e) {
            errorMessage = authorizeError.message;
          }
        }
        
        // Eliminar appointment si el pago falla
        await supabase
          .from('appointments')
          .delete()
          .eq('id', newAppointmentId);

        if (onError) {
          onError(new Error(errorMessage));
        }
        
        toast({
          variant: "destructive",
          title: "Error en el pago",
          description: errorMessage + (errorDetails ? ` - ${errorDetails}` : ''),
        });
        
        return;
      }

      if (authorizeData && !authorizeData.success) {
        console.error('❌ Error en authorize response:', authorizeData.error);
        
        await supabase
          .from('appointments')
          .delete()
          .eq('id', newAppointmentId);

        throw new Error(authorizeData.error || 'Error creando Payment Intent');
      }

      console.log('✅ Payment Intent created:', {
        paymentIntentId: authorizeData.onvopay_payment_id,
        isPostPayment: authorizeData.is_post_payment,
        requiresConfirmation: authorizeData.requires_confirmation
      });

      let finalPaymentData = authorizeData;

      // STEP 2: For normal services, confirm Payment Intent immediately
      if (authorizeData.requires_confirmation && !authorizeData.is_post_payment) {
        console.log('💳 Confirmando Payment Intent inmediatamente...');
        
        const confirmResponse = await supabase.functions.invoke('onvopay-confirm', {
          body: {
            payment_intent_id: authorizeData.onvopay_payment_id,
            card_data: cardDataForPayment,
            billing_info: {
              name: newCardData.cardholderName || 'Cliente',
              phone: formatPhoneCR(billingData.phone),
              address: billingData.address
            }
          }
        });

        const { data: confirmData, error: confirmError } = confirmResponse;

        if (confirmError || !confirmData.success) {
          console.error('❌ Error confirmando pago:', confirmError || confirmData.error);
          
          await supabase
            .from('appointments')
            .delete()
            .eq('id', newAppointmentId);

          throw new Error(confirmError?.message || confirmData.error || 'Error confirmando el pago');
        }

        console.log('✅ Pago confirmado exitosamente');
        finalPaymentData = { ...authorizeData, ...confirmData };
      }

      // STEP 3: Update appointment with payment reference
      if (authorizeData && authorizeData.success) {
        await supabase
          .from('appointments')
          .update({
            onvopay_payment_id: authorizeData.payment_id
          })
          .eq('id', newAppointmentId);

        console.log('✅ Appointment actualizado con pago');
      }

      console.log('🎉 Proceso completo exitoso');

      // PASO 4: Guardar información de contacto en el perfil del usuario
      try {
        await updateUserProfile(user?.id, {
          phone: formatPhoneCR(billingData.phone),
          address: billingData.address
        });
        console.log('✅ Información de contacto guardada en el perfil');
      } catch (profileError) {
        console.warn('⚠️ No se pudo guardar la información de contacto (no crítico):', profileError);
      }
      
      const successMessage = finalPaymentData.is_post_payment 
        ? "Solicitud enviada. El pago se procesará al completar el servicio."
        : finalPaymentData.status === 'captured' 
          ? "Pago procesado exitosamente. Pendiente de aprobación del proveedor."
          : "Pago autorizado. Pendiente de aprobación del proveedor.";
      
      toast({
        title: "Proceso exitoso",
        description: successMessage,
      });

      onSuccess({
        ...finalPaymentData,
        appointmentId: newAppointmentId,
        status: 'pending'
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