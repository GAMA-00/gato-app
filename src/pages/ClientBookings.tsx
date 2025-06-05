import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import PageContainer from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, X, Flame, Star, MapPin } from 'lucide-react';
import { cn, formatTo12Hour } from '@/lib/utils';
import { useRecurringServices } from '@/hooks/useRecurringServices';
import { useClientBookings, ClientBooking } from '@/hooks/useClientBookings';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

const RatingStars = ({ 
  appointmentId, 
  providerId, 
  onRated 
}: { 
  appointmentId: string; 
  providerId: string; 
  onRated: () => void 
}) => {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const handleRatingSubmit = async () => {
    if (!rating || !user) return;
    
    setIsSubmitting(true);
    
    try {
      // Use RPC call to submit rating with proper type casting
      const { error } = await supabase
        .rpc('submit_provider_rating', {
          p_provider_id: providerId,
          p_client_id: user.id,
          p_appointment_id: appointmentId,
          p_rating: rating
        }) as { data: null, error: Error | null };
        
      if (error) throw error;
      
      toast.success('¡Gracias por calificar el servicio!');
      onRated();
      
      // Refresh client bookings data
      queryClient.invalidateQueries({ queryKey: ['client-bookings'] });
    } catch (error: any) {
      toast.error(`Error al calificar: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="py-3">
      <p className="text-sm font-medium mb-2">Califica este servicio:</p>
      <div className="flex items-center mb-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            className="focus:outline-none"
            disabled={isSubmitting}
          >
            <Star
              className={cn(
                "w-8 h-8 transition-colors",
                (hoveredRating || rating) >= star
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300"
              )}
            />
          </button>
        ))}
      </div>
      <Button 
        onClick={handleRatingSubmit} 
        disabled={!rating || isSubmitting} 
        size="sm" 
        className="w-full"
      >
        {isSubmitting ? 'Enviando...' : 'Enviar calificación'}
      </Button>
    </div>
  );
};

const BookingCard = ({ booking, onRated }: { booking: ClientBooking; onRated: () => void }) => {
  const isRecurring = booking.recurrence !== 'none';
  const isCompleted = booking.status === 'completed';
  const queryClient = useQueryClient();
  
  const handleReschedule = () => {
    toast.info("Función de reagendar en desarrollo");
  };
  
  const handleCancel = async () => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          cancellation_time: new Date().toISOString()
        })
        .eq('id', booking.id);
        
      if (error) throw error;
      
      toast.success("Reserva cancelada exitosamente");
      queryClient.invalidateQueries({ queryKey: ['client-bookings'] });
    } catch (error: any) {
      toast.error(`Error al cancelar: ${error.message}`);
    }
  };
  
  // Mostrar el nombre del proveedor de forma mejorada
  const getProviderName = () => {
    if (booking.providerName && booking.providerName !== 'Proveedor desconocido') {
      console.log(`Using provider name: ${booking.providerName}`);
      return booking.providerName;
    }
    console.log("Fallback to generic provider name for booking:", booking.id);
    return 'Proveedor';
  };
  
  return (
    <Card className="mb-4 overflow-hidden animate-scale-in">
      <CardContent className="p-4">
        <div className="flex flex-col space-y-3">
          <div className="flex justify-between items-start">
            <div className="flex items-center max-w-[70%]">
              <h3 className="font-medium text-base truncate">{booking.serviceName}</h3>
              {isRecurring && (
                <div className="flex items-center ml-2 text-red-500 flex-shrink-0">
                  <Flame className="h-4 w-4" />
                </div>
              )}
            </div>
            <div className={cn(
              "px-2 py-1 rounded-full text-xs font-medium flex-shrink-0",
              booking.status === 'pending' ? "bg-yellow-100 text-yellow-800" : 
              booking.status === 'confirmed' ? "bg-green-100 text-green-800" : 
              booking.status === 'completed' ? "bg-blue-100 text-blue-800" : 
              booking.status === 'cancelled' ? "bg-gray-100 text-gray-800" : 
              "bg-gray-100 text-gray-800"
            )}>
              {booking.status === 'pending' ? 'Pendiente' :
               booking.status === 'confirmed' ? 'Confirmada' :
               booking.status === 'completed' ? 'Completada' :
               booking.status === 'cancelled' ? 'Cancelada' : 'Otra'}
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground truncate">{booking.subcategory}</p>
          
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="truncate">
              {isRecurring ? (
                `Todos los ${format(booking.date, 'EEEE', { locale: es })} - ${formatTo12Hour(format(booking.date, 'HH:mm'))}`
              ) : (
                `${format(booking.date, 'PPP', { locale: es })} - ${formatTo12Hour(format(booking.date, 'HH:mm'))}`
              )}
            </span>
          </div>
          
          {/* Show complete location */}
          <div className="flex items-start text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
            <span className="break-words leading-relaxed">
              {booking.location}
            </span>
          </div>
          
          <div className="text-sm">
            <span className="text-muted-foreground">Proveedor:</span>{' '}
            <span className="font-medium truncate block">{getProviderName()}</span>
          </div>
          
          {/* Show rating component for completed appointments that haven't been rated yet */}
          {isCompleted && !booking.isRated && (
            <RatingStars 
              appointmentId={booking.id} 
              providerId={booking.providerId} 
              onRated={onRated}
            />
          )}
          
          {/* Only show action buttons for upcoming appointments */}
          {(booking.status === 'pending' || booking.status === 'confirmed') && (
            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                onClick={handleReschedule}
              >
                <Calendar className="h-4 w-4 mr-1 flex-shrink-0" />
                <span className="truncate">Reagendar</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                onClick={handleCancel}
              >
                <X className="h-4 w-4 mr-1 flex-shrink-0" />
                <span className="truncate">Cancelar</span>
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const BookingSkeleton = () => (
  <Card className="mb-4">
    <CardContent className="p-4">
      <div className="flex flex-col space-y-3">
        <div className="flex justify-between items-start">
          <Skeleton className="h-6 w-3/5" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 flex-1" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const ClientBookings = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { count: recurringServicesCount } = useRecurringServices();
  const { data: bookings, isLoading, error } = useClientBookings();
  
  // Filter for upcoming and past bookings (based on date and status)
  const upcomingBookings = bookings?.filter(booking => 
    booking.status === 'pending' || booking.status === 'confirmed'
  ) || [];
  
  const pastBookings = bookings?.filter(booking => 
    booking.status === 'completed' || booking.status === 'cancelled'
  ) || [];
  
  const handleRated = () => {
    // Refresh the data
    queryClient.invalidateQueries({ queryKey: ['client-bookings'] });
  };

  return (
    <PageContainer
      title={
        <div className="flex items-center gap-2">
          <span>Mis Reservas</span>
          <div className="flex items-center text-red-500">
            <Flame className="h-5 w-5" />
            <span className="font-medium ml-0.5">{recurringServicesCount || 0}</span>
          </div>
        </div>
      }
      subtitle="Ver y administrar tus citas"
      action={
        <Button onClick={() => navigate('/client')}>
          Reservar Nuevo Servicio
        </Button>
      }
    >
      {error && (
        <div className="bg-red-50 p-4 rounded-lg mb-6 text-red-800">
          <p>Ha ocurrido un error al cargar tus reservas. Por favor, intenta nuevamente más tarde.</p>
        </div>
      )}
      
      <div className="space-y-6 px-1">
        <section>
          <h2 className="text-lg font-medium mb-4">Citas Próximas</h2>
          {isLoading ? (
            <div>
              <BookingSkeleton />
              <BookingSkeleton />
            </div>
          ) : upcomingBookings.length > 0 ? (
            <div>
              {upcomingBookings.map(booking => (
                <BookingCard key={booking.id} booking={booking} onRated={handleRated} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No hay citas próximas
            </p>
          )}
        </section>
        
        <section>
          <h2 className="text-lg font-medium mb-4">Citas Pasadas</h2>
          {isLoading ? (
            <div>
              <BookingSkeleton />
            </div>
          ) : pastBookings.length > 0 ? (
            <div>
              {pastBookings.map(booking => (
                <BookingCard key={booking.id} booking={booking} onRated={handleRated} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No hay citas pasadas
            </p>
          )}
        </section>
      </div>
    </PageContainer>
  );
};

export default ClientBookings;
