
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

  const handleRescheduleSingle = async () => {
    if (!selectedTime || !user) {
      toast.error('Por favor selecciona una hora');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Rescheduling single instance of recurring appointment:', appointmentId);
      
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const newStartTime = new Date(selectedDate);
      newStartTime.setHours(hours, minutes, 0, 0);
      const newEndTime = addMinutes(newStartTime, actualServiceDuration);

      // Get original appointment details
      const { data: originalAppointment, error: fetchError } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();

      if (fetchError) throw fetchError;

      // Create a new appointment record for the rescheduled instance
      const { data: newAppointment, error: insertError } = await supabase
        .from('appointments')
        .insert({
          provider_id: originalAppointment.provider_id,
          client_id: originalAppointment.client_id,
          listing_id: originalAppointment.listing_id,
          start_time: newStartTime.toISOString(),
          end_time: newEndTime.toISOString(),
          status: 'pending',
          recurrence: 'none',
          is_recurring_instance: false,
          recurrence_group_id: originalAppointment.recurrence_group_id || originalAppointment.id,
          notes: `Reagendado desde cita recurrente original del ${format(currentDate, 'PPP', { locale: es })}`,
          client_address: originalAppointment.client_address,
          client_email: originalAppointment.client_email,
          client_phone: originalAppointment.client_phone,
          residencia_id: originalAppointment.residencia_id,
          external_booking: originalAppointment.external_booking
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Mark the original appointment as "rescheduled" but keep it for reference
      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          status: 'rescheduled',
          notes: `Reagendado a ${format(newStartTime, 'PPPp', { locale: es })}`
        })
        .eq('id', appointmentId);

      if (updateError) throw updateError;

      toast.success('Cita reagendada exitosamente. Pendiente de aprobación del proveedor.');
      queryClient.invalidateQueries({ queryKey: ['client-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['pending-requests'] });
      onClose();
    } catch (error: any) {
      console.error('Error rescheduling single appointment:', error);
      toast.error(`Error al reagendar: ${error.message}`);
    } finally {
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
      console.log('Rescheduling recurring appointment series:', appointmentId);
      
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const newStartTime = new Date(selectedDate);
      newStartTime.setHours(hours, minutes, 0, 0);
      const newEndTime = addMinutes(newStartTime, actualServiceDuration);

      // Update the base appointment
      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          start_time: newStartTime.toISOString(),
          end_time: newEndTime.toISOString()
        })
        .eq('id', appointmentId);

      if (updateError) throw updateError;

      // También actualizar la regla recurrente si existe
      if (recurrence && recurrence !== 'none') {
        const dayOfWeek = selectedDate.getDay();
        const dayOfMonth = selectedDate.getDate();
        
        const { error: ruleUpdateError } = await supabase
          .from('recurring_rules')
          .update({
            start_time: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
            end_time: format(newEndTime, 'HH:mm'),
            day_of_week: recurrence === 'monthly' ? undefined : dayOfWeek,
            day_of_month: recurrence === 'monthly' ? dayOfMonth : undefined,
            start_date: format(selectedDate, 'yyyy-MM-dd')
          })
          .eq('client_id', user?.id)
          .eq('provider_id', providerId)
          .eq('listing_id', listingId)
          .eq('is_active', true);

        if (ruleUpdateError) {
          console.error('Error updating recurring rule:', ruleUpdateError);
        }
      }

      toast.success('Serie de citas recurrentes reagendada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['client-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['provider-recurring-rules'] });
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
            disabled={isLoading || !selectedTime}
          >
            {isLoading ? 'Reagendando...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
