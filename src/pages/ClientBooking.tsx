import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRecurringBooking } from '@/hooks/useRecurringBooking';
import { validateBookingSlot } from '@/utils/bookingValidation';
import { buildLocationString } from '@/utils/locationUtils';
import PageContainer from '@/components/layout/PageContainer';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, MapPin, Clock, DollarSign, Calendar as CalendarIcon } from 'lucide-react';
import RecurrenceSelector from '@/components/client/booking/RecurrenceSelector';
import DateTimeSelector from '@/components/client/booking/DateTimeSelector';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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

  // Scroll to top when component mounts - improved version
  useEffect(() => {
    // Use setTimeout to ensure the page is fully rendered before scrolling
    setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }, 0);
  }, []);

  // Validation
  const isBookingValid = selectedDate && selectedTime && selectedVariants?.length > 0;
  const selectedVariant = selectedVariants?.[0];

  if (!serviceDetails || !providerId || !selectedVariants) {
    return (
      <>
        <Navbar />
        <PageContainer title="Error" subtitle="">
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              No se pudo cargar la información del servicio
            </p>
            <Button onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          </div>
        </PageContainer>
      </>
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

    // Create the booking
    const bookingData = {
      listingId: serviceId!,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      recurrenceType: selectedFrequency,
      notes,
      clientAddress: user.condominiumName && user.houseNumber 
        ? `${user.condominiumName}, Casa ${user.houseNumber}`
        : '',
      clientPhone: user.phone || '',
      clientEmail: user.email || '',
      apartment: user.apartment || ''
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

  // Build client location string with debugging
  const clientLocation = buildLocationString({
    residenciaName: user?.condominiumName,
    condominiumName: user?.condominiumName,
    houseNumber: user?.houseNumber,
    apartment: user?.apartment
  });

  console.log('User data for location:', {
    condominiumName: user?.condominiumName,
    houseNumber: user?.houseNumber,
    apartment: user?.apartment
  });

  console.log('Final client location:', clientLocation);

  return (
    <>
      <Navbar />
      <PageContainer title="" subtitle="">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Back button positioned in top left corner above title */}
          <div className="w-full">
            <Button 
              variant="ghost" 
              onClick={() => navigate(-1)}
              className="mb-2 p-0 h-auto text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
            
            {/* Centered Title */}
            <h1 className="text-2xl md:text-3xl font-bold text-luxury-navy mb-6 text-center">
              Reservar Servicio
            </h1>
          </div>

          {/* Service summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <CalendarIcon className="h-6 w-6 text-primary" />
                {serviceDetails.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {clientLocation}
                  </span>
                </div>
                {selectedVariant && (
                  <>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{selectedVariant.duration} minutos</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        ${formatPrice(selectedVariant.price)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Booking Form */}
            <div className="space-y-6">
              {/* 1. Recurrence Selection */}
              <RecurrenceSelector
                selectedFrequency={selectedFrequency}
                onFrequencyChange={setSelectedFrequency}
              />

              {/* 2. & 3. & 4. Date and Time Selection with Refresh */}
              <DateTimeSelector
                selectedDate={selectedDate}
                selectedTime={selectedTime}
                onDateChange={setSelectedDate}
                onTimeChange={setSelectedTime}
                providerId={providerId}
                serviceDuration={selectedVariant?.duration || 60}
                selectedFrequency={selectedFrequency}
              />

              {/* Notes */}
              <Card>
                <CardContent className="pt-6">
                  <label className="text-base font-medium mb-3 block">
                    Notas adicionales (opcional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Instrucciones especiales, preferencias, etc."
                    className="w-full p-3 border rounded-lg min-h-[100px] resize-none"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Booking Summary */}
            <div className="space-y-6">
              {/* 5. Booking Summary */}
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle>Resumen de Reserva</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="font-medium">{serviceDetails.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {serviceDetails.provider?.name}
                    </p>
                  </div>

                  {selectedVariant && (
                    <div>
                      <p className="font-medium">{selectedVariant.name}</p>
                      <div className="flex justify-between text-sm">
                        <span>Duración:</span>
                        <span>{selectedVariant.duration} min</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Precio:</span>
                        <span className="font-medium">${formatPrice(selectedVariant.price)}</span>
                      </div>
                    </div>
                  )}

                  {selectedDate && selectedTime && (
                    <div>
                      <p className="font-medium text-sm mb-1">Fecha y hora:</p>
                      <p className="text-sm">
                        {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                      </p>
                      <p className="text-sm">
                        {selectedTime} ({getRecurrenceText(selectedFrequency)})
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="font-medium text-sm mb-1">Ubicación:</p>
                    <p className="text-sm">
                      {clientLocation}
                    </p>
                  </div>

                  {/* 6. Booking Button */}
                  <Button
                    onClick={handleBooking}
                    disabled={!isBookingValid || isLoading}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    size="lg"
                  >
                    {isLoading ? 'Creando reserva...' : 'Confirmar Reserva'}
                  </Button>

                  {!isBookingValid && (
                    <p className="text-sm text-muted-foreground text-center">
                      Completa todos los campos para continuar
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
        
        {/* Scroll to top button */}
      </PageContainer>
    </>
  );
};

export default ClientBooking;
