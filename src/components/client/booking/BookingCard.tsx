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
import { getServiceTypeIcon } from '@/utils/serviceIconUtils';
import { getRecurrenceInfo } from '@/utils/recurrenceUtils';

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
    status: booking.status,
    isCompleted: isCompleted,
    isRated: booking.isRated,
    shouldShowRating: isCompleted && !booking.isRated,
    recurrence: booking.recurrence,
    isRecurring: bookingIsRecurring,
    categoryId: booking.categoryId
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
                 booking.status === 'cancelled' ? 'Cancelada' : 'Otra'}
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
                {bookingIsRecurring 
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
                onClick={handleReschedule}
              >
                <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
                <span className="truncate">Reagendar</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                onClick={handleCancel}
              >
                <X className="h-3 w-3 mr-1 flex-shrink-0" />
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
