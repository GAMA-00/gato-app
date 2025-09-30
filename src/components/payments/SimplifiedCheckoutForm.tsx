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
          p_client_address: billingData.address,
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

      console.log('✅ Appointment creado exitosamente:', newAppointmentId);

      // PASO 2: Procesar pago primero, luego guardar tarjeta con payment_method_id

      // PASO 3: Procesar pago
      console.log('💳 Procesando pago...');

      // Get selected saved card if using one
      const selectedSavedCard = !showNewCardForm && selectedCardId
        ? paymentMethods.find(pm => pm.id === selectedCardId)
        : null;

      const cardDataForPayment = showNewCardForm
        ? {
            number: newCardData.cardNumber.replace(/\D/g, ''),
            expiry: newCardData.expiryDate,
            cvv: newCardData.cvv,
            name: newCardData.cardholderName
          }
        : selectedSavedCard?.onvopay_payment_method_id
        ? {
            // Use saved OnvoPay payment method ID
            payment_method_id: selectedSavedCard.onvopay_payment_method_id
          }
        : {
            // Fallback: use test card data (shouldn't happen in production)
            number: '4242424242424242',
            expiry: '12/28',
            cvv: '123',
            name: 'Tarjeta Guardada'
          };

      // STEP 1: Create Payment Intent
      const billingName = showNewCardForm
        ? newCardData.cardholderName
        : selectedSavedCard?.cardholder_name || profile?.name || 'Cliente';

      console.log('🔍 DEBUG billingName calculation:', {
        showNewCardForm,
        'newCardData.cardholderName': newCardData.cardholderName,
        'selectedSavedCard?.cardholder_name': selectedSavedCard?.cardholder_name,
        'profile?.name': profile?.name,
        'user?.email': user?.email,
        finalBillingName: billingName
      });

      console.log('📤 Sending billing_info to onvopay-authorize:', {
        name: billingName,
        email: user?.email || '',
        phone: formatPhoneCR(billingData.phone),
        address: billingData.address,
        rawBillingData: billingData
      });

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
            address: billingData.address
          }
        }
      });

      const { data: authorizeData, error: authorizeError } = authorizeResponse;

      if (authorizeError || !authorizeData?.success) {
        console.error('❌ Error creating Payment Intent:', authorizeError || authorizeData);
        
        setIsProcessing(false);
        
        // Try to parse structured error from edge function
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
                
                // Don't delete appointment for service unavailability or network errors
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
          
          // Only delete appointment for hard errors
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
          
          // Enhanced error handling based on error type
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
          
          // Specific error messages based on error type
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

      let finalPaymentData = authorizeData;

      // STEP 2: For normal services, confirm Payment Intent immediately
      if (authorizeData.requires_confirmation && !authorizeData.is_post_payment) {
        console.log('💳 Confirmando Payment Intent inmediatamente...');

        const confirmResponse = await supabase.functions.invoke('onvopay-confirm', {
          body: {
            payment_intent_id: authorizeData.onvopay_payment_id,
            card_data: cardDataForPayment,
            billing_info: {
              name: billingName,
              phone: formatPhoneCR(billingData.phone),
              address: billingData.address
            }
          }
        });

        const { data: confirmData, error: confirmError } = confirmResponse;

        if (confirmError || !confirmData.success) {
          console.error('❌ Error confirmando pago:', confirmError || confirmData.error);
          
          // Special handling for service unavailability in confirm step
          if (confirmData?.error === 'PAYMENT_SERVICE_UNAVAILABLE') {
            console.warn('⚠️ Payment confirmation service temporarily unavailable');
            
            toast({
              variant: "destructive",
              title: "Servicio temporalmente no disponible",
              description: confirmData?.message || "El servicio de confirmación de pagos está temporalmente no disponible. Por favor, intente nuevamente en unos minutos.",
              duration: 8000
            });
            
            if (onError) {
              onError(new Error("SERVICE_TEMPORARILY_UNAVAILABLE"));
            }
            return;
          }
          
          // For other errors, delete appointment and throw error
          await supabase
            .from('appointments')
            .delete()
            .eq('id', newAppointmentId);

          throw new Error(confirmData?.error || 'Error confirmando pago');
        }

        console.log('✅ Payment confirmed:', confirmData);
        finalPaymentData = confirmData;

        // PASO 2.5: Guardar tarjeta con payment_method_id de OnvoPay si el usuario lo solicitó
        if (showNewCardForm && newCardData.saveCard && confirmData.onvopay_payment_method_id) {
          try {
            console.log('💾 Guardando tarjeta con OnvoPay payment method ID...');
            await savePaymentMethod({
              cardNumber: newCardData.cardNumber.replace(/\D/g, ''),
              cardholderName: newCardData.cardholderName,
              expiryDate: newCardData.expiryDate,
              onvopayPaymentMethodId: confirmData.onvopay_payment_method_id
            });
            console.log('✅ Tarjeta guardada con payment method ID de OnvoPay');
          } catch (saveError) {
            console.warn('⚠️ No se pudo guardar la tarjeta (no crítico):', saveError);
          }
        }
      }

      // PASO 3: Actualizar appointment con información de pago procesado (si no es post-pago)
      if (!finalPaymentData.is_post_payment && finalPaymentData.status === 'captured') {
        console.log('🔄 Actualizando appointment con pago completo...');
        
        await supabase
          .from('appointments')
          .update({ 
            status: 'pending' // Provider approval required, but payment is secured
          })
          .eq('id', newAppointmentId);

        console.log('✅ Appointment actualizado con pago');
      }

      console.log('🎉 Proceso completo exitoso');

      // PASO 4: Guardar solo el teléfono en el perfil del usuario (si cambió)
      if (billingData.phone && billingData.phone !== profile?.phone) {
        try {
          await updateUserProfile(user?.id, {
            phone: formatPhoneCR(billingData.phone)
          });
          console.log('✅ Teléfono actualizado en el perfil');
        } catch (profileError) {
          console.warn('⚠️ No se pudo actualizar el teléfono (no crítico):', profileError);
        }
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

      {/* Información de facturación */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Información de Contacto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="8123-4567"
                value={billingData.phone}
                onChange={(e) => setBillingData(prev => ({ ...prev, phone: e.target.value }))}
                className={validationErrors.phone ? 'border-red-500' : ''}
              />
              {validationErrors.phone && (
                <p className="text-sm text-red-500">{validationErrors.phone}</p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Dirección completa *</Label>
              <Input
                id="address"
                placeholder="Dirección de facturación"
                value={billingData.address}
                onChange={(e) => setBillingData(prev => ({ ...prev, address: e.target.value }))}
                className={validationErrors.address ? 'border-red-500' : ''}
              />
              {validationErrors.address && (
                <p className="text-sm text-red-500">{validationErrors.address}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen y botón de pago */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Total a pagar:</span>
              <span className="text-2xl font-bold text-green-600">
                ${amount.toFixed(2)} USD
              </span>
            </div>
            
            <Separator />
            
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
                  Procesando...
                </>
              ) : (
                `Procesar Pago - $${amount.toFixed(2)} USD`
              )}
            </Button>
            
            <p className="text-xs text-muted-foreground text-center">
              Tu información está protegida con encriptación de grado bancario
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};