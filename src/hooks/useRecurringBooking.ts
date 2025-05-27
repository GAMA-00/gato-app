
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { addWeeks, addMonths, format } from 'date-fns';

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

      // Calculate end time
      const endTime = new Date(startTime.getTime() + duration * 60000);

      // Generate recurring appointments for the next 12 periods
      const appointments = [];
      const periods = 12;

      for (let i = 0; i < periods; i++) {
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
            break;
        }

        // Check if this date matches selected days (for weekly/biweekly)
        if ((recurrence === 'weekly' || recurrence === 'biweekly') && selectedDays.length > 0) {
          const dayOfWeek = appointmentDate.getDay();
          const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek; // Convert Sunday from 0 to 7
          if (!selectedDays.includes(adjustedDay)) {
            continue; // Skip dates that don't match selected days
          }
        }

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

      console.log(`Creating ${appointments.length} recurring appointments:`, appointments);

      // Insert all appointments in a single batch
      const { data, error } = await supabase
        .from('appointments')
        .insert(appointments)
        .select();

      if (error) {
        console.error('Error creating recurring appointments:', error);
        throw error;
      }

      console.log('Successfully created recurring appointments:', data);
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Reservas recurrentes creadas",
        description: `Se crearon ${data.length} citas recurrentes exitosamente.`,
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['provider-calendar'] });
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
