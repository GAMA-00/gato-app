import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useAvailabilityContext } from '@/contexts/AvailabilityContext';
import { useUnifiedAvailability } from '@/contexts/UnifiedAvailabilityContext';

interface AvailabilitySlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface DayAvailability {
  enabled: boolean;
  timeSlots: Array<{
    startTime: string;
    endTime: string;
    id?: string;
  }>;
}

interface WeeklyAvailability {
  [key: string]: DayAvailability;
}

const EMPTY_WEEK: WeeklyAvailability = {
  monday:    { enabled: false, timeSlots: [] },
  tuesday:   { enabled: false, timeSlots: [] },
  wednesday: { enabled: false, timeSlots: [] },
  thursday:  { enabled: false, timeSlots: [] },
  friday:    { enabled: false, timeSlots: [] },
  saturday:  { enabled: false, timeSlots: [] },
  sunday:    { enabled: false, timeSlots: [] },
};

const DAY_MAPPING: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

export const useProviderAvailability = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { notifyAvailabilityChange } = useAvailabilityContext();
  const { syncAvailabilityToListing, loadAvailabilityFromListing, notifyAvailabilityChange: unifiedNotify } = useUnifiedAvailability();

  const [availability, setAvailability] = useState<WeeklyAvailability>({ ...EMPTY_WEEK });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchAvailability = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      // 1. Intentar cargar desde listing (fuente unificada)
      const listingAvailability = await loadAvailabilityFromListing();
      if (listingAvailability && Object.values(listingAvailability).some(d => d.enabled)) {
        setAvailability(listingAvailability);
        return;
      }

      // 2. Fallback: provider_availability table
      const { data, error } = await supabase
        .from('provider_availability')
        .select('*')
        .eq('provider_id', user.id)
        .eq('is_active', true)
        .order('day_of_week', { ascending: true });

      if (error) {
        console.error('Error fetching availability:', error);
        toast.error('Error al cargar la disponibilidad configurada');
        return;
      }

      if (data && data.length > 0) {
        const parsed: WeeklyAvailability = { ...EMPTY_WEEK };
        data.forEach((slot: AvailabilitySlot) => {
          const dayName = Object.keys(DAY_MAPPING).find(
            k => DAY_MAPPING[k] === slot.day_of_week
          );
          if (dayName) {
            if (!parsed[dayName].enabled) parsed[dayName] = { enabled: true, timeSlots: [] };
            parsed[dayName].timeSlots.push({
              id: slot.id,
              startTime: slot.start_time,
              endTime: slot.end_time,
            });
          }
        });
        setAvailability(parsed);
        return;
      }

      // 3. Último fallback: listings.availability
      const { data: listingsData, error: listingsError } = await supabase
        .from('listings')
        .select('availability')
        .eq('provider_id', user.id)
        .limit(1);

      if (!listingsError && listingsData?.[0]?.availability) {
        setAvailability(listingsData[0].availability as unknown as WeeklyAvailability);
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
      toast.error('Error inesperado al cargar la disponibilidad');
    } finally {
      setIsLoading(false);
    }
  };

  const saveAvailability = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    try {
      // Reemplazar disponibilidad en provider_availability
      const { error: deleteError } = await supabase
        .from('provider_availability')
        .delete()
        .eq('provider_id', user.id);

      if (deleteError) {
        console.error('Error deleting availability:', deleteError);
        toast.error('Error al eliminar la disponibilidad anterior');
        return;
      }

      const slotsToInsert = Object.entries(availability).flatMap(([dayName, dayData]) => {
        if (!dayData.enabled || dayData.timeSlots.length === 0) return [];
        return dayData.timeSlots.map(slot => ({
          provider_id: user.id,
          day_of_week: DAY_MAPPING[dayName],
          start_time: slot.startTime,
          end_time: slot.endTime,
          is_active: true,
        }));
      });

      if (slotsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('provider_availability')
          .insert(slotsToInsert);

        if (insertError) {
          console.error('Error inserting availability:', insertError);
          toast.error('Error al guardar la nueva disponibilidad');
          return;
        }
      }

      // Sincronizar con listings y regenerar slots
      try {
        await syncAvailabilityToListing(availability);

        const { data: listings } = await supabase
          .from('listings')
          .select('id')
          .eq('provider_id', user.id)
          .eq('is_active', true);

        for (const listing of listings ?? []) {
          const { error: syncError } = await supabase.rpc('sync_slots_with_availability', {
            p_listing_id: listing.id,
          });
          if (syncError) {
            console.error(`Error sincronizando slots para listing ${listing.id}:`, syncError);
            await (supabase as any).rpc('generate_provider_time_slots_for_listing', {
              p_provider_id: user.id,
              p_listing_id: listing.id,
              p_days_ahead: 60,
            });
          }
        }

        unifiedNotify();
        queryClient.invalidateQueries({ queryKey: ['agenda-week'] });
        toast.success('Disponibilidad actualizada correctamente');
      } catch (syncError) {
        console.error('Error al sincronizar con listings:', syncError);
        toast.success('Disponibilidad guardada');
      }
    } catch (error) {
      console.error('Error saving availability:', error);
      toast.error('Error inesperado al guardar la disponibilidad');
    } finally {
      setIsSaving(false);
    }
  };

  const updateDayAvailability = (day: string, enabled: boolean) => {
    setAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        enabled,
        timeSlots: enabled
          ? (prev[day].timeSlots.length > 0 ? prev[day].timeSlots : [{ startTime: '09:00', endTime: '17:00' }])
          : [],
      },
    }));
  };

  const addTimeSlot = (day: string, preset?: { startTime: string; endTime: string }) => {
    setAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        timeSlots: [...prev[day].timeSlots, preset ?? { startTime: '09:00', endTime: '17:00' }],
      },
    }));
  };

  const removeTimeSlot = (day: string, index: number) => {
    setAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        timeSlots: prev[day].timeSlots.filter((_, i) => i !== index),
      },
    }));
  };

  const updateTimeSlot = (day: string, index: number, field: 'startTime' | 'endTime', value: string) => {
    setAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        timeSlots: prev[day].timeSlots.map((slot, i) =>
          i === index ? { ...slot, [field]: value } : slot
        ),
      },
    }));
  };

  const copyDayToOtherDays = (sourceDay: string, targetDays: string[]) => {
    const sourceDayData = availability[sourceDay];
    if (!sourceDayData?.enabled) {
      toast.error('El día origen debe estar habilitado para copiar');
      return;
    }
    setAvailability(prev => {
      const updated = { ...prev };
      targetDays.forEach(day => {
        if (day !== sourceDay) {
          updated[day] = { enabled: true, timeSlots: [...sourceDayData.timeSlots] };
        }
      });
      return updated;
    });
  };

  useEffect(() => {
    fetchAvailability();
  }, [user?.id]);

  return {
    availability,
    isLoading,
    isSaving,
    updateDayAvailability,
    addTimeSlot,
    removeTimeSlot,
    updateTimeSlot,
    saveAvailability,
    refreshAvailability: fetchAvailability,
    copyDayToOtherDays,
  };
};
