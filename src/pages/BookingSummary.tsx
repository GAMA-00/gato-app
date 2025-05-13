
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import PageContainer from '@/components/layout/PageContainer';
import { ArrowLeft, Calendar, Clock, User } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import DateTimeSelector from '@/components/client/booking/DateTimeSelector';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const BookingSummary = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { bookingData } = location.state || {};
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estados para fecha y hora
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    bookingData?.startTime ? new Date(bookingData.startTime) : undefined
  );
  const [selectedTime, setSelectedTime] = useState<string | undefined>(
    bookingData?.startTime ? format(new Date(bookingData.startTime), 'HH:mm') : undefined
  );
  
  // Verificar autenticación al cargar el componente
  useEffect(() => {
    if (!isAuthenticated || !user) {
      toast.error("Debes iniciar sesión para reservar un servicio");
      navigate('/login', { state: { redirectTo: location.pathname, bookingData } });
      return;
    }
  }, [isAuthenticated, user]);
  
  // If no booking data, redirect to the main page
  if (!bookingData) {
    React.useEffect(() => {
      toast.error("Información de reserva no encontrada");
      navigate('/client');
    }, []);
    return null;
  }
  
  // Validate that we have required data before showing the form
  const hasRequiredData = !!(
    bookingData.serviceName &&
    bookingData.providerName &&
    bookingData.duration &&
    typeof bookingData.price === 'number'
  );

  // Format price safely to avoid NaN
  const formattedPrice = typeof bookingData.price === 'number' && !isNaN(bookingData.price)
    ? bookingData.price.toFixed(2)
    : '0.00';
  
  // Format duration to hours and minutes (HH:MM)
  const formatDurationHHMM = (minutes) => {
    if (!minutes || isNaN(minutes)) return '00:00';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };
  
  // Normalize recurrence value to match database constraints
  const normalizeRecurrenceValue = (value) => {
    // Map front-end values to database-allowed values
    const recurrenceMap = {
      'once': null,     // For 'once', we'll use null in the database
      'weekly': 'weekly',
      'biweekly': 'biweekly',
      'monthly': 'monthly',
      'daily': 'daily'
    };
    
    return recurrenceMap[value] || null;
  };
  
  // Mutation to create appointment
  const createAppointmentMutation = useMutation({
    mutationFn: async () => {
      // Verificar si el usuario está autenticado
      if (!user?.id) {
        throw new Error("Debes iniciar sesión para reservar un servicio");
      }
      
      // Ensure we have date and time selected
      if (!selectedDate || !selectedTime) {
        throw new Error("Debes seleccionar una fecha y hora para el servicio");
      }
      
      // Calculate start time based on selected date and time
      // Parse selected time
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const startTime = new Date(selectedDate);
      startTime.setHours(hours, minutes, 0, 0);
      
      // Calculate end time based on start time and duration
      const durationMinutes = bookingData.duration || 60;
      const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
      
      // Normalize the recurrence value
      const normalizedRecurrence = normalizeRecurrenceValue(bookingData.frequency);
      
      console.log("Creating appointment with data:", {
        client_id: user.id,
        provider_id: bookingData.providerId,
        listing_id: bookingData.serviceId,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration: durationMinutes,
        price: bookingData.price,
        status: 'pending',
        recurrence: normalizedRecurrence
      });
      
      const { data, error } = await supabase
        .from('appointments')
        .insert({
          client_id: user.id,
          provider_id: bookingData.providerId,
          listing_id: bookingData.serviceId,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          status: 'pending',
          residencia_id: user.residenciaId || null,
          apartment: user.apartment || '',
          notes: bookingData.notes || '',
          recurrence: normalizedRecurrence
        })
        .select();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success("Reserva solicitada con éxito");
      navigate('/client/bookings');
    },
    onError: (error: any) => {
      console.error("Error creating appointment:", error);
      
      // Mensajes de error más amigables y específicos
      if (error.message.includes('recurrence_check')) {
        toast.error("Error: El tipo de recurrencia seleccionado no es válido.");
      } else if (error.message.includes('foreign key')) {
        toast.error("Error: Hay un problema con tu perfil de usuario. Por favor contacta a soporte.");
      } else {
        toast.error(`Error al crear la reserva: ${error.message}`);
      }
      
      setIsSubmitting(false);
    }
  });
  
  const handleBack = () => {
    navigate(-1);
  };
  
  const handleConfirm = () => {
    // Validar autenticación
    if (!isAuthenticated || !user) {
      toast.error("Debes iniciar sesión para reservar un servicio");
      navigate('/login', { state: { redirectTo: location.pathname, bookingData } });
      return;
    }
    
    // Validar datos requeridos
    if (!hasRequiredData) {
      toast.error("Faltan datos necesarios para completar la reserva");
      return;
    }
    
    // Validar que se haya seleccionado fecha y hora
    if (!selectedDate || !selectedTime) {
      toast.error("Por favor selecciona una fecha y hora para el servicio");
      return;
    }

    setIsSubmitting(true);
    createAppointmentMutation.mutate();
  };
  
  // Format date if exists
  const formattedDate = selectedDate
    ? format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })
    : 'No seleccionada';
    
  // Format time if exists
  const formattedTime = selectedTime || 'No seleccionada';

  return (
    <PageContainer
      title="Confirmar Reserva"
      subtitle={
        <Button 
          variant="ghost" 
          onClick={handleBack} 
          className="p-0 h-auto flex items-center text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} className="mr-1" />
          <span>Volver</span>
        </Button>
      }
    >
      <div className="max-w-lg mx-auto">
        {/* Date and Time Selector - Now always required */}
        <DateTimeSelector 
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          selectedTime={selectedTime}
          onTimeChange={setSelectedTime}
        />
        
        <Card className="shadow-md">
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold mb-6">Resumen del servicio</h2>
            
            {/* Service data */}
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Servicio:</span>
                <span className="font-medium">{bookingData.serviceName || 'No especificado'}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Proveedor:</span>
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-1 text-luxury-navy" />
                  <span className="font-medium">{bookingData.providerName || 'No especificado'}</span>
                </div>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duración:</span>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1 text-luxury-navy" />
                  <span className="font-medium">
                    {bookingData.duration 
                      ? formatDurationHHMM(bookingData.duration) 
                      : '00:00'}
                  </span>
                </div>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fecha:</span>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1 text-luxury-navy" />
                  <span className="font-medium capitalize">{formattedDate}</span>
                </div>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hora:</span>
                <span className="font-medium">{formattedTime}</span>
              </div>
              
              {bookingData.frequency && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Frecuencia:</span>
                  <span className="font-medium capitalize">{
                    bookingData.frequency === 'once' ? 'Una vez' : 
                    bookingData.frequency === 'weekly' ? 'Semanal' :
                    bookingData.frequency === 'biweekly' ? 'Quincenal' : 
                    bookingData.frequency === 'monthly' ? 'Mensual' :
                    bookingData.frequency
                  }</span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Observaciones:</span>
                <span className="font-medium text-right">{bookingData.notes || 'Ninguna'}</span>
              </div>
            </div>
            
            <Separator className="my-6" />
            
            {/* Price */}
            <div className="flex justify-between text-lg font-semibold mb-6">
              <span>Precio total:</span>
              <span className="text-luxury-navy">${formattedPrice}</span>
            </div>
            
            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={handleBack}
                disabled={isSubmitting}
              >
                Volver
              </Button>
              <Button 
                className="flex-1 bg-luxury-navy hover:bg-luxury-navy/90" 
                onClick={handleConfirm}
                disabled={isSubmitting || !hasRequiredData || (!isAuthenticated || !user) || !selectedDate || !selectedTime}
              >
                {isSubmitting ? 'Enviando...' : 'Confirmar Reserva'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
};

export default BookingSummary;
