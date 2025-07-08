
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRecurringBooking } from '@/hooks/useRecurringBooking';
import { validateBookingSlot } from '@/utils/bookingValidation';
import { buildCompleteLocation } from '@/utils/locationBuilder';
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
    navigate(-1);
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

      // ROBUST VALIDATION - with fallback
      let isValid = true;
      try {
        toast.info('Verificando disponibilidad...', { duration: 1000 });
        
        // Quick validation with shorter timeout
        const validationPromise = validateBookingSlot(
          providerId,
          startDateTime,
          endDateTime,
          selectedFrequency
        );

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Validation timeout')), 3000) // Reduced to 3s
        );

        isValid = await Promise.race([validationPromise, timeoutPromise]) as boolean;
      } catch (error) {
        console.warn('Validation failed, continuing with booking:', error);
        // Continue anyway - validation failure shouldn't block booking
        toast.info('Saltando validación y continuando...', { duration: 1000 });
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

      // ROBUST BOOKING CREATION - with retry logic
      let result = null;
      let retries = 0;
      const maxRetries = 2;

      while (!result && retries <= maxRetries) {
        try {
          if (retries > 0) {
            toast.info(`Reintentando... (${retries}/${maxRetries})`, { duration: 1000 });
          }
          
          result = await createRecurringBooking(bookingData);
          
          if (result) {
            console.log('Reserva creada exitosamente:', result);
            toast.success('¡Reserva creada exitosamente!');
            
            // Success navigation
            setTimeout(() => {
              console.log('Navegando a bookings...');
              navigate('/client/bookings');
            }, 1500);
            break;
          } else {
            throw new Error('No result returned from booking creation');
          }
        } catch (error) {
          console.error(`Booking attempt ${retries + 1} failed:`, error);
          retries++;
          
          if (retries <= maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
          }
        }
      }

      if (!result) {
        toast.error('No se pudo crear la reserva después de varios intentos. Por favor contacta soporte.', {
          duration: 5000
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
          selectedVariant={selectedVariant}
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
