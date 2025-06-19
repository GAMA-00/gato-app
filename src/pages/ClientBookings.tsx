import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Navbar from '@/components/layout/Navbar';
import PageContainer from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, X, Flame, Star, MapPin, RotateCcw, RefreshCw } from 'lucide-react';
import { cn, formatTo12Hour } from '@/lib/utils';
import { useRecurringServices } from '@/hooks/useRecurringServices';
import { useClientBookings, ClientBooking } from '@/hooks/useClientBookings';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { CancelAppointmentModal } from '@/components/client/booking/CancelAppointmentModal';
import { RescheduleAppointmentModal } from '@/components/client/booking/RescheduleAppointmentModal';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
      const { error } = await supabase
        .rpc('submit_provider_rating', {
          p_provider_id: providerId,
          p_client_id: user.id,
          p_appointment_id: appointmentId,
          p_rating: rating
        });
        
      if (error) throw error;
      
      toast.success('¡Gracias por calificar el servicio!');
      onRated();
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
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const isRecurring = booking.isRecurringInstance || (booking.recurrence !== 'none' && booking.recurrence !== null);
  const isCompleted = booking.status === 'completed';
  
  const handleReschedule = () => {
    setShowRescheduleModal(true);
  };
  
  const handleCancel = () => {
    setShowCancelModal(true);
  };
  
  const getProviderName = () => {
    if (booking.providerName && booking.providerName !== 'Proveedor desconocido') {
      return booking.providerName;
    }
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
              {booking.isRecurringInstance && (
                <div className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full flex-shrink-0">
                  Instancia
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
          
          {booking.isRescheduled && (
            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-md border border-blue-200">
              <RotateCcw className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <span className="text-xs text-blue-700">
                La próxima fecha ha sido reagendada. Tu plan recurrente se mantiene sin cambios.
              </span>
            </div>
          )}
          
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="truncate">
              {isRecurring && !booking.isRecurringInstance ? (
                `Todos los ${format(booking.date, 'EEEE', { locale: es })} - ${formatTo12Hour(format(booking.date, 'HH:mm'))}`
              ) : (
                `${format(booking.date, 'PPP', { locale: es })} - ${formatTo12Hour(format(booking.date, 'HH:mm'))}`
              )}
            </span>
          </div>
          
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
          
          {isCompleted && !booking.isRated && (
            <RatingStars 
              appointmentId={booking.id} 
              providerId={booking.providerId} 
              onRated={onRated}
            />
          )}
          
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

      <CancelAppointmentModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        appointmentId={booking.id}
        isRecurring={isRecurring}
        appointmentDate={booking.date}
      />

      <RescheduleAppointmentModal
        isOpen={showRescheduleModal}
        onClose={() => setShowRescheduleModal(false)}
        appointmentId={booking.id}
        providerId={booking.providerId}
        isRecurring={isRecurring}
        currentDate={booking.date}
        serviceDuration={60}
        recurrence={booking.recurrence}
        listingId={booking.listingId}
        recurrenceGroupId={booking.recurrenceGroupId}
      />
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
  const { data: bookings, isLoading, error, refetch } = useClientBookings();
  
  console.log('=== CLIENT BOOKINGS PAGE ===');
  console.log(`Total bookings received: ${bookings?.length || 0}`);
  
  const upcomingBookings = bookings?.filter(booking => 
    booking.status === 'pending' || booking.status === 'confirmed'
  ) || [];
  
  const pastBookings = bookings?.filter(booking => 
    booking.status === 'completed' || booking.status === 'cancelled'
  ) || [];
  
  const activeRecurringCount = bookings?.filter(booking => 
    booking.isRecurringInstance && 
    (booking.status === 'pending' || booking.status === 'confirmed')
  ).length || 0;
  
  const handleRated = () => {
    queryClient.invalidateQueries({ queryKey: ['client-bookings'] });
  };

  const handleRetry = () => {
    refetch();
  };

  return (
    <>
      <Navbar />
      <div className="md:ml-52">
        <PageContainer
          title={
            <div className="flex flex-col items-center gap-1">
              <span className="text-3xl md:text-4xl font-bold">Mis Reservas</span>
              <span className="text-sm text-muted-foreground">
                {activeRecurringCount} instancias recurrentes activas
              </span>
            </div>
          }
        >
          {error && (
            <Alert className="mb-6">
              <AlertDescription className="space-y-4">
                <div>
                  <h4 className="font-medium text-red-800">Error al cargar las reservas</h4>
                  <p className="text-red-600 mt-1">
                    Ha ocurrido un error al cargar tus reservas. Por favor, intenta nuevamente.
                  </p>
                </div>
                <Button 
                  onClick={handleRetry}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reintentar
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-6 px-1">
            <section>
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
              <h2 className="text-lg font-medium mb-4">
                Citas Pasadas
                {pastBookings.length > 0 && (
                  <span className="text-sm text-muted-foreground ml-2">
                    ({pastBookings.filter(b => b.isRecurringInstance).length} instancias recurrentes)
                  </span>
                )}
              </h2>
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
      </div>
    </>
  );
};

export default ClientBookings;
