import React, { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, X, RotateCcw, SkipForward } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn, formatTo12Hour, formatDateES, formatCompactDateTimeES } from '@/lib/utils';
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
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const [showCancelAllDialog, setShowCancelAllDialog] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
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
        toast.success('Próxima cita mostrada');
        
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

        toast.success('Cita cancelada');
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
      
      toast.success('Plan recurrente cancelado');
      
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
  
  // Helper function for compact meta display
  const getCompactMeta = () => {
    const recurrence = recurrenceInfo.label;
    const status = booking.status === 'confirmed' ? 'Confirmada' : 
                   booking.status === 'pending' ? 'Pendiente' :
                   booking.status === 'completed' ? 'Completada' :
                   booking.status === 'cancelled' ? (isSkipped ? 'Saltada' : 'Cancelada') : 
                   'Otra';
    
    if (isRecurring) {
      return `${recurrence} • ${status}`;
    }
    return status;
  };
  
  const handleDismissRating = () => {
    setIsDismissed(true);
    // Guardar en localStorage para persistencia
    const dismissedRatings = JSON.parse(localStorage.getItem('dismissedRatings') || '[]');
    if (!dismissedRatings.includes(booking.id)) {
      dismissedRatings.push(booking.id);
      localStorage.setItem('dismissedRatings', JSON.stringify(dismissedRatings));
    }
    toast.success('Tarjeta descartada');
  };
  
  // No mostrar la tarjeta si fue descartada
  if (isDismissed) {
    return null;
  }
  
  return (
    <Card className="overflow-hidden animate-scale-in rounded-[14px] shadow-sm border border-gray-200 relative">
      {/* Botón X para descartar solo en tarjetas de calificación */}
      {isCompleted && !booking.isRated && booking.canRate && (
        <button
          onClick={handleDismissRating}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors group"
          aria-label="Descartar calificación"
        >
          <X className="h-4 w-4 text-gray-500 group-hover:text-gray-700" />
        </button>
      )}
      
      <CardContent className="p-4">
        <div className="flex flex-col space-y-2">
          {/* Línea 1: Título con badge de completada inline */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <h3 className="font-semibold text-base truncate">
                {booking.serviceName}
              </h3>
              {isCompleted && (
                <div className="px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap bg-blue-50 text-blue-700 border border-blue-200">
                  Completada
                </div>
              )}
            </div>
            {/* Solo mostrar badges de estado si NO es completada */}
            {!isCompleted && (
              <div className="flex flex-col gap-1 items-end">
                <div className={cn(
                  "px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap",
                  booking.status === 'confirmed' && "bg-green-50 text-green-700 border border-green-200",
                  booking.status === 'pending' && "bg-yellow-50 text-yellow-700 border border-yellow-200",
                  booking.status === 'cancelled' && "bg-gray-50 text-gray-700 border border-gray-200"
                )}>
                  {booking.status === 'confirmed' ? 'Confirmada' :
                   booking.status === 'pending' ? 'Pendiente' :
                   booking.status === 'cancelled' ? (isSkipped ? 'Saltada' : 'Cancelada') : 'Otra'}
                </div>
              </div>
            )}
          </div>
          
          {/* Línea 2: Proveedor y recurrencia */}
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {getProviderName()}
            </p>
            {isRecurring && (
              <div className="px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap bg-green-50 text-green-700 border border-green-200">
                {recurrenceInfo.label}
              </div>
            )}
          </div>
          
          {/* Línea 3: Fecha/hora bold */}
          <p className="text-sm font-semibold text-foreground">
            {formatCompactDateTimeES(booking.date)}
          </p>
          
          {/* Aviso reagendamiento */}
          {booking.isRescheduled && (
            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
              <RotateCcw className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <span className="text-xs text-blue-700">
                {isRecurring 
                  ? 'Fecha reagendada. Tu plan continúa sin cambios.'
                  : 'Esta cita fue reagendada.'
                }
              </span>
            </div>
          )}
          
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
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-800">
                Pendiente de facturación. Podrás calificar una vez aprobada.
              </p>
            </div>
          )}
          
          {/* Botones de acción */}
          {(booking.status === 'pending' || booking.status === 'confirmed') && (
            <div className="flex flex-col gap-2 pt-2">
              {/* Para citas RECURRENTES: mostrar botón Saltar */}
              {isRecurring && (
                <Button 
                  variant="outline" 
                  size="lg"
                  className="w-full h-11 text-sm font-medium text-blue-600 bg-white border-blue-300 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-400 flex items-center justify-center gap-2 transition-colors"
                  onClick={() => setShowSkipDialog(true)}
                  disabled={isLoading}
                >
                  <SkipForward className="h-4 w-4" />
                  <span>Saltar la próxima cita</span>
                </Button>
              )}
              
              {/* Botón de cancelar: diferente texto según tipo */}
              <Button 
                variant="outline" 
                size="lg"
                className="w-full h-11 text-sm font-medium text-red-600 bg-white border-red-300 hover:bg-red-50 hover:text-red-700 hover:border-red-400 flex items-center justify-center gap-2 transition-colors"
                onClick={() => {
                  if (isRecurring) {
                    setShowCancelAllDialog(true);
                  } else {
                    setShowSkipDialog(true);
                  }
                }}
                disabled={isLoading}
              >
                <X className="h-4 w-4" />
                <span>{isRecurring ? 'Cancelar plan recurrente' : 'Cancelar'}</span>
              </Button>
            </div>
          )}
        </div>
      </CardContent>

      {/* Diálogo de confirmación para Saltar/Cancelar */}
      <AlertDialog open={showSkipDialog} onOpenChange={setShowSkipDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isRecurring ? '¿Saltar la próxima cita?' : '¿Cancelar esta cita?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isRecurring 
                ? 'Esta fecha se saltará y verás la siguiente cita de tu plan automáticamente.'
                : 'Esta cita se cancelará permanentemente. Esta acción no se puede deshacer.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowSkipDialog(false);
                handleSkipAppointment();
              }}
              className={isRecurring ? "bg-blue-600 hover:bg-blue-700" : "bg-red-600 hover:bg-red-700"}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de confirmación para Cancelar Plan */}
      {isRecurring && (
        <AlertDialog open={showCancelAllDialog} onOpenChange={setShowCancelAllDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Cancelar plan recurrente?</AlertDialogTitle>
              <AlertDialogDescription>
                Todas las citas futuras de este plan serán canceladas. Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Mantener plan</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setShowCancelAllDialog(false);
                  handleCancelAllFuture();
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                Cancelar plan
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Card>
  );
};
