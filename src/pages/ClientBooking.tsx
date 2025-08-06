
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRecurringBooking } from '@/hooks/useRecurringBooking';
import { validateBookingSlot } from '@/utils/bookingValidation';
import { buildCompleteLocation } from '@/utils/locationBuilder';
import { RobustBookingSystem } from '@/utils/robustBookingSystem';
import PageLayout from '@/components/layout/PageLayout';
import { toast } from 'sonner';
import BookingHeader from '@/components/client/booking/BookingHeader';
import ServiceSummaryCard from '@/components/client/booking/ServiceSummaryCard';
import NewBookingForm from '@/components/client/booking/NewBookingForm';
import BookingSummaryCard from '@/components/client/booking/BookingSummaryCard';

const ClientBooking = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { createRecurringBooking, isLoading } = useRecurringBooking();

  // Get data from navigation state
  const { providerId, serviceDetails, selectedVariants } = location.state || {};

  // Booking form state
  const [selectedFrequency, setSelectedFrequency] = useState('once');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [customVariableSelections, setCustomVariableSelections] = useState<any>({});
  const [customVariablesTotalPrice, setCustomVariablesTotalPrice] = useState<number>(0);

  // Query to get complete user data from database
  const { data: completeUserData, isLoading: isLoadingUserData } = useQuery({
    queryKey: ['complete-user-data', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('users')
        .select(`
          house_number,
          condominium_text,
          condominium_name,
          residencia_id,
          residencias (
            id,
            name
          )
        `)
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching complete user data:', error);
        return null;
      }

      return data;
    },
    enabled: !!user?.id,
  });

  // Enhanced scroll to top when component mounts
  useEffect(() => {
    // Force immediate scroll to top
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    
    // Also use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
    
    // Additional backup with a small delay
    const timeoutId = setTimeout(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, []);

  // Enhanced validation - More permissive for better UX
  const isBookingValid = selectedDate && selectedTime && selectedVariants?.length > 0 && !isLoadingUserData;
  const selectedVariant = selectedVariants?.[0];

  const handleBackNavigation = () => {
    // Scroll to top before navigation
    window.scrollTo(0, 0);
    // Navigate back to categories page
    navigate('/client/categories');
  };

  if (!serviceDetails || !providerId || !selectedVariants) {
    return (
      <PageLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            No se pudo cargar la información del servicio
          </p>
          <BookingHeader onBackClick={handleBackNavigation} />
        </div>
      </PageLayout>
    );
  }

  const handleBooking = async () => {
    console.log('=== INICIANDO PROCESO DE RESERVA ROBUSTO ===');
    
    // ROBUST VALIDATION - Allow booking even with minimal data
    if (!user) {
      toast.error('Debes iniciar sesión para realizar una reserva');
      return;
    }

    if (!selectedDate || !selectedTime) {
      toast.error('Por favor selecciona una fecha y hora para tu cita');
      return;
    }

    if (!selectedVariants?.length) {
      toast.error('Selección de servicio incompleta');
      return;
    }

    // Show immediate feedback
    toast.info('Iniciando reserva...', { duration: 1500 });

    try {
      // Create start and end times
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const startDateTime = new Date(selectedDate);
      startDateTime.setHours(hours, minutes, 0, 0);
      
      const endDateTime = new Date(startDateTime);
      endDateTime.setMinutes(endDateTime.getMinutes() + selectedVariant.duration);

      console.log('Horario seleccionado:', {
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString(),
        frequency: selectedFrequency
      });

      // ROBUST VALIDATION - with smart fallback
      let isValid = true;
      
      try {
        toast.info('Verificando disponibilidad...', { duration: 1500 });
        
        // Ultra-fast validation with aggressive timeout
        const validationPromise = validateBookingSlot(
          providerId,
          startDateTime,
          endDateTime,
          selectedFrequency
        );

        const timeoutPromise = new Promise<boolean>((_, reject) =>
          setTimeout(() => reject(new Error('Validation timeout')), 2000) // 2s max
        );

        isValid = await Promise.race([validationPromise, timeoutPromise]);
        
        if (isValid) {
          toast.success('Horario disponible ✓', { duration: 1000 });
        }
      } catch (error) {
        console.warn('Validation failed or timed out, proceeding optimistically:', error);
        // OPTIMISTIC APPROACH: If validation fails/times out, continue booking
        // The booking creation will do final server-side validation
        toast.info('Procesando reserva...', { duration: 1000 });
        isValid = true; // Proceed optimistically
      }

      // ROBUST USER DATA HANDLING - Continue even if incomplete
      let clientAddress = '';
      let userDataAvailable = false;

      if (completeUserData?.condominium_text && completeUserData?.house_number) {
        clientAddress = `${completeUserData.condominium_text}, Casa ${completeUserData.house_number}`;
        userDataAvailable = true;
      } else if (user.phone) {
        // Fallback: Use user phone as temporary address identifier
        clientAddress = `Dirección temporal - Tel: ${user.phone}`;
        console.warn('Using fallback address due to incomplete user data');
      } else {
        clientAddress = 'Dirección a confirmar por cliente';
        console.warn('Using minimal address fallback');
      }

      toast.info('Creando tu reserva...', { duration: 1000 });

      // ROBUST BOOKING DATA - with fallbacks
      const bookingData = {
        listingId: serviceId!,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        recurrenceType: selectedFrequency,
        notes: notes || 'Reserva creada desde la aplicación',
        clientAddress,
        clientPhone: user.phone || 'Por confirmar',
        clientEmail: user.email || 'Por confirmar',
        customVariableSelections: Object.keys(customVariableSelections).length > 0 ? customVariableSelections : undefined,
        customVariablesTotalPrice: customVariablesTotalPrice
      };

      console.log('Datos de reserva preparados:', bookingData);

      // ULTRA-ROBUST BOOKING CREATION with Enhanced Error Handling
      toast.info('Creando tu reserva...', { duration: 2000 });
      
      const bookingResult = await RobustBookingSystem.createBooking(
        () => createRecurringBooking(bookingData),
        {
          maxAttempts: 3,
          showProgress: true,
          optimisticValidation: true
        }
      );

      if (bookingResult.success && bookingResult.appointmentId) {
        console.log('✅ Reserva creada exitosamente:', bookingResult.appointmentId);
        toast.success('¡Reserva confirmada! Redirigiendo...', { 
          duration: 2000,
          description: `ID: ${bookingResult.appointmentId.slice(-8)}`
        });
        
        // Navigate to bookings with success state
        setTimeout(() => {
          navigate('/client/bookings', { 
            replace: true,
            state: { newBookingId: bookingResult.appointmentId }
          });
        }, 1500);
      } else {
        // Booking failed after all attempts
        const errorMessage = bookingResult.error || 'Error desconocido al crear la reserva';
        console.error('💥 Booking failed completely:', errorMessage);
        
        toast.error(errorMessage, {
          duration: 6000,
          action: {
            label: 'Ver mis citas',
            onClick: () => navigate('/client/bookings')
          }
        });
      }

    } catch (error) {
      console.error('Error crítico en handleBooking:', error);
      toast.error('Error inesperado al crear la reserva. Intenta de nuevo.', {
        duration: 4000,
        action: {
          label: 'Reintentar',
          onClick: handleBooking
        }
      });
    }
  };

  const getRecurrenceText = (frequency: string) => {
    switch (frequency) {
      case 'weekly': return 'semanal';
      case 'biweekly': return 'quincenal';
      case 'triweekly': return 'trisemanal';
      case 'monthly': return 'mensual';
      default: return 'una vez';
    }
  };

  const formatPrice = (price: number | string) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return numPrice.toLocaleString('es-CR', {
      minimumFractionDigits: 0
    });
  };

  // Build client location string using complete data from database
  const clientLocation = buildCompleteLocation({
    residenciaName: completeUserData?.residencias?.name,
    condominiumText: completeUserData?.condominium_text,
    condominiumName: completeUserData?.condominium_name,
    houseNumber: completeUserData?.house_number,
    isExternal: false
  });

  console.log('Complete user data for location:', {
    residenciaName: completeUserData?.residencias?.name,
    condominiumName: completeUserData?.condominium_text,
    houseNumber: completeUserData?.house_number
  });

  console.log('Final client location:', clientLocation);

  return (
    <PageLayout>
      {/* Back button positioned in top left corner above title */}
      <BookingHeader onBackClick={handleBackNavigation} />

      {/* Service summary */}
      <ServiceSummaryCard
        serviceTitle={serviceDetails.title}
        clientLocation={clientLocation}
        isLoadingLocation={isLoadingUserData}
        selectedVariant={selectedVariant}
        formatPrice={formatPrice}
      />

      {/* Single Column Layout - Same for Desktop and Mobile */}
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Booking Form */}
        <NewBookingForm
          selectedFrequency={selectedFrequency}
          onFrequencyChange={setSelectedFrequency}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          onDateChange={setSelectedDate}
          onTimeChange={setSelectedTime}
          providerId={providerId}
          listingId={serviceId || ''}
           selectedVariants={selectedVariants}
          notes={notes}
          onNotesChange={setNotes}
          customVariableGroups={serviceDetails.custom_variable_groups}
          customVariableSelections={customVariableSelections}
          onCustomVariableSelectionsChange={(selections, totalPrice) => {
            setCustomVariableSelections(selections);
            setCustomVariablesTotalPrice(totalPrice);
          }}
        />

        {/* Booking Summary */}
        <BookingSummaryCard
          serviceTitle={serviceDetails.title}
          providerName={serviceDetails.provider?.name}
          selectedVariant={selectedVariant}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          clientLocation={clientLocation}
          isLoadingLocation={isLoadingUserData}
          isBookingValid={isBookingValid}
          isLoading={isLoading}
          onBooking={handleBooking}
          formatPrice={formatPrice}
          getRecurrenceText={getRecurrenceText}
          selectedFrequency={selectedFrequency}
          customVariablesTotalPrice={customVariablesTotalPrice}
        />
      </div>
    </PageLayout>
  );
};

export default ClientBooking;
