
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BlockedTimeSlot } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

export const useBlockedTimeSlots = () => {
  const [blockedSlots, setBlockedSlots] = useState<BlockedTimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  // Fetch blocked time slots from database with enhanced validation
  const fetchBlockedSlots = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      console.log('Fetching blocked time slots for provider:', user.id);
      
      const { data, error } = await supabase
        .from('blocked_time_slots')
        .select('*')
        .eq('provider_id', user.id)
        .order('day', { ascending: true })
        .order('start_hour', { ascending: true });

      if (error) {
        console.error('Error fetching blocked slots:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los horarios bloqueados',
          variant: 'destructive'
        });
        return;
      }

      // Transform database data to match our interface with validation
      const transformedSlots: BlockedTimeSlot[] = data.map(slot => {
        // Validate time ranges
        if (slot.start_hour >= slot.end_hour) {
          console.warn(`Invalid time range for blocked slot ${slot.id}: ${slot.start_hour} >= ${slot.end_hour}`);
        }
        
        return {
          id: slot.id,
          day: slot.day,
          startHour: slot.start_hour,
          endHour: slot.end_hour,
          note: slot.note || undefined,
          isRecurring: slot.is_recurring || false,
          recurrenceType: slot.recurrence_type as 'daily' | 'weekly' | undefined,
          createdAt: new Date(slot.created_at)
        };
      });

      console.log(`Loaded ${transformedSlots.length} blocked time slots`);
      setBlockedSlots(transformedSlots);
    } catch (error) {
      console.error('Error in fetchBlockedSlots:', error);
      toast({
        title: 'Error',
        description: 'Error al cargar los horarios bloqueados',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add new blocked slot with conflict validation
  const addBlockedSlot = async (slot: Omit<BlockedTimeSlot, 'id' | 'createdAt'>) => {
    if (!user?.id) return;

    // Validate the time range
    if (slot.startHour >= slot.endHour) {
      toast({
        title: 'Error',
        description: 'La hora de inicio debe ser anterior a la hora de fin',
        variant: 'destructive'
      });
      return false;
    }

    // Check for conflicts with existing appointments
    try {
      console.log('Checking for conflicts before adding blocked slot...');
      
      const { data: existingAppointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('start_time, end_time, id')
        .eq('provider_id', user.id)
        .in('status', ['pending', 'confirmed', 'completed']);

      if (appointmentsError) {
        console.error('Error checking for appointment conflicts:', appointmentsError);
      } else if (existingAppointments) {
        // Check if any existing appointments conflict with the new blocked slot
        const conflicts = existingAppointments.filter(apt => {
          const aptStart = new Date(apt.start_time);
          const aptEnd = new Date(apt.end_time);
          const aptDayOfWeek = aptStart.getDay();
          const aptStartHour = aptStart.getHours();
          const aptEndHour = aptEnd.getHours() + (aptEnd.getMinutes() > 0 ? 1 : 0); // Round up

          return (
            aptDayOfWeek === slot.day &&
            aptStartHour < slot.endHour &&
            aptEndHour > slot.startHour
          );
        });

        if (conflicts.length > 0) {
          toast({
            title: 'Conflicto detectado',
            description: `Este horario conflicta con ${conflicts.length} cita(s) existente(s). Cancela las citas primero.`,
            variant: 'destructive'
          });
          return false;
        }
      }

      // Insert the blocked slot
      const { data, error } = await supabase
        .from('blocked_time_slots')
        .insert({
          provider_id: user.id,
          day: slot.day,
          start_hour: slot.startHour,
          end_hour: slot.endHour,
          note: slot.note || null,
          is_recurring: slot.isRecurring,
          recurrence_type: slot.recurrenceType || null
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding blocked slot:', error);
        toast({
          title: 'Error',
          description: 'No se pudo guardar el bloqueo de horario',
          variant: 'destructive'
        });
        return false;
      }

      // Transform and add to local state
      const newSlot: BlockedTimeSlot = {
        id: data.id,
        day: data.day,
        startHour: data.start_hour,
        endHour: data.end_hour,
        note: data.note || undefined,
        isRecurring: data.is_recurring || false,
        recurrenceType: data.recurrence_type as 'daily' | 'weekly' | undefined,
        createdAt: new Date(data.created_at)
      };

      setBlockedSlots(prev => [...prev, newSlot]);
      console.log('Successfully added blocked slot:', newSlot);
      return true;
    } catch (error) {
      console.error('Error in addBlockedSlot:', error);
      toast({
        title: 'Error',
        description: 'Error al guardar el bloqueo',
        variant: 'destructive'
      });
      return false;
    }
  };

  // Delete blocked slot from database with validation
  const deleteBlockedSlot = async (id: string) => {
    if (!user?.id) return;

    try {
      console.log('Deleting blocked slot:', id);
      
      const { error } = await supabase
        .from('blocked_time_slots')
        .delete()
        .eq('id', id)
        .eq('provider_id', user.id);

      if (error) {
        console.error('Error deleting blocked slot:', error);
        toast({
          title: 'Error',
          description: 'No se pudo eliminar el bloqueo de horario',
          variant: 'destructive'
        });
        return false;
      }

      // Remove from local state
      setBlockedSlots(prev => prev.filter(slot => slot.id !== id));
      console.log('Successfully deleted blocked slot:', id);
      return true;
    } catch (error) {
      console.error('Error in deleteBlockedSlot:', error);
      toast({
        title: 'Error',
        description: 'Error al eliminar el bloqueo',
        variant: 'destructive'
      });
      return false;
    }
  };

  // Get blocked slots for a specific date
  const getBlockedSlotsForDate = (date: Date) => {
    const dayOfWeek = date.getDay();
    return blockedSlots.filter(slot => slot.day === dayOfWeek);
  };

  // Check if a specific time is blocked
  const isTimeBlocked = (date: Date, hour: number) => {
    const dayOfWeek = date.getDay();
    return blockedSlots.some(slot => 
      slot.day === dayOfWeek && 
      hour >= slot.startHour && 
      hour < slot.endHour
    );
  };

  // Load data on mount and when user changes
  useEffect(() => {
    if (user?.id) {
      fetchBlockedSlots();
    } else {
      setBlockedSlots([]);
      setIsLoading(false);
    }
  }, [user?.id]);

  return {
    blockedSlots,
    isLoading,
    addBlockedSlot,
    deleteBlockedSlot,
    refetch: fetchBlockedSlots,
    getBlockedSlotsForDate,
    isTimeBlocked
  };
};
