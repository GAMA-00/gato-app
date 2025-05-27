import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { addWeeks, addMonths, format, getDay, isSameDay, addDays } from 'date-fns';

interface RecurringBookingData {
  providerId: string;
  clientId: string;
  listingId: string;
  residenciaId: string;
  startTime: Date;
  duration: number; // in minutes
  recurrence: 'weekly' | 'biweekly' | 'monthly';
  selectedDays: number[]; // 1-7 (Monday-Sunday)
  notes?: string;
  apartment?: string;
}

export const useRecurringBooking = () => {
  const queryClient = useQueryClient();

  const createRecurringBooking = useMutation({
    mutationFn: async (bookingData: RecurringBookingData) => {
      const { 
        providerId, 
        clientId, 
        listingId, 
        residenciaId, 
        startTime, 
        duration, 
        recurrence, 
        selectedDays, 
        notes, 
        apartment 
      } = bookingData;

      console.log('Creating recurring appointments with data:', {
        startTime: startTime.toISOString(),
        recurrence,
        selectedDays,
        duration
      });

      // Generate recurring appointments for the next 52 weeks (1 year)
      const appointments = [];
      const totalPeriods = 52;
      
      // Get the day of week for the original appointment (0 = Sunday, 1 = Monday, etc.)
      const originalDay = getDay(startTime);
      
      for (let i = 0; i < totalPeriods; i++) {
        let appointmentDate = new Date(startTime);
        
        switch (recurrence) {
          case 'weekly':
            appointmentDate = addWeeks(startTime, i);
            break;
          case 'biweekly':
            appointmentDate = addWeeks(startTime, i * 2);
            break;
          case 'monthly':
            appointmentDate = addMonths(startTime, i);
            // For monthly recurrence, try to keep the same day of the week
            // If the day doesn't match, find the closest occurrence
            const targetDay = originalDay;
            const currentDay = getDay(appointmentDate);
            if (currentDay !== targetDay) {
              const dayDiff = targetDay - currentDay;
              appointmentDate = addDays(appointmentDate, dayDiff);
            }
            break;
        }

        // For weekly and biweekly, check if the day matches selected days
        if ((recurrence === 'weekly' || recurrence === 'biweekly') && selectedDays.length > 0) {
          const dayOfWeek = getDay(appointmentDate);
          // Convert Sunday from 0 to 7 to match our selectedDays format (1-7)
          const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek;
          if (!selectedDays.includes(adjustedDay)) {
            continue; // Skip dates that don't match selected days
          }
        }

        // Set the correct time (preserve hours and minutes from original)
        appointmentDate.setHours(startTime.getHours());
        appointmentDate.setMinutes(startTime.getMinutes());
        appointmentDate.setSeconds(0);
        appointmentDate.setMilliseconds(0);

        const appointmentEndTime = new Date(appointmentDate.getTime() + duration * 60000);

        appointments.push({
          provider_id: providerId,
          client_id: clientId,
          listing_id: listingId,
          residencia_id: residenciaId,
          start_time: appointmentDate.toISOString(),
          end_time: appointmentEndTime.toISOString(),
          status: 'pending',
          recurrence: recurrence,
          notes: notes || '',
          apartment: apartment || ''
        });
      }

      console.log(`Generated ${appointments.length} recurring appointments:`, 
        appointments.slice(0, 5).map(apt => ({
          start_time: apt.start_time,
          recurrence: apt.recurrence
        }))
      );

      // Insert all appointments in batches to avoid timeouts
      const batchSize = 10;
      const allCreatedAppointments = [];
      
      for (let i = 0; i < appointments.length; i += batchSize) {
        const batch = appointments.slice(i, i + batchSize);
        
        console.log(`Inserting batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(appointments.length / batchSize)} with ${batch.length} appointments`);
        
        const { data, error } = await supabase
          .from('appointments')
          .insert(batch)
          .select();

        if (error) {
          console.error(`Error creating appointments batch ${Math.floor(i / batchSize) + 1}:`, error);
          throw error;
        }

        if (data) {
          allCreatedAppointments.push(...data);
        }
      }

      console.log('Successfully created all recurring appointments:', allCreatedAppointments.length);
      return allCreatedAppointments;
    },
    onSuccess: (data) => {
      toast({
        title: "Reservas recurrentes creadas",
        description: `Se crearon ${data.length} citas recurrentes exitosamente. Estas aparecerán en tu calendario.`,
      });
      
      // Invalidate relevant queries to refresh the calendar
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-appointments'] });
    },
    onError: (error) => {
      console.error('Error creating recurring booking:', error);
      toast({
        title: "Error al crear reservas recurrentes",
        description: "No se pudieron crear las reservas recurrentes. Inténtalo de nuevo.",
        variant: "destructive"
      });
    }
  });

  return {
    createRecurringBooking: createRecurringBooking.mutate,
    isCreating: createRecurringBooking.isPending
  };
};
