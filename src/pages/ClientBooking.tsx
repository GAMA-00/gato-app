
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
import BookingForm from '@/components/client/booking/BookingForm';
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

  // Validation
  const isBookingValid = selectedDate && selectedTime && selectedVariants?.length > 0;
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
    console.log('=== INICIANDO PROCESO DE RESERVA ===');
    console.log('Estado de validación:', { isBookingValid, hasUser: !!user, hasUserData: !!completeUserData });
    
    // Fase 2: Validar datos básicos
    if (!isBookingValid || !user) {
      console.error('Validación fallida - campos básicos:', { isBookingValid, hasUser: !!user });
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    // Validar que los datos del usuario estén cargados
    if (isLoadingUserData) {
      console.log('Esperando datos del usuario...');
      toast.error('Cargando información del usuario, intenta de nuevo en un momento');
      return;
    }

    if (!completeUserData) {
      console.error('No se pudieron cargar los datos del usuario');
      toast.error('Error al cargar los datos del usuario. Verifica tu perfil.');
      return;
    }

    console.log('Datos del usuario cargados:', completeUserData);
    toast.info('Validando horario disponible...');

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

      // Fase 4: Validar slot con timeout
      const validationPromise = validateBookingSlot(
        providerId,
        startDateTime,
        endDateTime,
        selectedFrequency
      );

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout de validación')), 10000)
      );

      const isValid = await Promise.race([validationPromise, timeoutPromise]);

      if (!isValid) {
        console.error('Validación de slot fallida');
        return; // Error already shown by validation
      }

      console.log('Slot validado correctamente');
      toast.info('Creando reserva...');

      // Preparar dirección del cliente
      const clientAddress = completeUserData?.condominium_text && completeUserData?.house_number 
        ? `${completeUserData.condominium_text}, Casa ${completeUserData.house_number}`
        : '';

      if (!clientAddress) {
        console.warn('Dirección del cliente incompleta:', {
          condominium: completeUserData?.condominium_text,
          house: completeUserData?.house_number
        });
        toast.error('Tu dirección está incompleta. Por favor actualiza tu perfil.');
        return;
      }

      // Create the booking data
      const bookingData = {
        listingId: serviceId!,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        recurrenceType: selectedFrequency,
        notes,
        clientAddress,
        clientPhone: user.phone || '',
        clientEmail: user.email || '',
        customVariableSelections: Object.keys(customVariableSelections).length > 0 ? customVariableSelections : undefined,
        customVariablesTotalPrice: customVariablesTotalPrice
      };

      console.log('Datos de reserva preparados:', bookingData);

      const result = await createRecurringBooking(bookingData);
      
      if (result) {
        console.log('Reserva creada exitosamente:', result);
        toast.success('¡Reserva creada exitosamente!');
        
        // Fase 5: Navegación con confirmación
        setTimeout(() => {
          console.log('Navegando a bookings...');
          navigate('/client/bookings');
        }, 1500);
      } else {
        console.error('createRecurringBooking retornó null');
        toast.error('Error inesperado al crear la reserva');
      }
    } catch (error) {
      console.error('Error en handleBooking:', error);
      if (error.message === 'Timeout de validación') {
        toast.error('La validación está tomando mucho tiempo. Intenta de nuevo.');
      } else {
        toast.error('Error inesperado: ' + (error.message || 'Error desconocido'));
      }
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Booking Form */}
        <BookingForm
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

        {/* Right Column - Booking Summary */}
        <div className="space-y-6">
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
      </div>
    </PageLayout>
  );
};

export default ClientBooking;
