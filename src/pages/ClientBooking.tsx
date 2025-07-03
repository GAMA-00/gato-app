
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
    if (!isBookingValid || !user) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    // Create start and end times
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const startDateTime = new Date(selectedDate);
    startDateTime.setHours(hours, minutes, 0, 0);
    
    const endDateTime = new Date(startDateTime);
    endDateTime.setMinutes(endDateTime.getMinutes() + selectedVariant.duration);

    // Validate the booking slot
    const isValid = await validateBookingSlot(
      providerId,
      startDateTime,
      endDateTime,
      selectedFrequency
    );

    if (!isValid) {
      return; // Error already shown by validation
    }

    // Create the booking - Use profile data for address instead of user properties
    const bookingData = {
      listingId: serviceId!,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      recurrenceType: selectedFrequency,
      notes,
      clientAddress: completeUserData?.condominium_text && completeUserData?.house_number 
        ? `${completeUserData.condominium_text}, Casa ${completeUserData.house_number}`
        : '',
      clientPhone: user.phone || '',
      clientEmail: user.email || '',
      customVariableSelections: Object.keys(customVariableSelections).length > 0 ? customVariableSelections : undefined,
      customVariablesTotalPrice: customVariablesTotalPrice
    };

    const result = await createRecurringBooking(bookingData);
    
    if (result) {
      toast.success('¡Reserva creada exitosamente!');
      navigate('/client/bookings');
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
