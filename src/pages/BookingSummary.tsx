
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { formatDuration } from '@/lib/utils';
import PageContainer from '@/components/layout/PageContainer';
import { ArrowLeft, Calendar, Clock, User } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const BookingSummary = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { bookingData } = location.state || {};
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // If no booking data, redirect to the main page
  if (!bookingData || !user) {
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
  
  // Mutation to create appointment
  const createAppointmentMutation = useMutation({
    mutationFn: async () => {
      // Calculate end time based on start time and duration
      const startTime = bookingData.startTime ? new Date(bookingData.startTime) : new Date();
      const durationMinutes = bookingData.duration || 60;
      const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
      
      console.log("Creating appointment with times:", {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: durationMinutes,
        price: bookingData.price
      });
      
      const { data, error } = await supabase
        .from('appointments')
        .insert({
          client_id: user.id,
          provider_id: bookingData.providerId,
          listing_id: bookingData.serviceId,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(), // Ensure end_time is properly calculated
          status: 'pending',
          residencia_id: user.buildingId || null,
          apartment: user.apartment || '',
          notes: bookingData.notes || '',
          recurrence: bookingData.frequency || 'once'
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
    onError: (error) => {
      console.error("Error creating appointment:", error);
      toast.error("Error al crear la reserva: " + error.message);
      setIsSubmitting(false);
    }
  });
  
  const handleBack = () => {
    navigate(-1);
  };
  
  const handleConfirm = () => {
    // Validate required data
    if (!hasRequiredData) {
      toast.error("Faltan datos necesarios para completar la reserva");
      return;
    }
    
    // Validate date if required
    if (bookingData.requiresScheduling && !bookingData.startTime) {
      toast.error("Por favor selecciona una fecha y hora para el servicio");
      return;
    }

    setIsSubmitting(true);
    createAppointmentMutation.mutate();
  };
  
  // Format date if exists
  const formattedDate = bookingData.startTime
    ? new Date(bookingData.startTime).toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      })
    : 'Flexible';
    
  // Format time if exists
  const formattedTime = bookingData.startTime
    ? new Date(bookingData.startTime).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Horario flexible';

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
                disabled={isSubmitting || !hasRequiredData}
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
