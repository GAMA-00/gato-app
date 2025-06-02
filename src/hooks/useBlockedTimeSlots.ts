
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BlockedTimeSlot } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

export const useBlockedTimeSlots = () => {
  const [blockedSlots, setBlockedSlots] = useState<BlockedTimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  // Fetch blocked time slots from database
  const fetchBlockedSlots = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
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

      // Transform database data to match our interface
      const transformedSlots: BlockedTimeSlot[] = data.map(slot => ({
        id: slot.id,
        day: slot.day,
        startHour: slot.start_hour,
        endHour: slot.end_hour,
        note: slot.note || undefined,
        isRecurring: slot.is_recurring || false,
        recurrenceType: slot.recurrence_type as 'daily' | 'weekly' | undefined,
        createdAt: new Date(slot.created_at)
      }));

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

  // Add new blocked slot to database
  const addBlockedSlot = async (slot: Omit<BlockedTimeSlot, 'id' | 'createdAt'>) => {
    if (!user?.id) return;

    try {
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

  // Delete blocked slot from database
  const deleteBlockedSlot = async (id: string) => {
    if (!user?.id) return;

    try {
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
    refetch: fetchBlockedSlots
  };
};
