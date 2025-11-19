
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRecurringBooking } from '@/hooks/useRecurringBooking';
import { validateBookingSlot } from '@/utils/bookingValidation';
import { buildCompleteLocation } from '@/utils/locationBuilder';
import { RobustBookingSystem } from '@/utils/robustBookingSystem';
import PageLayout from '@/components/layout/PageLayout';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
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
  const queryClient = useQueryClient();

  // Get data from navigation state
  const { providerId, serviceDetails, selectedVariants, rescheduleData } = location.state || {};

  // Detect reschedule mode from URL params
  const searchParams = new URLSearchParams(location.search);
  const isRescheduleMode = searchParams.get('mode') === 'reschedule';

  // Step navigation state
  const [currentStep, setCurrentStep] = useState(isRescheduleMode ? 2 : 1);

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

  // Pre-load reschedule data if in reschedule mode
  useEffect(() => {
    if (isRescheduleMode && rescheduleData) {
      setCurrentStep(2);
      // Pre-set frequency to 'once' for rescheduled appointments
      setSelectedFrequency('once');
    }
  }, [isRescheduleMode, rescheduleData]);

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

  // Make reschedule mode self-sufficient using serviceId from URL
  const listingIdForReschedule = serviceId || rescheduleData?.listingId || null;

  // Query to load service data when in reschedule mode
  const { data: rescheduleServiceData, isLoading: isLoadingRescheduleService } = useQuery({
    queryKey: ['reschedule-service', listingIdForReschedule],
    queryFn: async () => {
      if (!listingIdForReschedule) return null;
      
      const { data, error } = await supabase
        .from('listings')
        .select(`
          id,
          provider_id,
          title,
          slot_size,
          standard_duration,
          duration,
          is_post_payment,
          custom_variable_groups,
          service_variants,
          service_types (
            name,
            category_id
          ),
          users!listings_provider_id_fkey (
            id,
            name
          )
        `)
        .eq('id', listingIdForReschedule)
        .maybeSingle();
      
      if (error) {
        bookingLogger.error('Error loading reschedule service:', { error });
        return null;
      }
      
      if (!data) return null;
      
      // Transform data to match expected structure
      return {
        ...data,
        provider: data.users
      };
    },
    enabled: isRescheduleMode && !!listingIdForReschedule,
  });

  // Use effective variables based on mode - robust fallbacks
  const effectiveServiceDetails = isRescheduleMode 
    ? rescheduleServiceData 
    : serviceDetails;

  // Unified listing ID for booking
  const listingIdForBooking = serviceId || rescheduleData?.listingId || effectiveServiceDetails?.id || '';

  const effectiveProviderId = isRescheduleMode 
    ? (rescheduleData?.providerId || rescheduleServiceData?.provider_id || providerId || '')
    : providerId;

  // Reinforce variants with fallback duration if variants are not available
  const effectiveSelectedVariants = isRescheduleMode && Array.isArray(rescheduleServiceData?.service_variants)
    ? rescheduleServiceData.service_variants.slice(0, 1).map((v: any) => ({
        ...v,
        quantity: 1,
        personQuantity: 1
      }))
    : isRescheduleMode && rescheduleServiceData
    ? [{
        duration: rescheduleServiceData.slot_size || rescheduleServiceData.standard_duration || rescheduleServiceData.duration || 60,
        quantity: 1,
        personQuantity: 1
      }]
    : (selectedVariants || []);

  // Debug logging for reschedule mode
  useEffect(() => {
    if (isRescheduleMode) {
      bookingLogger.debug('Reschedule mode data check', {
        listingIdForReschedule,
        hasRescheduleServiceData: !!rescheduleServiceData,
        isLoadingRescheduleService,
        effectiveServiceDetails: !!effectiveServiceDetails,
        listingIdForBooking,
        effectiveProviderId
      });
    }
  }, [isRescheduleMode, rescheduleServiceData, isLoadingRescheduleService, effectiveServiceDetails, listingIdForBooking, effectiveProviderId, listingIdForReschedule]);

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
  const isBookingValid = selectedDate && selectedTime && effectiveSelectedVariants?.length > 0 && !isLoadingUserData;
  const selectedVariant = effectiveSelectedVariants?.[0];
  const slotSize = effectiveServiceDetails?.slot_size || 60; // Default to 60 if not specified

  const handleBackNavigation = () => {
    // Scroll to top before navigation
    window.scrollTo(0, 0);
    
    // If in reschedule mode, go back to bookings
    if (isRescheduleMode) {
      navigate('/client/bookings');
    } else {
      // Navigate back to categories page
      navigate('/client/categories');
    }
  };

  const handleReschedule = async () => {
    if (!user || !selectedDate || !selectedTime) {
      toast.error('Información incompleta para reagendar');
      return;
    }

    try {
      // Create start and end times
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const startDateTime = new Date(selectedDate);
      startDateTime.setHours(hours, minutes, 0, 0);
      
      const endDateTime = new Date(startDateTime);
      const duration = totalDuration > 0 ? totalDuration : (selectedVariant?.duration || 60);
      endDateTime.setMinutes(endDateTime.getMinutes() + duration);

      // Get client address from complete user data
      let clientAddress = '';
      
      if (completeUserData?.condominium_text && completeUserData?.house_number) {
        clientAddress = `${completeUserData.condominium_text}, Casa ${completeUserData.house_number}`;
      } else if (user.phone) {
        clientAddress = `Dirección temporal - Tel: ${user.phone}`;
      } else {
        clientAddress = 'Dirección a confirmar por cliente';
      }

      // Use the unified constants
      if (!listingIdForBooking || !effectiveProviderId) {
        toast.error('Error: información del servicio incompleta');
        return;
      }

      // Create new appointment as "once" type
      const { data: newAppointment, error } = await supabase
        .from('appointments')
        .insert({
          listing_id: listingIdForBooking,
          provider_id: effectiveProviderId,
          client_id: user.id,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          status: 'pending',
          recurrence: 'none',
          is_recurring_instance: false,
          client_name: user.name,
          client_email: user.email,
          client_phone: user.phone,
          client_address: clientAddress,
          notes: rescheduleData?.originalDate
            ? `Reagendada desde: ${format(rescheduleData.originalDate, 'dd/MM/yyyy')}`
            : 'Cita reagendada desde Mis Reservas',
          created_from: 'client_app'
        })
        .select()
        .single();

      if (error) throw error;

      // Invalidar queries
      await queryClient.invalidateQueries({ queryKey: ['client-bookings'] });
      await queryClient.invalidateQueries({ queryKey: ['unified-recurring-appointments'] });

      // Mostrar éxito y navegar
      toast.success('Cita reagendada exitosamente');
      navigate('/client/bookings');

    } catch (error) {
      bookingLogger.error('Error rescheduling appointment:', { error });
      toast.error('Error al reagendar la cita');
    }
  };

  // Show loading state while fetching reschedule service data
  if (isRescheduleMode && isLoadingRescheduleService) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="ml-3 text-muted-foreground">Cargando información del servicio...</p>
        </div>
      </PageLayout>
    );
  }

  // Differentiated validation: more permissive for reschedule mode
  if (isRescheduleMode) {
    // In reschedule mode, we need at least listingId, providerId, and serviceDetails
    if (!listingIdForBooking || !effectiveProviderId || !effectiveServiceDetails) {
      return (
        <PageLayout>
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              No se pudo cargar la información del servicio
            </p>
            <button
              onClick={() => navigate('/client/bookings')}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Volver a Mis Reservas
            </button>
          </div>
        </PageLayout>
      );
    }
  } else {
    // Normal mode requires full service details
    if (!effectiveServiceDetails || !effectiveProviderId) {
      return (
        <PageLayout>
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              No se pudo cargar la información del servicio
            </p>
            <button
              onClick={() => navigate('/client/categories')}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Volver a Categorías
            </button>
          </div>
        </PageLayout>
      );
    }
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
      const totalPrice = effectiveSelectedVariants.reduce((sum, variant) => {
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
        providerId: effectiveProviderId
      };

      // Scroll to top before navigating to checkout
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      
      // Navigate to checkout with all data
      navigate('/checkout', {
        state: {
          serviceTitle: effectiveServiceDetails.title,
          providerName: effectiveServiceDetails.provider?.name,
          selectedVariants: effectiveSelectedVariants,
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
      {/* Title - Hide on step 3 or if in reschedule mode */}
      {currentStep !== 3 && !isRescheduleMode && (
        <h1 className="text-2xl md:text-3xl font-bold text-center mb-6">
          Reservar Servicio
        </h1>
      )}

      {isRescheduleMode && (
        <h1 className="text-2xl md:text-3xl font-bold text-center mb-6">
          Reagendar Cita
        </h1>
      )}

      {/* Info card para modo reschedule */}
      {isRescheduleMode && rescheduleData && (
        <div className="max-w-2xl mx-auto mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm text-blue-800 font-medium">
            <strong>Cita original:</strong> {format(rescheduleData.originalDate, "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Selecciona un nuevo horario para recibir el servicio
          </p>
        </div>
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
          providerId={effectiveProviderId}
          listingId={listingIdForBooking}
          selectedVariants={effectiveSelectedVariants}
          notes={notes}
          onNotesChange={setNotes}
          customVariableGroups={effectiveServiceDetails?.custom_variable_groups}
          customVariableSelections={customVariableSelections}
          onCustomVariableSelectionsChange={(selections, totalPrice) => {
            setCustomVariableSelections(selections);
            setCustomVariablesTotalPrice(totalPrice);
          }}
          slotSize={slotSize}
          onNextStep={handleNextStep}
          onPrevStep={handlePrevStep}
          isRescheduleMode={isRescheduleMode}
          onReschedule={handleReschedule}
          serviceDetails={effectiveServiceDetails}
        />

        {/* Booking Summary - Only show on Step 3 and not in reschedule mode */}
        {currentStep === 3 && !isRescheduleMode && (
          <BookingSummaryCard
            serviceTitle={effectiveServiceDetails.title}
            providerName={effectiveServiceDetails.provider?.name}
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
