import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';

export interface RecurringException {
  id: string;
  appointment_id: string;
  exception_date: string;
  original_date?: string; // Nueva propiedad para rastrear la fecha original
  action_type: 'cancelled' | 'rescheduled';
  new_start_time?: string;
  new_end_time?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Hook to get exceptions for a specific appointment
export const useRecurringExceptions = (appointmentId?: string) => {
  return useQuery({
    queryKey: ['recurring-exceptions', appointmentId],
    queryFn: async () => {
      if (!appointmentId) return [];

      const { data, error } = await supabase
        .from('recurring_exceptions')
        .select('*')
        .eq('appointment_id', appointmentId)
        .order('exception_date', { ascending: true });

      if (error) {
        console.error('Error fetching recurring exceptions:', error);
        throw error;
      }

      return data as RecurringException[];
    },
    enabled: !!appointmentId,
    staleTime: 60000, // 1 minute
  });
};

// Hook to cancel a specific recurring instance
export const useCancelRecurringInstance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appointmentId,
      exceptionDate,
      originalDate,
      notes
    }: {
      appointmentId: string;
      exceptionDate: Date;
      originalDate?: Date; // Fecha original que se está cancelando
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('recurring_exceptions')
        .insert({
          appointment_id: appointmentId,
          exception_date: format(exceptionDate, 'yyyy-MM-dd'),
          original_date: originalDate ? format(originalDate, 'yyyy-MM-dd') : format(exceptionDate, 'yyyy-MM-dd'),
          action_type: 'cancelled',
          notes
        })
        .select()
        .single();

      if (error) {
        console.error('Error cancelling recurring instance:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['recurring-exceptions'] });
      queryClient.invalidateQueries({ queryKey: ['recurring-slot-system'] });
      
      toast.success('Instancia de cita recurrente cancelada exitosamente');
    },
    onError: (error: any) => {
      console.error('Error cancelling recurring instance:', error);
      toast.error('Error al cancelar la instancia de cita recurrente');
    }
  });
};

// Hook to reschedule a specific recurring instance
export const useRescheduleRecurringInstance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appointmentId,
      exceptionDate,
      originalDate,
      newStartTime,
      newEndTime,
      notes
    }: {
      appointmentId: string;
      exceptionDate: Date;
      originalDate?: Date; // Fecha original que se está reagendando
      newStartTime: Date;
      newEndTime: Date;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('recurring_exceptions')
        .insert({
          appointment_id: appointmentId,
          exception_date: format(exceptionDate, 'yyyy-MM-dd'),
          original_date: originalDate ? format(originalDate, 'yyyy-MM-dd') : format(exceptionDate, 'yyyy-MM-dd'),
          action_type: 'rescheduled',
          new_start_time: newStartTime.toISOString(),
          new_end_time: newEndTime.toISOString(),
          notes
        })
        .select()
        .single();

      if (error) {
        console.error('Error rescheduling recurring instance:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['recurring-exceptions'] });
      queryClient.invalidateQueries({ queryKey: ['recurring-slot-system'] });
      
      toast.success('Instancia de cita recurrente reagendada exitosamente');
    },
    onError: (error: any) => {
      console.error('Error rescheduling recurring instance:', error);
      toast.error('Error al reagendar la instancia de cita recurrente');
    }
  });
};

// Hook to remove an exception (restore a cancelled/rescheduled instance)
export const useRemoveRecurringException = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (exceptionId: string) => {
      const { error } = await supabase
        .from('recurring_exceptions')
        .delete()
        .eq('id', exceptionId);

      if (error) {
        console.error('Error removing recurring exception:', error);
        throw error;
      }

      return exceptionId;
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['recurring-exceptions'] });
      queryClient.invalidateQueries({ queryKey: ['recurring-slot-system'] });
      
      toast.success('Excepción eliminada, instancia restaurada');
    },
    onError: (error: any) => {
      console.error('Error removing recurring exception:', error);
      toast.error('Error al eliminar la excepción');
    }
  });
};