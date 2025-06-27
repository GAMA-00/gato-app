
import React, { useState } from 'react';
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
  serviceDuration,
  recurrence = 'none',
  listingId,
  recurrenceGroupId
}: RescheduleAppointmentModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(currentDate);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [rescheduleMode, setRescheduleMode] = useState<'single' | 'recurring' | null>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { availableTimeSlots, isLoading: slotsLoading } = useProviderAvailability({
    providerId,
    selectedDate,
    serviceDuration,
    recurrence: rescheduleMode === 'recurring' ? recurrence : 'once'
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
      const newEndTime = addMinutes(newStartTime, serviceDuration);

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
      const newEndTime = addMinutes(newStartTime, serviceDuration);

      // Update the base appointment
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
            <label className="text-sm font-medium mb-2 block">Hora disponible</label>
            {slotsLoading ? (
              <p className="text-sm text-muted-foreground">Cargando horarios disponibles...</p>
            ) : availableTimeSlots.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                {availableTimeSlots.map((slot) => (
                  <Button
                    key={slot.time}
                    variant={selectedTime === slot.time ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedTime(slot.time)}
                    disabled={!slot.available}
                    className="text-xs"
                  >
                    {slot.time}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay horarios disponibles para esta fecha.
              </p>
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
