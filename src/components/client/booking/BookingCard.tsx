import React, { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, X, MapPin, RotateCcw } from 'lucide-react';
import { cn, formatTo12Hour } from '@/lib/utils';
import { ClientBooking } from '@/hooks/useClientBookings';
import { CancelAppointmentModal } from '@/components/client/booking/CancelAppointmentModal';
import { RescheduleAppointmentModal } from '@/components/client/booking/RescheduleAppointmentModal';
import { RatingStars } from '@/components/client/booking/RatingStars';
import { RecurrenceIndicator } from '@/components/client/booking/RecurrenceIndicator';
import { isRecurring } from '@/utils/recurrenceUtils';

interface BookingCardProps {
  booking: ClientBooking;
  onRated: () => void;
}

export const BookingCard = ({ booking, onRated }: BookingCardProps) => {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const bookingIsRecurring = isRecurring(booking.recurrence);
  const isCompleted = booking.status === 'completed';
  
  console.log('BookingCard - Booking data:', {
    id: booking.id,
    serviceName: booking.serviceName,
    recurrence: booking.recurrence,
    isRecurring: bookingIsRecurring
  });
  
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
    <Card className="overflow-hidden animate-scale-in">
      <CardContent className="p-4">
        <div className="flex flex-col space-y-3">
          <div className="flex justify-between items-start">
            <div className="flex items-center max-w-[70%]">
              <h3 className="font-medium text-base truncate">{booking.serviceName}</h3>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Always show RecurrenceIndicator for debugging, let it decide whether to render or not */}
              <RecurrenceIndicator 
                recurrence={booking.recurrence} 
                isRecurringInstance={booking.isRecurringInstance}
                size="sm"
              />
              <div className={cn(
                "px-2 py-1 rounded-full text-xs font-medium",
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
          </div>
          
          <p className="text-sm text-muted-foreground truncate">{booking.subcategory}</p>
          
          {booking.isRescheduled && (
            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-md border border-blue-200">
              <RotateCcw className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <span className="text-xs text-blue-700">
                {bookingIsRecurring 
                  ? 'La próxima fecha ha sido reagendada. Tu plan recurrente se mantiene sin cambios.'
                  : 'Esta cita ha sido reagendada.'
                }
              </span>
            </div>
          )}
          
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="truncate">
              {bookingIsRecurring && !booking.isRecurringInstance ? (
                `${format(booking.date, 'EEEE', { locale: es })} - ${formatTo12Hour(format(booking.date, 'HH:mm'))}`
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
        isRecurring={bookingIsRecurring}
        appointmentDate={booking.date}
      />

      <RescheduleAppointmentModal
        isOpen={showRescheduleModal}
        onClose={() => setShowRescheduleModal(false)}
        appointmentId={booking.id}
        providerId={booking.providerId}
        isRecurring={bookingIsRecurring}
        currentDate={booking.date}
        serviceDuration={60}
        recurrence={booking.recurrence}
        listingId={booking.listingId}
        recurrenceGroupId={booking.recurrenceGroupId}
      />
    </Card>
  );
};
