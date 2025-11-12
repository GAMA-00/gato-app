
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
import NewBookingForm from '@/components/client/booking/NewBookingForm';
import BookingSummaryCard from '@/components/client/booking/BookingSummaryCard';
import { bookingLogger, locationLogger } from '@/utils/logger';
import { setBookingStep, registerBookingStepSetter, unregisterBookingStepSetter } from '@/hooks/useBackNavigation';

const ClientBooking = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { createRecurringBooking, isLoading } = useRecurringBooking();

  // Get data from navigation state
  const { providerId, serviceDetails, selectedVariants } = location.state || {};

  // Step navigation state
  const [currentStep, setCurrentStep] = useState(1);

  // Register step setter for back navigation
  useEffect(() => {
    registerBookingStepSetter(setCurrentStep);
    return () => {
      unregisterBookingStepSetter();
    };
  }, []);

  // Update global step state whenever currentStep changes
  useEffect(() => {
    setBookingStep(currentStep);
  }, [currentStep]);

  // Booking form state
  const [selectedFrequency, setSelectedFrequency] = useState('once');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [customVariableSelections, setCustomVariableSelections] = useState<any>({});
  const [customVariablesTotalPrice, setCustomVariablesTotalPrice] = useState<number>(0);

  const handleNextStep = () => {
    setCurrentStep(prev => Math.min(prev + 1, 3));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
  const slotSize = serviceDetails?.slot_size || 60; // Default to 60 if not specified

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
        </div>
      </PageLayout>
    );
  }

  const handleBooking = async () => {
    bookingLogger.info('Iniciando proceso de checkout');
    
    // VALIDATION
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

    try {
      // Create start and end times
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const startDateTime = new Date(selectedDate);
      startDateTime.setHours(hours, minutes, 0, 0);
      
      const endDateTime = new Date(startDateTime);
      const duration = totalDuration > 0 ? totalDuration : selectedVariant.duration;
      endDateTime.setMinutes(endDateTime.getMinutes() + duration);

      // ROBUST USER DATA HANDLING
      let clientAddress = '';

      if (completeUserData?.condominium_text && completeUserData?.house_number) {
        clientAddress = `${completeUserData.condominium_text}, Casa ${completeUserData.house_number}`;
      } else if (user.phone) {
        clientAddress = `Dirección temporal - Tel: ${user.phone}`;
      } else {
        clientAddress = 'Dirección a confirmar por cliente';
      }

      // Calculate total price
      const totalPrice = selectedVariants.reduce((sum, variant) => {
        const basePrice = Number(variant.price) * variant.quantity;
        const additionalPersonPrice = variant.personQuantity && variant.additionalPersonPrice 
          ? Number(variant.additionalPersonPrice) * (variant.personQuantity - 1) * variant.quantity
          : 0;
        return sum + basePrice + additionalPersonPrice;
      }, 0) + customVariablesTotalPrice;

      // BOOKING DATA for payment
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
        customVariablesTotalPrice: customVariablesTotalPrice,
        selectedSlotIds: selectedSlotIds.length > 0 ? selectedSlotIds : undefined,
        totalDuration: totalDuration > 0 ? totalDuration : undefined,
        providerId
      };

      // Scroll to top before navigating to checkout
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      
      // Navigate to checkout with all data
      navigate('/checkout', {
        state: {
          serviceTitle: serviceDetails.title,
          providerName: serviceDetails.provider?.name,
          selectedVariants,
          selectedDate,
          selectedTime,
          clientLocation,
          bookingData,
          totalPrice
        }
      });

    } catch (error) {
      console.error('Error al procesar checkout:', error);
      toast.error('Error inesperado. Intenta de nuevo.', {
        duration: 4000
      });
    }
  };

  const getRecurrenceText = (frequency: string) => {
    switch (frequency) {
      case 'weekly': return 'semanal';
      case 'biweekly': return 'quincenal';
      case 'triweekly': return 'cada 3 semanas';
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

  locationLogger.debug('Complete user data for location', {
    residenciaName: completeUserData?.residencias?.name,
    condominiumName: completeUserData?.condominium_text,
    houseNumber: completeUserData?.house_number
  });

  locationLogger.debug('Final client location', clientLocation);

  return (
    <PageLayout>
      {/* Title - Hide on step 3 */}
      {currentStep !== 3 && (
        <h1 className="text-2xl md:text-3xl font-bold text-center mb-6">
          Reservar Servicio
        </h1>
      )}

      {/* Single Column Layout - Same for Desktop and Mobile */}
      <div className="max-w-2xl mx-auto space-y-3">
        {/* Booking Form with Step Navigation */}
        <NewBookingForm
          currentStep={currentStep}
          selectedFrequency={selectedFrequency}
          onFrequencyChange={setSelectedFrequency}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          totalDuration={totalDuration}
          onDateChange={setSelectedDate}
          onTimeChange={setSelectedTime}
          onDurationChange={(duration, slotIds) => {
            setTotalDuration(duration);
            setSelectedSlotIds(slotIds || []);
          }}
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
          slotSize={slotSize}
          onNextStep={handleNextStep}
          onPrevStep={handlePrevStep}
        />

        {/* Booking Summary - Only show on Step 3 */}
        {currentStep === 3 && (
          <BookingSummaryCard
            serviceTitle={serviceDetails.title}
            providerName={serviceDetails.provider?.name}
            selectedVariant={selectedVariant}
            selectedVariants={selectedVariants}
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
            selectedSlotIds={selectedSlotIds}
            isPostPayment={serviceDetails?.is_post_payment || false}
          />
        )}
      </div>
    </PageLayout>
  );
};

export default ClientBooking;
