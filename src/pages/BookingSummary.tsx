
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from "@/hooks/use-toast";
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
  
  // Verify we have both auth and booking data
  useEffect(() => {
    if (!isAuthenticated || !user) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para reservar un servicio",
        variant: "destructive"
      });
      navigate('/login', { state: { redirectTo: location.pathname, bookingData } });
      return;
    }

    if (!bookingData) {
      toast({
        title: "Error",
        description: "Información de reserva no encontrada",
        variant: "destructive"
      });
      navigate('/client');
    }
  }, [isAuthenticated, user, bookingData]);
  
  // If no booking data, return early
  if (!bookingData) {
    return null;
  }
  
  // Validate required data
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
    const recurrenceMap = {
      'once': null,
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
      // Check authentication
      if (!user?.id) {
        throw new Error("Debes iniciar sesión para reservar un servicio");
      }
      
      // Ensure we have date and time selected
      if (!selectedDate || !selectedTime) {
        throw new Error("Debes seleccionar una fecha y hora para el servicio");
      }
      
      // Parse selected time and calculate start/end times
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const startTime = new Date(selectedDate);
      startTime.setHours(hours, minutes, 0, 0);
      
      const durationMinutes = bookingData.duration || 60;
      const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
      
      // Normalize the recurrence value
      const normalizedRecurrence = normalizeRecurrenceValue(bookingData.frequency);
      
      // Check if we have a valid residencia_id
      const residencia_id = user.residenciaId || null;
      
      // Check if residencia_id is required but missing
      if (!residencia_id) {
        console.warn("Creating appointment without residencia_id. User profile may need updating.");
        
        // Try to fetch residencia_id from users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('residencia_id')
          .eq('id', user.id)
          .eq('role', 'client')
          .single();
          
        if (!userError && userData?.residencia_id) {
          console.log('Found residencia_id in users table:', userData.residencia_id);
          
          // Create appointment with this residencia_id
          const { data, error } = await supabase
            .from('appointments')
            .insert({
              client_id: user.id,
              provider_id: bookingData.providerId,
              listing_id: bookingData.serviceId,
              start_time: startTime.toISOString(),
              end_time: endTime.toISOString(),
              status: 'pending',
              residencia_id: userData.residencia_id,
              apartment: user.apartment || '',
              notes: bookingData.notes || '',
              recurrence: normalizedRecurrence
            })
            .select();
            
          if (error) throw error;
          return data;
        } else {
          // If we can't find a residencia_id, try to set up the residencia_id first
          console.error("No residencia_id found for user. Redirecting to profile update.");
          toast({
            title: "Información incompleta",
            description: "Por favor actualiza tu perfil con tu información de residencia antes de reservar.",
            variant: "destructive"
          });
          throw new Error("Por favor actualiza tu perfil con tu información de residencia antes de reservar.");
        }
      }
      
      console.log("Creating appointment with data:", {
        client_id: user.id,
        provider_id: bookingData.providerId,
        listing_id: bookingData.serviceId,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: 'pending',
        residencia_id: residencia_id,
        apartment: user.apartment || '',
        notes: bookingData.notes || '',
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
          residencia_id: residencia_id,
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
      toast({
        title: "Éxito",
        description: "Reserva solicitada con éxito"
      });
      navigate('/client/bookings');
    },
    onError: (error: any) => {
      console.error("Error creating appointment:", error);
      
      // More friendly and specific error messages
      if (error.message.includes('recurrence_check')) {
        toast({
          title: "Error",
          description: "Error: El tipo de recurrencia seleccionado no es válido.",
          variant: "destructive"
        });
      } else if (error.message.includes('foreign key')) {
        toast({
          title: "Error",
          description: "Error: Hay un problema con tu perfil de usuario. Por favor contacta a soporte.",
          variant: "destructive"
        });
      } else if (error.message.includes('residencia_id')) {
        toast({
          title: "Error", 
          description: "No se pudo identificar tu residencia. Por favor actualiza tu perfil.",
          variant: "destructive"
        });
        // Consider redirecting to profile update page
        // navigate('/profile');
      } else {
        toast({
          title: "Error",
          description: `Error al crear la reserva: ${error.message}`,
          variant: "destructive"
        });
      }
      
      setIsSubmitting(false);
    }
  });
  
  const handleBack = () => {
    navigate(-1);
  };
  
  const handleConfirm = () => {
    // Validate authentication
    if (!isAuthenticated || !user) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para reservar un servicio",
        variant: "destructive"
      });
      navigate('/login', { state: { redirectTo: location.pathname, bookingData } });
      return;
    }
    
    // Validate required data
    if (!hasRequiredData) {
      toast({
        title: "Error",
        description: "Faltan datos necesarios para completar la reserva",
        variant: "destructive"
      });
      return;
    }
    
    // Validate date and time selection
    if (!selectedDate || !selectedTime) {
      toast({
        title: "Error",
        description: "Por favor selecciona una fecha y hora para el servicio",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    createAppointmentMutation.mutate();
  };
  
  // Format date if exists
  const formattedDate = selectedDate
    ? format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })
    : 'No seleccionada';
    
  // Format time in 12-hour format if exists
  const formatTimeTo12Hour = (time24: string | undefined): string => {
    if (!time24) return 'No seleccionada';
    
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };
  
  const formattedTime = formatTimeTo12Hour(selectedTime);

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
        {/* Date and Time Selector with provider ID */}
        <DateTimeSelector 
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          selectedTime={selectedTime}
          onTimeChange={setSelectedTime}
          providerId={bookingData.providerId}
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
            
            {/* Action buttons - Updated confirm button to green */}
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
                className="flex-1 bg-green-500 hover:bg-green-600 text-white" 
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
