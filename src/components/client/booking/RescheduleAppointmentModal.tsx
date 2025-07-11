
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useProviderAvailability } from '@/hooks/useProviderAvailability';
import { format, addMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { useRescheduleRecurringInstance } from '@/hooks/useRecurringExceptions';
import { validateBookingSlot } from '@/utils/bookingValidation';

interface RescheduleAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  providerId: string;
  isRecurring: boolean;
  currentDate: Date;
  serviceDuration: number;
  recurrence?: string;
  listingId?: string;
  recurrenceGroupId?: string;
}

export const RescheduleAppointmentModal = ({
  isOpen,
  onClose,
  appointmentId,
  providerId,
  isRecurring,
  currentDate,
  serviceDuration: initialDuration,
  recurrence = 'none',
  listingId,
  recurrenceGroupId
}: RescheduleAppointmentModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(currentDate);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [rescheduleMode, setRescheduleMode] = useState<'single' | 'recurring' | null>(null);
  const [actualServiceDuration, setActualServiceDuration] = useState(initialDuration);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Obtener la duración real del servicio desde la base de datos
  useEffect(() => {
    const fetchServiceDuration = async () => {
      if (!listingId) return;
      
      try {
        const { data: listing, error } = await supabase
          .from('listings')
          .select('standard_duration, duration')
          .eq('id', listingId)
          .single();

        if (error) {
          console.error('Error fetching service duration:', error);
          return;
        }

        if (listing) {
          const duration = listing.standard_duration || listing.duration || initialDuration;
          setActualServiceDuration(duration);
          console.log('Service duration loaded:', duration, 'minutes');
        }
      } catch (error) {
        console.error('Error loading service duration:', error);
      }
    };

    fetchServiceDuration();
  }, [listingId, initialDuration]);

  const { availableTimeSlots, isLoading: slotsLoading } = useProviderAvailability({
    providerId,
    selectedDate,
    serviceDuration: actualServiceDuration,
    recurrence: rescheduleMode === 'recurring' ? recurrence : 'once',
    excludeAppointmentId: appointmentId // Excluir la cita actual del cálculo
  });

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime('');
  };

  const { mutate: rescheduleInstance, isPending: rescheduleLoading } = useRescheduleRecurringInstance();

  const handleRescheduleSingle = async () => {
    if (!selectedTime || !user) {
      toast.error('Por favor selecciona una hora');
      return;
    }

    setIsLoading(true);
    try {
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const newStartTime = new Date(selectedDate);
      newStartTime.setHours(hours, minutes, 0, 0);
      const newEndTime = addMinutes(newStartTime, actualServiceDuration);

      // Validate the new time slot
      const isValidSlot = await validateBookingSlot(
        providerId,
        newStartTime,
        newEndTime,
        'none',
        appointmentId
      );

      if (!isValidSlot) {
        setIsLoading(false);
        return;
      }

      // Use the new simplified system to reschedule this instance
      rescheduleInstance({
        appointmentId,
        exceptionDate: newStartTime, // La nueva fecha/hora
        originalDate: currentDate, // La fecha original que se está cambiando
        newStartTime,
        newEndTime,
        notes: `Reagendado a ${format(newStartTime, 'PPPp', { locale: es })}`
      }, {
        onSuccess: () => {
          toast.success('Cita reagendada exitosamente.');
          queryClient.invalidateQueries({ queryKey: ['client-bookings'] });
          queryClient.invalidateQueries({ queryKey: ['recurring-exceptions'] });
          onClose();
        },
        onError: (error) => {
          console.error('Error rescheduling single appointment:', error);
          toast.error('Error al reagendar la cita');
        },
        onSettled: () => {
          setIsLoading(false);
        }
      });
    } catch (error: any) {
      console.error('Error rescheduling single appointment:', error);
      toast.error(`Error al reagendar: ${error.message}`);
      setIsLoading(false);
    }
  };

  const handleRescheduleRecurring = async () => {
    if (!selectedTime) {
      toast.error('Por favor selecciona una hora');
      return;
    }

    setIsLoading(true);
    try {
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const newStartTime = new Date(selectedDate);
      newStartTime.setHours(hours, minutes, 0, 0);
      const newEndTime = addMinutes(newStartTime, actualServiceDuration);

      // Validate the new time slot for recurring appointments
      const isValidSlot = await validateBookingSlot(
        providerId,
        newStartTime,
        newEndTime,
        recurrence,
        appointmentId
      );

      if (!isValidSlot) {
        setIsLoading(false);
        return;
      }

      // Update the base appointment with new times
      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          start_time: newStartTime.toISOString(),
          end_time: newEndTime.toISOString()
        })
        .eq('id', appointmentId);

      if (updateError) throw updateError;

      toast.success('Serie de citas recurrentes reagendada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['client-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-appointments'] });
      onClose();
    } catch (error: any) {
      console.error('Error rescheduling recurring appointment:', error);
      toast.error(`Error al reagendar serie: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!rescheduleMode) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              Reagendar Cita
            </DialogTitle>
            <DialogDescription>
              {isRecurring 
                ? 'Esta es una cita recurrente. ¿Qué deseas reagendar?'
                : 'Selecciona una nueva fecha y hora para tu cita.'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Button
              onClick={() => setRescheduleMode('single')}
              variant="outline"
              className="w-full justify-start gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <RotateCcw className="h-4 w-4" />
              {isRecurring ? 'Reagendar solo la próxima cita' : 'Reagendar cita'}
            </Button>

            {isRecurring && (
              <Button
                onClick={() => setRescheduleMode('recurring')}
                variant="outline"
                className="w-full justify-start gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <Calendar className="h-4 w-4" />
                Reagendar todas las citas futuras
              </Button>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={onClose}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            Reagendar {rescheduleMode === 'recurring' ? 'Serie de Citas' : 'Próxima Cita'}
          </DialogTitle>
          <DialogDescription>
            {rescheduleMode === 'single' 
              ? 'Esta cita reagendada requerirá aprobación del proveedor. Tu plan recurrente se mantiene sin cambios.'
              : 'Selecciona una nueva fecha y hora disponible para toda la serie.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Fecha</label>
            <input
              type="date"
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={(e) => handleDateChange(new Date(e.target.value))}
              min={format(new Date(), 'yyyy-MM-dd')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Horarios disponibles 
              {actualServiceDuration !== initialDuration && (
                <span className="text-xs text-muted-foreground ml-1">
                  (Duración: {actualServiceDuration} min)
                </span>
              )}
            </label>
            {slotsLoading ? (
              <div className="flex items-center gap-2 p-4">
                <Clock className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">
                  Verificando disponibilidad real del proveedor...
                </span>
              </div>
            ) : availableTimeSlots.filter(slot => slot.available).length > 0 ? (
              <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                {availableTimeSlots.filter(slot => slot.available).map((slot) => (
                  <Button
                    key={slot.time}
                    variant={selectedTime === slot.time ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedTime(slot.time)}
                    className="text-xs"
                  >
                    {slot.time}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  No hay horarios disponibles para esta fecha.
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  {recurrence && recurrence !== 'none' 
                    ? `Intenta con otra fecha que mantenga la recurrencia ${recurrence === 'weekly' ? 'semanal' : recurrence === 'biweekly' ? 'quincenal' : 'mensual'}.`
                    : 'Intenta con otra fecha.'
                  }
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="ghost" onClick={() => setRescheduleMode(null)}>
            Atrás
          </Button>
          <Button
            onClick={rescheduleMode === 'recurring' ? handleRescheduleRecurring : handleRescheduleSingle}
            disabled={isLoading || rescheduleLoading || !selectedTime}
          >
            {(isLoading || rescheduleLoading) ? 'Reagendando...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
