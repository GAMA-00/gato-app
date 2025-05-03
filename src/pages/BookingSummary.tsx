
import React from 'react';
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
  
  // Si no hay datos de reserva, redirigir a la página principal
  if (!bookingData || !user) {
    React.useEffect(() => {
      toast.error("Información de reserva no encontrada");
      navigate('/client');
    }, []);
    return null;
  }
  
  // Mutación para crear reserva
  const createAppointmentMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .insert({
          client_id: user.id,
          provider_id: bookingData.providerId,
          listing_id: bookingData.serviceId,
          start_time: bookingData.startTime || new Date(),
          end_time: bookingData.endTime || new Date(Date.now() + bookingData.duration * 60000),
          status: 'pending',
          // Usar propiedad building_id en lugar de residenciaId
          residencia_id: user.building_id || null,
          // Asumimos que apartment es una propiedad opcional para el usuario
          apartment: user.apartment || '',
          notes: bookingData.notes || ''
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
      toast.error("Error al crear la reserva: " + error.message);
    }
  });
  
  const handleBack = () => {
    navigate(-1);
  };
  
  const handleConfirm = () => {
    createAppointmentMutation.mutate();
  };
  
  // Formato de fecha si existe
  const formattedDate = bookingData.startTime
    ? new Date(bookingData.startTime).toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      })
    : 'Flexible';
    
  // Formato de hora si existe
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
            
            {/* Datos del servicio */}
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Servicio:</span>
                <span className="font-medium">{bookingData.serviceName}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Proveedor:</span>
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-1 text-luxury-navy" />
                  <span className="font-medium">{bookingData.providerName}</span>
                </div>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duración:</span>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1 text-luxury-navy" />
                  <span className="font-medium">{formatDuration(bookingData.duration)}</span>
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
            
            {/* Precio */}
            <div className="flex justify-between text-lg font-semibold mb-6">
              <span>Precio total:</span>
              <span className="text-luxury-navy">${bookingData.price?.toFixed(2) || '0.00'}</span>
            </div>
            
            {/* Botones de acción */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={handleBack}
              >
                Volver
              </Button>
              <Button 
                className="flex-1 bg-luxury-navy hover:bg-luxury-navy/90" 
                onClick={handleConfirm}
                disabled={createAppointmentMutation.isPending}
              >
                {createAppointmentMutation.isPending ? 'Enviando...' : 'Confirmar Reserva'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
};

export default BookingSummary;
