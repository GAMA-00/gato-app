import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { addDays, format, getDay, startOfDay } from 'date-fns';
import { toast } from 'sonner';

export interface ProviderSlot {
  id: string;
  date: Date;
  time: string;
  displayTime: string;
  period: 'AM' | 'PM';
  isAvailable: boolean;
  listingId?: string;
}

export interface ProviderSlotConfig {
  availability: Record<string, {
    enabled: boolean;
    timeSlots: Array<{
      startTime: string;
      endTime: string;
    }>;
  }>;
  serviceDuration: number;
  daysAhead?: number;
  listingId?: string;
}

const dayMap: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export const useProviderSlotManagement = (config?: ProviderSlotConfig) => {
  const { user } = useAuth();
  const [slots, setSlots] = useState<ProviderSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const formatTimeTo12Hour = (time24: string): { time: string; period: 'AM' | 'PM' } => {
    const [hours, minutes] = time24.split(':').map(Number);
    const period: 'AM' | 'PM' = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return {
      time: `${hours12}:${minutes.toString().padStart(2, '0')}`,
      period
    };
  };

  const generateTimeSlots = (startTime: string, endTime: string, duration: number): string[] => {
    const slots: string[] = [];
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    for (let currentMinutes = startMinutes; currentMinutes + duration <= endMinutes; currentMinutes += duration) {
      const hour = Math.floor(currentMinutes / 60);
      const minute = currentMinutes % 60;
      slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    }
    
    return slots;
  };

  const loadProviderSlots = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const endDate = addDays(new Date(), config?.daysAhead || 14);
      
      const { data, error } = await supabase
        .from('provider_time_slots')
        .select('*')
        .eq('provider_id', user.id)
        .gte('slot_date', format(new Date(), 'yyyy-MM-dd'))
        .lte('slot_date', format(endDate, 'yyyy-MM-dd'))
        .order('slot_datetime_start');

      if (error) throw error;

      const providerSlots: ProviderSlot[] = (data || []).map(slot => {
        const { time: displayTime, period } = formatTimeTo12Hour(slot.start_time);
        return {
          id: slot.id,
          date: new Date(slot.slot_date),
          time: slot.start_time,
          displayTime,
          period,
          isAvailable: slot.is_available,
          listingId: slot.listing_id
        };
      });

      setSlots(providerSlots);
    } catch (error) {
      console.error('Error loading provider slots:', error);
      toast.error('Error al cargar los horarios');
    } finally {
      setIsLoading(false);
    }
  };

  const generateSlotsFromAvailability = async () => {
    if (!user?.id || !config?.availability) return;

    console.log('=== SLOT GENERATION DEBUG ===');
    console.log('Config availability:', config.availability);
    console.log('Service duration:', config.serviceDuration);
    console.log('Days ahead:', config.daysAhead);

    setIsLoading(true);
    try {
      const today = startOfDay(new Date());
      const daysToGenerate = config.daysAhead || 14;
      const newSlots: ProviderSlot[] = [];

      for (let i = 0; i < daysToGenerate; i++) {
        const currentDate = addDays(today, i);
        const dayOfWeek = getDay(currentDate);
        const dayKey = Object.keys(dayMap).find(key => dayMap[key] === dayOfWeek);
        
        console.log(`Day ${i}: ${format(currentDate, 'yyyy-MM-dd')} (${dayKey}) - dayOfWeek: ${dayOfWeek}`);
        
        if (!dayKey) {
          console.log(`  - No dayKey found for dayOfWeek ${dayOfWeek}`);
          continue;
        }

        const dayAvailability = config.availability[dayKey];
        console.log(`  - Day availability:`, dayAvailability);
        
        if (!dayAvailability?.enabled) {
          console.log(`  - Day ${dayKey} not enabled, skipping`);
          continue;
        }

        if (!dayAvailability.timeSlots || dayAvailability.timeSlots.length === 0) {
          console.log(`  - No timeSlots for ${dayKey}, skipping`);
          continue;
        }

        console.log(`  - Processing ${dayAvailability.timeSlots.length} time slots for ${dayKey}`);
        
        for (const timeSlot of dayAvailability.timeSlots) {
          console.log(`    - Processing timeSlot:`, timeSlot);
          const timeSlots = generateTimeSlots(
            timeSlot.startTime,
            timeSlot.endTime,
            config.serviceDuration
          );
          console.log(`    - Generated ${timeSlots.length} time slots:`, timeSlots);

          for (const time of timeSlots) {
            const startDateTime = new Date(currentDate);
            const [hours, minutes] = time.split(':').map(Number);
            startDateTime.setHours(hours, minutes);

            const endDateTime = new Date(startDateTime);
            endDateTime.setMinutes(endDateTime.getMinutes() + config.serviceDuration);

            const { time: displayTime, period } = formatTimeTo12Hour(time);

            const slot: ProviderSlot = {
              id: `${format(currentDate, 'yyyy-MM-dd')}-${time}`,
              date: currentDate,
              time,
              displayTime,
              period,
              isAvailable: true,
              listingId: config.listingId || undefined
            };

            console.log(`      - Created slot:`, slot);
            newSlots.push(slot);
          }
        }
      }

      console.log(`=== FINAL RESULT: ${newSlots.length} slots generated ===`);
      newSlots.forEach(slot => {
        console.log(`${format(slot.date, 'yyyy-MM-dd')} ${slot.displayTime} ${slot.period}`);
      });

      // Always update the local state first
      console.log('=== UPDATING LOCAL STATE ===');
      console.log('Previous slots count:', slots.length);
      setSlots(newSlots);
      console.log('New slots count:', newSlots.length);

      // If this is for a specific listing, also save to database
      if (config.listingId) {
        const slotsToInsert = newSlots.map(slot => ({
          provider_id: user.id,
          listing_id: config.listingId!,
          slot_date: format(slot.date, 'yyyy-MM-dd'),
          start_time: slot.time,
          end_time: format(new Date(slot.date.getTime() + config.serviceDuration * 60000), 'HH:mm'),
          slot_datetime_start: new Date(slot.date.getFullYear(), slot.date.getMonth(), slot.date.getDate(), 
            parseInt(slot.time.split(':')[0]), parseInt(slot.time.split(':')[1])).toISOString(),
          slot_datetime_end: new Date(slot.date.getFullYear(), slot.date.getMonth(), slot.date.getDate(), 
            parseInt(slot.time.split(':')[0]), parseInt(slot.time.split(':')[1]) + config.serviceDuration).toISOString(),
          is_available: true
        }));

        if (slotsToInsert.length > 0) {
          // First, delete existing slots for the date range to avoid conflicts
          const startDate = format(today, 'yyyy-MM-dd');
          const endDate = format(addDays(today, config.daysAhead || 14), 'yyyy-MM-dd');
          
          await supabase
            .from('provider_time_slots')
            .delete()
            .eq('provider_id', user.id)
            .eq('listing_id', config.listingId)
            .gte('slot_date', startDate)
            .lte('slot_date', endDate);
          
          // Then insert the new slots
          const { error } = await supabase
            .from('provider_time_slots')
            .insert(slotsToInsert);

          if (error) throw error;
          toast.success(`${slotsToInsert.length} horarios generados`);
          await loadProviderSlots();
        }
      } else {
        // For availability preview (no specific listing), just set the in-memory slots
        setSlots(newSlots);
        toast.success(`Vista previa generada con ${newSlots.length} horarios`);
      }
    } catch (error) {
      console.error('Error generating slots:', error);
      toast.error('Error al generar horarios');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSlot = async (slotId: string) => {
    const slot = slots.find(s => s.id === slotId);
    if (!slot) return;

    // If this is an in-memory slot (no listingId), just update state
    if (!slot.listingId) {
      setSlots(prev => prev.map(s => 
        s.id === slotId ? { ...s, isAvailable: !s.isAvailable } : s
      ));
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('provider_time_slots')
        .update({ is_available: !slot.isAvailable })
        .eq('id', slotId);

      if (error) throw error;

      setSlots(prev => prev.map(s => 
        s.id === slotId ? { ...s, isAvailable: !s.isAvailable } : s
      ));

      toast.success(slot.isAvailable ? 'Horario desactivado' : 'Horario activado');
    } catch (error) {
      console.error('Error updating slot:', error);
      toast.error('Error al actualizar horario');
    } finally {
      setIsSaving(false);
    }
  };

  const updateAllSlots = async (isAvailable: boolean) => {
    if (slots.length === 0) return;

    // If these are in-memory slots (no listingId), just update state
    if (slots.every(s => !s.listingId)) {
      setSlots(prev => prev.map(s => ({ ...s, isAvailable })));
      return;
    }

    setIsSaving(true);
    try {
      const slotIds = slots.filter(s => s.listingId).map(s => s.id);
      if (slotIds.length > 0) {
        const { error } = await supabase
          .from('provider_time_slots')
          .update({ is_available: isAvailable })
          .in('id', slotIds);

        if (error) throw error;
      }

      setSlots(prev => prev.map(s => ({ ...s, isAvailable })));

      toast.success(isAvailable ? 'Todos los horarios activados' : 'Todos los horarios desactivados');
    } catch (error) {
      console.error('Error updating slots:', error);
      toast.error('Error al actualizar horarios');
    } finally {
      setIsSaving(false);
    }
  };

  // Group slots by date
  const slotsByDate = useMemo(() => {
    console.log('=== RECOMPUTING slotsByDate ===');
    console.log('Input slots count:', slots.length);
    
    const grouped: Record<string, ProviderSlot[]> = {};
    
    slots.forEach(slot => {
      const dateKey = format(slot.date, 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(slot);
    });

    // Sort slots within each date by time
    Object.keys(grouped).forEach(dateKey => {
      grouped[dateKey].sort((a, b) => a.time.localeCompare(b.time));
    });
    
    console.log('Grouped slots by date:', Object.keys(grouped).map(date => `${date}: ${grouped[date].length} slots`));
    
    return grouped;
  }, [slots]);

  // Get available dates
  const availableDates = useMemo(() => {
    const dates = slots.map(slot => slot.date);
    const uniqueDates = Array.from(new Set(dates.map(date => date.getTime())))
      .map(time => new Date(time))
      .sort((a, b) => a.getTime() - b.getTime());
    
    return uniqueDates;
  }, [slots]);

  const stats = useMemo(() => {
    const totalSlots = slots.length;
    const availableSlots = slots.filter(slot => slot.isAvailable).length;
    const blockedSlots = slots.filter(slot => !slot.isAvailable).length;

    return {
      totalSlots,
      availableSlots,
      blockedSlots,
      availablePercentage: totalSlots > 0 ? Math.round((availableSlots / totalSlots) * 100) : 0
    };
  }, [slots]);

  // Only load provider slots when we have a specific listing (not in preview mode)
  useEffect(() => {
    if (user?.id && config?.listingId) {
      console.log('=== LOADING PROVIDER SLOTS FROM DB ===');
      console.log('User ID:', user.id, 'Listing ID:', config.listingId);
      loadProviderSlots();
    } else if (user?.id && !config?.listingId) {
      console.log('=== PREVIEW MODE - NOT LOADING FROM DB ===');
      console.log('Keeping slots in memory only for preview');
    }
  }, [user?.id, config?.listingId]);

  return {
    slots,
    slotsByDate,
    availableDates,
    stats,
    isLoading,
    isSaving,
    loadProviderSlots,
    generateSlotsFromAvailability,
    toggleSlot,
    enableAllSlots: () => updateAllSlots(true),
    disableAllSlots: () => updateAllSlots(false)
  };
};