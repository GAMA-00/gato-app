import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { SavedCardsSelector } from './SavedCardsSelector';
import { NewCardForm } from './NewCardForm';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';
import { updateUserProfile } from '@/utils/profileManagement';
import { StickyPaymentFooter } from '@/components/checkout/StickyPaymentFooter';

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

  // Filter out cards without onvopay_payment_method_id (legacy cards)
  const validPaymentMethods = React.useMemo(
    () => paymentMethods.filter(pm => !!pm.onvopay_payment_method_id),
    [paymentMethods]
  );
  
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showNewCardForm, setShowNewCardForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  
  // Formulario simplificado - solo datos esenciales
  // Use profile address first, then fallback to service location
  const [billingData, setBillingData] = useState({
    phone: profile?.phone || '',
    address: profile?.address || appointmentData?.clientLocation || ''
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
    if (!isLoading && validPaymentMethods.length > 0 && !selectedCardId) {
      console.log('✅ Valid cards found, selecting first one');
      setSelectedCardId(validPaymentMethods[0].id);
      setShowNewCardForm(false);
    } else if (!isLoading && validPaymentMethods.length === 0 && !showNewCardForm) {
      console.log('⚠️ No valid saved cards; switching to new card form');
      setShowNewCardForm(true);
    }
  }, [validPaymentMethods, isLoading, selectedCardId, showNewCardForm]);

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

    // Validar teléfono (requerido por ONVO Pay)
    if (!billingData.phone) {
      toast({
        variant: "destructive",
        title: "Información incompleta",
        description: "Por favor actualiza tu perfil con un número de teléfono válido.",
        duration: 6000
      });
      errors.phone = 'Teléfono requerido - actualiza tu perfil';
    } else if (!validatePhoneCR(billingData.phone)) {
      toast({
        variant: "destructive",
        title: "Teléfono inválido",
        description: "El número de teléfono en tu perfil no es válido. Por favor actualízalo.",
        duration: 6000
      });
      errors.phone = 'Número de teléfono inválido en perfil';
    }

    // Dirección es opcional - se usa la ubicación del servicio como fallback
    // No se requiere validación

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
    } else {
      // Verify selected card is valid (has onvopay_payment_method_id)
      const selectedCard = validPaymentMethods.find(pm => pm.id === selectedCardId);
      if (!selectedCard) {
        console.log('⚠️ Selected saved card missing payment_method_id; soft-switch to new card form');
        setShowNewCardForm(true);
        errors.card = 'Ingresa una tarjeta para continuar';
      }
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

    let createdAppointmentId: string | null = null;

    try {
      // PASO 1: Crear appointment usando RPC para asegurar estado 'pending' y reservar slot
      // La función RPC tiene protección integrada contra race conditions con advisory locks
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
          p_client_address: billingData.address.trim() || appointmentData?.clientLocation || 'Dirección del servicio',
          p_residencia_id: appointmentData.residenciaId || profile?.residencia_id
        })
        .single();

      if (appointmentError) {
        console.error('❌ Error creando appointment:', appointmentError);
        
        // Check for P0001 error (slot conflict)
        if (appointmentError.code === 'P0001' || appointmentError.message?.includes('conflicts with')) {
          throw new Error('Este horario ya fue reservado por otro cliente. Por favor selecciona otro horario.');
        }
        
        throw new Error('No se pudo crear la reserva. Intenta nuevamente.');
      }

      const newAppointmentId = appointmentResult?.appointment_id;
      if (!newAppointmentId) {
        throw new Error('No se pudo obtener el ID de la reserva creada');
      }

      createdAppointmentId = newAppointmentId;
      console.log('✅ Appointment creado exitosamente:', newAppointmentId);

      // DETECTAR SI ES SERVICIO RECURRENTE
      const isRecurring = appointmentData.recurrenceType && 
                         appointmentData.recurrenceType !== 'once' && 
                         appointmentData.recurrenceType !== 'none';

      console.log('🔍 Tipo de servicio:', { 
        recurrenceType: appointmentData.recurrenceType, 
        isRecurring 
      });

      // PASO 2: Tokenizar tarjeta nueva si es necesario
      let paymentMethodId: string | null = null;
      let cardInfoForSaving: any = null;

      const selectedSavedCard = !showNewCardForm && selectedCardId
        ? validPaymentMethods.find(pm => pm.id === selectedCardId)
        : null;

      if (showNewCardForm) {
        // Nueva tarjeta: tokenizar primero
        console.log('🎫 Tokenizando nueva tarjeta...');
        
        const tokenizeResponse = await supabase.functions.invoke('onvopay-create-payment-method', {
          body: {
            card_data: {
              number: newCardData.cardNumber.replace(/\D/g, ''),
              expiry: newCardData.expiryDate,
              cvv: newCardData.cvv,
              name: newCardData.cardholderName
            }
          }
        });

        const { data: tokenData, error: tokenError } = tokenizeResponse;

        if (tokenError || !tokenData?.success) {
          console.error('❌ Error tokenizando tarjeta:', tokenError || tokenData);
          throw new Error('No se pudo procesar los datos de la tarjeta');
        }

        paymentMethodId = tokenData.payment_method_id;
        cardInfoForSaving = tokenData.card;
        console.log('✅ Tarjeta tokenizada:', paymentMethodId);
      } else if (selectedSavedCard?.onvopay_payment_method_id) {
        paymentMethodId = selectedSavedCard.onvopay_payment_method_id;
        console.log('🎫 Usando tarjeta guardada:', paymentMethodId);
      } else {
        // Silent fallback: switch to new card form instead of throwing error
        console.log('⚠️ No valid payment method available; switching to new card form');
        setShowNewCardForm(true);
        toast({
          description: "Para finalizar tu pago, ingresa los datos de tu tarjeta.",
        });
        setIsProcessing(false);
        setHasSubmitted(false);
        return;
      }

      // PASO 3: Procesar pago según tipo de servicio
      const billingName = showNewCardForm
        ? newCardData.cardholderName
        : selectedSavedCard?.cardholder_name || profile?.name || 'Cliente';

      let finalPaymentData: any = null;

      // ✅ CAMBIO 1: SERVICIOS RECURRENTES - Crear suscripción PRIMERO
      if (isRecurring && paymentMethodId) {
        console.log('🔄 Servicio recurrente detectado');
        console.log('📅 PASO 1/2: Creando suscripción con método de pago...');
        
        const subscriptionResponse = await supabase.functions.invoke(
          'onvopay-create-subscription',
          {
            body: {
              appointmentId: newAppointmentId,
              amount: amount,
              recurrenceType: appointmentData.recurrenceType,
              paymentMethodId: paymentMethodId,
              billing_info: {
                name: billingName,
                email: user?.email || '',
                phone: formatPhoneCR(billingData.phone),
                address: billingData.address.trim() || appointmentData?.clientLocation || 'Dirección del servicio'
              }
            }
          }
        );

        const { data: subscriptionData, error: subscriptionError } = subscriptionResponse;

        // ✅ CAMBIO 4: Rollback completo si falla la suscripción
        if (subscriptionError || !subscriptionData?.success) {
          console.error('❌ Error creando suscripción - ROLLBACK INICIADO:', subscriptionError || subscriptionData);
          
          // Cancelar appointment
          await supabase
            .from('appointments')
            .update({ status: 'cancelled' })
            .eq('id', newAppointmentId);
          
          const errorMessage = subscriptionData?.error || subscriptionError?.message || 'No se pudo crear la suscripción';
          
          toast({
            variant: "destructive",
            title: "Error en suscripción",
            description: `${errorMessage}. El servicio fue cancelado.`,
            duration: 8000
          });

          if (onError) {
            onError(new Error(errorMessage));
          }
          
          throw new Error(`No se pudo crear la suscripción: ${errorMessage}`);
        }

        console.log('✅ Suscripción creada exitosamente:', {
          subscriptionId: subscriptionData.subscription_id,
          db_subscription_id: subscriptionData.db_subscription_id,
          nextChargeDate: subscriptionData.next_charge_date
        });

        // ✅ PASO 2/2: Invocar cobro inicial INMEDIATAMENTE
        console.log('💳 PASO 2/2: Procesando cobro inicial...');
        
        const initiateResponse = await supabase.functions.invoke(
          'onvopay-initiate-recurring',
          { body: { appointment_id: newAppointmentId, force: false } }
        );

        const { data: initiateData, error: initiateError } = initiateResponse;

        // Validar cobro inicial (si falla o fue skipped, es un error)
        if (initiateError || !initiateData?.success || initiateData?.skipped) {
          console.error('❌ Error en cobro inicial - ROLLBACK INICIADO:', {
            error: initiateError,
            response: initiateData,
            wasSkipped: initiateData?.skipped
          });
          
          // Cancelar appointment y suscripción
          await supabase
            .from('appointments')
            .update({ status: 'cancelled' })
            .eq('id', newAppointmentId);

          await supabase
            .from('onvopay_subscriptions')
            .update({ status: 'cancelled' })
            .eq('id', subscriptionData.db_subscription_id);

          const errorMessage = initiateData?.skipped 
            ? 'No se encontró el método de pago en la suscripción'
            : (initiateData?.message || initiateError?.message || 'Error procesando el cobro inicial');
          
          toast({
            variant: "destructive",
            title: "Error en cobro inicial",
            description: `${errorMessage}. El servicio fue cancelado.`,
            duration: 8000
          });

          if (onError) {
            onError(new Error(errorMessage));
          }
          
          throw new Error(errorMessage);
        }

        console.log('✅ Cobro inicial procesado exitosamente:', {
          payment_id: initiateData.payment_id,
          status: initiateData.status,
          captured_at: initiateData.captured_at
        });

        toast({
          title: "¡Suscripción activa!",
          description: `Cobro inicial procesado. Próximo cargo: ${subscriptionData.next_charge_date}`,
          duration: 6000
        });

        finalPaymentData = {
          success: true,
          is_recurring: true,
          subscription_id: subscriptionData.subscription_id,
          payment_id: initiateData.payment_id,
          next_charge_date: subscriptionData.next_charge_date
        };

      } else {
        // ✅ SERVICIOS "UNA VEZ": Flujo normal (authorize → capture al aceptar)
        console.log('💳 Servicio único: Autorizando pago...');

        const cardDataForPayment = {
          payment_method_id: paymentMethodId,
          ...(cardInfoForSaving && {
            last4: cardInfoForSaving.last4,
            brand: cardInfoForSaving.brand,
            exp_month: cardInfoForSaving.exp_month,
            exp_year: cardInfoForSaving.exp_year,
            name: billingName
          })
        };

        const authorizeResponse = await supabase.functions.invoke('onvopay-authorize', {
          body: {
            appointmentId: newAppointmentId,
            amount: amount,
            payment_type: paymentType,
            payment_method: 'card',
            card_data: cardDataForPayment,
            billing_info: {
              name: billingName,
              email: user?.email || '',
              phone: formatPhoneCR(billingData.phone),
              address: billingData.address.trim() || appointmentData?.clientLocation || 'Dirección del servicio'
            }
          }
        });

        const { data: authorizeData, error: authorizeError } = authorizeResponse;

        if (authorizeError || !authorizeData?.success) {
          console.error('❌ Error creating Payment Intent:', authorizeError || authorizeData);
          
          setIsProcessing(false);
          
          let errorMessage = 'Error en el procesamiento del pago';
          let errorDetails = '';
          let shouldDeleteAppointment = true;
          
          if (authorizeError) {
            console.error('❌ Error en onvopay-authorize:', {
              error: authorizeError,
              appointmentId: newAppointmentId,
              timestamp: new Date().toISOString()
            });
            
            try {
              if (typeof authorizeError.message === 'string' && authorizeError.message.includes('Error: ')) {
                const jsonStart = authorizeError.message.indexOf('{');
                if (jsonStart !== -1) {
                  const jsonPart = authorizeError.message.substring(jsonStart);
                  const errorData = JSON.parse(jsonPart);
                  errorMessage = errorData.message || errorMessage;
                  errorDetails = errorData.details || '';
                  
                  if (errorData.error === 'PAYMENT_SERVICE_UNAVAILABLE' || errorData.error === 'NETWORK_ERROR') {
                    shouldDeleteAppointment = false;
                  }
                }
              } else if (authorizeError.message?.includes('PAYMENT_SERVICE_UNAVAILABLE')) {
                errorMessage = "El servicio de pagos está temporalmente no disponible. Por favor, intente nuevamente en unos minutos.";
                errorDetails = 'Por favor contacta al administrador del sistema';
                shouldDeleteAppointment = false;
              } else {
                errorMessage = authorizeError.message;
              }
            } catch (e) {
              errorMessage = authorizeError.message;
            }
            
            if (shouldDeleteAppointment) {
              console.log('🗑️ Deleting appointment due to hard error');
              await supabase
                .from('appointments')
                .delete()
                .eq('id', newAppointmentId);
            } else {
              console.log('⚠️ Keeping appointment for retriable error');
            }

            if (onError) {
              onError(new Error(errorMessage));
            }
            
            toast({
              variant: "destructive",
              title: shouldDeleteAppointment ? "Error en el pago" : "Servicio temporalmente no disponible",
              description: errorMessage + (errorDetails ? ` - ${errorDetails}` : ''),
              duration: shouldDeleteAppointment ? 5000 : 8000
            });
            
            return;
          }

          if (authorizeData && !authorizeData.success) {
            console.error('❌ Error en authorize response:', {
              error: authorizeData.error,
              message: authorizeData.message,
              requestId: authorizeData.requestId,
              responseTime: authorizeData.responseTime,
              appointmentId: newAppointmentId
            });
            
            const shouldDeleteAppointment = !['PAYMENT_SERVICE_UNAVAILABLE', 'NETWORK_ERROR'].includes(authorizeData.error);
            
            if (shouldDeleteAppointment) {
              console.log('🗑️ Deleting appointment due to hard error:', authorizeData.error); 
              await supabase
                .from('appointments')
                .delete()
                .eq('id', newAppointmentId);
            } else {
              console.log('⚠️ Keeping appointment for retriable error:', authorizeData.error);
            }
            
            let title = "Error en el pago";
            let description = authorizeData.message || "Error procesando el pago";
            let duration = 5000;
            
            if (authorizeData.error === 'PAYMENT_SERVICE_UNAVAILABLE') {
              title = "Servicio temporalmente no disponible";
              description = "El servicio de pagos está temporalmente no disponible. Por favor, intente nuevamente en unos minutos.";
              duration = 8000;
            } else if (authorizeData.error === 'CONFIGURATION_ERROR') {
              title = "Error de configuración";
              description = "Error de configuración del sistema de pagos. Contacte al administrador.";
            } else if (authorizeData.error === 'ENDPOINT_NOT_FOUND') {
              title = "Error de configuración";
              description = "Configuración de ambiente incorrecta. Contacte al administrador.";
            }
            
            toast({
              variant: "destructive",
              title,
              description,
              duration
            });
            
            if (onError) {
              onError(new Error(description));
            }
            
            return;
          }

          throw new Error(authorizeData?.error || 'Error creando Payment Intent');
        }

        console.log('✅ Payment Intent created:', {
          paymentIntentId: authorizeData.onvopay_payment_id,
          isPostPayment: authorizeData.is_post_payment,
          requiresConfirmation: authorizeData.requires_confirmation
        });

        console.log('✅ PASO 2/4 COMPLETADO: Payment Intent creado (pending_authorization)');
        console.log('⏳ El pago se procesará cuando el proveedor acepte tu reserva');

        finalPaymentData = authorizeData;
      }

      // FASE 2: Guardar tarjeta si el usuario lo solicitó
      if (showNewCardForm && newCardData.saveCard && paymentMethodId && cardInfoForSaving) {
        console.log('💾 Guardando método de pago...');
        try {
          await savePaymentMethod({
            cardNumber: '****',
            cardholderName: newCardData.cardholderName,
            expiryDate: `${cardInfoForSaving.exp_month}/${cardInfoForSaving.exp_year}`,
            onvopayPaymentMethodId: paymentMethodId
          });
          console.log('✅ Método de pago guardado');
        } catch (saveError) {
          console.error('⚠️ Error guardando método de pago:', saveError);
          // No bloquear el flujo si falla guardar la tarjeta
        }
      }

      // PASO 2.5: Guardar tarjeta con payment_method_id de OnvoPay si el usuario lo solicitó (para servicios únicos)
      if (!isRecurring && showNewCardForm && newCardData.saveCard && finalPaymentData?.onvopay_payment_method_id) {
        try {
          console.log('💾 Guardando tarjeta con OnvoPay payment method ID...');
          await savePaymentMethod({
            cardNumber: newCardData.cardNumber.replace(/\D/g, ''),
            cardholderName: newCardData.cardholderName,
            expiryDate: newCardData.expiryDate,
            onvopayPaymentMethodId: finalPaymentData.onvopay_payment_method_id
          });
          console.log('✅ Tarjeta guardada con payment method ID de OnvoPay');
        } catch (saveError) {
          console.warn('⚠️ No se pudo guardar la tarjeta (no crítico):', saveError);
        }
      }

      // PASO 3: Actualizar appointment (sin verificar captura, eso se hace cuando proveedor acepta)
      console.log('🔄 Actualizando appointment con payment intent...');

      console.log('🎉 Proceso completo exitoso');

      // PASO 4: Guardar teléfono y dirección en el perfil del usuario (si cambiaron)
      const profileUpdates: any = {};
      
      if (billingData.phone && billingData.phone !== profile?.phone) {
        profileUpdates.phone = formatPhoneCR(billingData.phone);
      }
      
      if (billingData.address && billingData.address.trim() && billingData.address !== profile?.address) {
        profileUpdates.address = billingData.address.trim();
      }
      
      if (Object.keys(profileUpdates).length > 0) {
        try {
          await updateUserProfile(user?.id, profileUpdates);
          console.log('✅ Perfil actualizado:', profileUpdates);
        } catch (profileError) {
          console.warn('⚠️ No se pudo actualizar el perfil (no crítico):', profileError);
        }
      }

      // Mensajes contextuales según tipo de servicio y estado
      let successMessage: string;
      
      if (isRecurring) {
        successMessage = "Reserva recurrente creada exitosamente. El primer cobro se procesará cuando el servicio se complete.";
      } else if (finalPaymentData?.is_post_payment && finalPaymentData.status === 'captured') {
        successMessage = "Reserva confirmada. El pago base (T1) ha sido procesado exitosamente.";
      } else if (finalPaymentData?.status === 'captured') {
        successMessage = "Pago procesado exitosamente. Pendiente de aprobación del proveedor.";
      } else {
        successMessage = "Pago autorizado. Se cobrará al completar el servicio.";
      }
      
      toast({
        title: "Proceso exitoso",
        description: successMessage,
      });

      // Redirigir según tipo de servicio
      if (isRecurring) {
        // Para citas recurrentes, usar página específica sin payment tracking
        window.location.href = `/recurring-booking-confirmation/${newAppointmentId}`;
      } else {
        // Para citas "una vez", flujo normal con payment tracking
        onSuccess({
          ...finalPaymentData,
          appointmentId: newAppointmentId,
          status: 'pending',
          isRecurring: false
        });
      }

    } catch (error: any) {
      console.error('❌ Error en proceso completo:', error);

      // Cleanup: Delete appointment if created but payment failed
      if (createdAppointmentId) {
        try {
          console.log('🗑️ Cleaning up appointment due to early payment failure');
          await supabase
            .from('appointments')
            .delete()
            .eq('id', createdAppointmentId);
        } catch (cleanupError) {
          console.error('⚠️ Failed to cleanup appointment:', cleanupError);
        }
      }

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

  const handleAddNewCard = () => {
    setShowNewCardForm(true);
    setSelectedCardId(null);
  };

  return (
    <div className="space-y-6">
      {/* Selección de tarjeta */}
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
          onAddNewCard={handleAddNewCard}
        />
      )}

      {/* Indicador de datos cargados desde perfil */}
      {billingData.phone && (
        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg border border-border/50">
          <p className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <span>Datos de contacto: {formatPhoneCR(billingData.phone)}</span>
          </p>
        </div>
      )}

      {/* Sticky Payment Footer */}
      <StickyPaymentFooter
        amount={amount}
        isProcessing={isProcessing}
        hasSubmitted={hasSubmitted}
        onSubmit={handleSubmit}
      />
    </div>
  );
};