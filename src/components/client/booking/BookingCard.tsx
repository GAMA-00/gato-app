import React, { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, X, MapPin, RotateCcw, SkipForward } from 'lucide-react';
import { cn, formatTo12Hour } from '@/lib/utils';
import { ClientBooking } from '@/hooks/useClientBookings';
import { RatingStars } from '@/components/client/booking/RatingStars';
import { RecurrenceIndicator } from '@/components/client/booking/RecurrenceIndicator';
import { isRecurring } from '@/utils/recurrenceUtils';
import { getServiceTypeIcon } from '@/utils/serviceIconUtils';
import { getRecurrenceInfo } from '@/utils/recurrenceUtils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { logger, bookingLogger } from '@/utils/logger';

interface BookingCardProps {
  booking: ClientBooking;
  onRated: () => void;
}

export const BookingCard = ({ booking, onRated }: BookingCardProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();
  const isRecurring = booking.recurrence && booking.recurrence !== 'none';
  const isCompleted = booking.status === 'completed';
  const isSkipped = booking.status === 'cancelled' && booking.notes?.includes('[SKIPPED BY CLIENT]');
  
  bookingLogger.debug('BookingCard - Booking data:', {
    id: booking.id,
    serviceName: booking.serviceName,
    status: booking.status,
    isCompleted: isCompleted,
    isRated: booking.isRated,
    shouldShowRating: isCompleted && !booking.isRated,
    recurrence: booking.recurrence,
    isRecurring: isRecurring,
    categoryId: booking.categoryId
  });
  
  const handleSkipAppointment = async () => {
    setIsLoading(true);
    try {
      if (isRecurring) {
        // Para citas recurrentes: usar la función para saltar solo esta instancia
        logger.systemOperation('Skipping recurring instance using edge function:', booking.id);
        
        const { data, error } = await supabase.functions.invoke('skip-recurring-instance', {
          body: { appointmentId: booking.id }
        });

        if (error) {
          console.error('❌ Edge function error:', error);
          throw new Error(error.message || 'Failed to skip recurring instance');
        }

        if (!data?.success) {
          throw new Error(data?.error || 'Failed to skip recurring instance');
        }

        console.log('✅ Successfully skipped recurring instance:', data);
        toast.success('Se saltó esta fecha. Verás la siguiente instancia de la serie.');
        
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['client-bookings'] }),
          queryClient.invalidateQueries({ queryKey: ['appointments'] }),
          queryClient.invalidateQueries({ queryKey: ['calendar-appointments'] }),
          queryClient.invalidateQueries({ queryKey: ['recurring-appointments'] }),
          queryClient.invalidateQueries({ queryKey: ['weekly-slots'] }),
        ]);
        
        // Force refetch after a short delay
        setTimeout(() => {
          queryClient.refetchQueries({ queryKey: ['client-bookings'] });
        }, 500);
        
      } else {
        // Para citas no recurrentes: cancelar normalmente
        console.log('Canceling single appointment:', booking.id);
        
        const { error } = await supabase
          .from('appointments')
          .update({
            status: 'cancelled',
            cancellation_time: new Date().toISOString()
          })
          .eq('id', booking.id);

        if (error) throw error;

        // Auto-limpiar la cita cancelada después de 3 segundos
        setTimeout(async () => {
          try {
            await supabase
              .from('appointments')
              .delete()
              .eq('id', booking.id)
              .eq('status', 'cancelled');
            
            queryClient.invalidateQueries({ queryKey: ['client-bookings'] });
          } catch (deleteError) {
            console.warn('Could not auto-clean cancelled appointment:', deleteError);
          }
        }, 3000);

        toast.success('Cita cancelada exitosamente');
        queryClient.invalidateQueries({ queryKey: ['client-bookings'] });
      }
    } catch (error) {
      console.error('❌ Error:', error);
      toast.error(error instanceof Error ? error.message : 'Error al procesar la solicitud');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelAllFuture = async () => {
    setIsLoading(true);
    try {
      console.log('🚫 Canceling recurring appointment series using edge function:', booking.id);
      
      // Use the secure edge function to cancel the entire recurring series
      const { data, error } = await supabase.functions.invoke('cancel-recurring-series', {
        body: { appointmentId: booking.id }
      });

      if (error) {
        console.error('❌ Edge function error:', error);
        throw new Error(error.message || 'Failed to cancel recurring series');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to cancel recurring series');
      }

      console.log('✅ Successfully cancelled recurring series:', data);
      
      toast.success(`Serie de citas recurrentes cancelada (${data.cancelledCount || 0} citas)`);
      
      // Invalidate ALL possible query keys to ensure UI updates
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['client-bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['appointments'] }),
        queryClient.invalidateQueries({ queryKey: ['calendar-appointments'] }),
        queryClient.invalidateQueries({ queryKey: ['recurring-appointments'] }),
        queryClient.invalidateQueries({ queryKey: ['provider-appointments'] }),
        queryClient.invalidateQueries({ queryKey: ['weekly-slots'] }),
        queryClient.resetQueries({ queryKey: ['client-bookings'] })
      ]);
      
      // Force a complete refetch after a short delay
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['client-bookings'] });
      }, 500);
      
    } catch (error) {
      console.error('❌ Error cancelling recurring series:', error);
      toast.error(error instanceof Error ? error.message : 'Error al cancelar la serie de citas');
    } finally {
      setIsLoading(false);
    }
  };
  
  const getProviderName = () => {
    if (booking.providerName && booking.providerName !== 'Proveedor desconocido') {
      return booking.providerName;
    }
    return 'Proveedor';
  };

  // Get service icon
  const serviceIcon = getServiceTypeIcon(booking.serviceName, booking.categoryId);
  
  // Get recurrence label
  const recurrenceInfo = getRecurrenceInfo(booking.recurrence);
  
  return (
    <Card className="overflow-hidden animate-scale-in">
      <CardContent className="p-3">
        <div className="flex flex-col space-y-2">
          {/* Header Row with Title, Recurrence & Status */}
          <div className="flex items-start justify-between">
            {/* Left: Service Title & Provider */}
            <div className="flex flex-col flex-1 min-w-0">
              <h3 className="font-semibold text-base truncate">{booking.serviceName}</h3>
              <p className="text-sm text-muted-foreground truncate">{getProviderName()}</p>
            </div>
            
            {/* Right: Recurrence Text & Status Stack */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <span className="text-xs font-medium text-muted-foreground">
                {recurrenceInfo.label}
              </span>
              <div className={cn(
                "px-2 py-0.5 rounded-full text-xs font-medium",
                booking.status === 'pending' ? "bg-yellow-100 text-yellow-800" : 
                booking.status === 'confirmed' ? "bg-green-100 text-green-800" : 
                booking.status === 'completed' ? "bg-blue-100 text-blue-800" : 
                booking.status === 'cancelled' ? "bg-gray-100 text-gray-800" : 
                "bg-gray-100 text-gray-800"
              )}>
                {booking.status === 'pending' ? 'Pendiente por aprobación' :
                 booking.status === 'confirmed' ? 'Confirmada' :
                 booking.status === 'completed' ? 'Completada' :
                 booking.status === 'cancelled' ? (isSkipped ? 'Saltada' : 'Cancelada') : 'Otra'}
              </div>
            </div>
          </div>
          
          {/* Service Type */}
          <p className="text-xs text-muted-foreground truncate">{booking.subcategory}</p>
          
          {/* Rescheduled Notice */}
          {booking.isRescheduled && (
            <div className="flex items-center gap-2 p-1.5 bg-blue-50 rounded-md border border-blue-200">
              <RotateCcw className="h-3 w-3 text-blue-600 flex-shrink-0" />
              <span className="text-xs text-blue-700">
                {isRecurring 
                  ? 'La próxima fecha ha sido reagendada. Tu plan recurrente se mantiene sin cambios.'
                  : 'Esta cita ha sido reagendada.'
                }
              </span>
            </div>
          )}
          
          {/* Date & Time */}
          <div className="flex items-center text-xs text-muted-foreground">
            <Clock className="h-3 w-3 mr-1.5 flex-shrink-0" />
            <span className="truncate">
              {`${format(booking.date, 'EEEE d', { locale: es }).split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} de ${format(booking.date, 'MMMM', { locale: es }).charAt(0).toUpperCase() + format(booking.date, 'MMMM', { locale: es }).slice(1)} – ${formatTo12Hour(format(booking.date, 'HH:mm'))}`}
            </span>
          </div>
          
          {/* Location */}
          <div className="flex items-start text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 mr-1.5 flex-shrink-0 mt-0.5" />
            <span className="break-words leading-relaxed">
              {booking.location}
            </span>
          </div>
          
          {/* Rating Section - Solo mostrar si canRate es true */}
          {isCompleted && !booking.isRated && booking.canRate && (
            <RatingStars 
              appointmentId={booking.id} 
              providerId={booking.providerId} 
              onRated={onRated}
            />
          )}

          {/* Mensaje para citas post-pago pendientes de factura */}
          {isCompleted && !booking.isRated && booking.isPostPayment && !booking.canRate && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-sm text-amber-800">
                📋 Este servicio está pendiente de facturación. Podrás calificarlo una vez que se apruebe la factura.
              </p>
            </div>
          )}
          
          {/* Action Buttons */}
          {(booking.status === 'pending' || booking.status === 'confirmed') && (
            <div className="flex gap-2 pt-1">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 h-8 text-xs text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                onClick={handleSkipAppointment}
                disabled={isLoading}
              >
                <SkipForward className="h-3 w-3 mr-1 flex-shrink-0" />
                <span className="truncate">Saltar esta cita</span>
              </Button>
              {isRecurring && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                  onClick={handleCancelAllFuture}
                  disabled={isLoading}
                >
                  <X className="h-3 w-3 mr-1 flex-shrink-0" />
                  <span className="truncate">Cancelar todas las citas futuras</span>
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
