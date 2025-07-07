import { supabase } from '@/integrations/supabase/client';
import { addWeeks, addDays, format } from 'date-fns';

export interface RecurringSlotManager {
  blockRecurringSlots: (
    providerId: string,
    startTime: Date,
    endTime: Date,
    recurrenceType: string,
    weeksAhead?: number
  ) => Promise<number>;
  releaseRecurringSlots: (
    providerId: string,
    startTime: Date,
    recurrenceType: string
  ) => Promise<number>;
  getRecurringInstances: (
    startTime: Date,
    recurrenceType: string,
    weeksAhead?: number
  ) => Date[];
}

export const recurringSlotManager: RecurringSlotManager = {
  async blockRecurringSlots(
    providerId: string,
    startTime: Date,
    endTime: Date,
    recurrenceType: string,
    weeksAhead: number = 12
  ): Promise<number> {
    if (recurrenceType === 'once' || recurrenceType === 'none') {
      return 0;
    }

    try {
      const { data, error } = await supabase.rpc('block_recurring_slots', {
        p_provider_id: providerId,
        p_start_time: startTime.toISOString(),
        p_end_time: endTime.toISOString(),
        p_recurrence_type: recurrenceType,
        p_weeks_ahead: weeksAhead
      });

      if (error) {
        console.error('Error blocking recurring slots:', error);
        throw error;
      }

      return data || 0;
    } catch (error) {
      console.error('Failed to block recurring slots:', error);
      throw error;
    }
  },

  async releaseRecurringSlots(
    providerId: string,
    startTime: Date,
    recurrenceType: string
  ): Promise<number> {
    if (recurrenceType === 'once' || recurrenceType === 'none') {
      // Release single slot
      const { error } = await supabase
        .from('provider_time_slots')
        .update({
          is_available: true,
          is_reserved: false,
          recurring_blocked: false
        })
        .eq('provider_id', providerId)
        .eq('slot_datetime_start', startTime.toISOString());

      if (error) {
        console.error('Error releasing single slot:', error);
        throw error;
      }

      return 1;
    }

    // Release all future recurring slots
    const { error } = await supabase
      .from('provider_time_slots')
      .update({
        is_available: true,
        is_reserved: false,
        recurring_blocked: false
      })
      .eq('provider_id', providerId)
      .eq('recurring_blocked', true)
      .gte('slot_datetime_start', startTime.toISOString());

    if (error) {
      console.error('Error releasing recurring slots:', error);
      throw error;
    }

    return 0; // We don't have the count from this query
  },

  getRecurringInstances(
    startTime: Date,
    recurrenceType: string,
    weeksAhead: number = 12
  ): Date[] {
    const instances: Date[] = [];
    
    if (recurrenceType === 'once' || recurrenceType === 'none') {
      return [startTime];
    }

    let currentDate = new Date(startTime);
    const endDate = addWeeks(startTime, weeksAhead);

    while (currentDate <= endDate) {
      instances.push(new Date(currentDate));

      // Calculate next occurrence
      switch (recurrenceType) {
        case 'weekly':
          currentDate = addWeeks(currentDate, 1);
          break;
        case 'biweekly':
          currentDate = addWeeks(currentDate, 2);
          break;
        case 'monthly':
          currentDate = addWeeks(currentDate, 4); // Approximate monthly
          break;
        default:
          break;
      }
    }

    return instances;
  }
};

export const getRecurrenceDisplayInfo = (recurrence: string) => {
  switch (recurrence) {
    case 'weekly':
      return {
        label: 'Semanal',
        icon: '🔄',
        color: 'bg-green-100 text-green-800 border-green-200'
      };
    case 'biweekly':
      return {
        label: 'Quincenal',
        icon: '📅',
        color: 'bg-blue-100 text-blue-800 border-blue-200'
      };
    case 'monthly':
      return {
        label: 'Mensual',
        icon: '🗓️',
        color: 'bg-purple-100 text-purple-800 border-purple-200'
      };
    default:
      return {
        label: 'Una vez',
        icon: '📍',
        color: 'bg-gray-100 text-gray-800 border-gray-200'
      };
  }
};