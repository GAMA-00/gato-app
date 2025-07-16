import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useAvailabilityContext } from '@/contexts/AvailabilityContext';

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

export const useProviderAvailability = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { notifyAvailabilityChange } = useAvailabilityContext();
  const [availability, setAvailability] = useState<WeeklyAvailability>({
    monday: { enabled: false, timeSlots: [] },
    tuesday: { enabled: false, timeSlots: [] },
    wednesday: { enabled: false, timeSlots: [] },
    thursday: { enabled: false, timeSlots: [] },
    friday: { enabled: false, timeSlots: [] },
    saturday: { enabled: false, timeSlots: [] },
    sunday: { enabled: false, timeSlots: [] }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const dayMapping = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6
  };

  const fetchAvailability = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      console.log('Cargando disponibilidad para proveedor:', user.id);
      
      const { data, error } = await supabase
        .from('provider_availability')
        .select('*')
        .eq('provider_id', user.id)
        .order('day_of_week', { ascending: true });

      if (error) {
        console.error('Error fetching availability:', error);
        toast.error('Error al cargar la disponibilidad configurada');
        return;
      }

      const newAvailability: WeeklyAvailability = { ...availability };
      
      // Reset all days first
      Object.keys(newAvailability).forEach(day => {
        newAvailability[day] = { enabled: false, timeSlots: [] };
      });

      if (data && data.length > 0) {
        console.log('Disponibilidad cargada:', data.length, 'slots encontrados');
        
        data.forEach((slot: AvailabilitySlot) => {
          const dayName = Object.keys(dayMapping).find(
            key => dayMapping[key as keyof typeof dayMapping] === slot.day_of_week
          );
          
          if (dayName) {
            if (!newAvailability[dayName].enabled) {
              newAvailability[dayName] = { enabled: true, timeSlots: [] };
            }
            
            newAvailability[dayName].timeSlots.push({
              id: slot.id,
              startTime: slot.start_time,
              endTime: slot.end_time
            });
          }
        });
        
        console.log('Disponibilidad procesada:', newAvailability);
      } else {
        console.log('No se encontró disponibilidad previa, iniciando con configuración vacía');
      }

      setAvailability(newAvailability);
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
      console.log('Guardando disponibilidad para proveedor:', user.id);
      
      // Delete existing availability
      const { error: deleteError } = await supabase
        .from('provider_availability')
        .delete()
        .eq('provider_id', user.id);

      if (deleteError) {
        console.error('Error deleting existing availability:', deleteError);
        toast.error('Error al eliminar la disponibilidad anterior');
        return;
      }

      const slotsToInsert: Array<{
        provider_id: string;
        day_of_week: number;
        start_time: string;
        end_time: string;
        is_active: boolean;
      }> = [];

      Object.entries(availability).forEach(([dayName, dayData]) => {
        if (dayData.enabled && dayData.timeSlots.length > 0) {
          const dayOfWeek = dayMapping[dayName as keyof typeof dayMapping];
          
          dayData.timeSlots.forEach(slot => {
            slotsToInsert.push({
              provider_id: user.id,
              day_of_week: dayOfWeek,
              start_time: slot.startTime,
              end_time: slot.endTime,
              is_active: true
            });
          });
        }
      });

      console.log('Slots a insertar:', slotsToInsert.length);

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

      console.log('Disponibilidad guardada exitosamente');
      toast.success('Disponibilidad actualizada correctamente');
      
      // Refresh the data to confirm it was saved
      await fetchAvailability();
      
      // Invalidate related queries to update client-side availability immediately
      console.log('Invalidando queries relacionadas con disponibilidad...');
      
      // Invalidate recurring slot system queries (used in calendar)
      queryClient.invalidateQueries({ 
        queryKey: ['recurring-slot-system'], 
        exact: false 
      });
      
      // Invalidate any other availability-related queries
      queryClient.invalidateQueries({ 
        queryKey: ['provider-availability', user.id], 
        exact: false 
      });
      
      // Invalidate time slots queries  
      queryClient.invalidateQueries({ 
        queryKey: ['time-slots'], 
        exact: false 
      });
      
      // Invalidate weekly slots queries
      queryClient.invalidateQueries({ 
        queryKey: ['weekly-slots'], 
        exact: false 
      });
      
      // Invalidate calendar appointments to refresh the calendar view
      queryClient.invalidateQueries({ 
        queryKey: ['calendar-appointments'], 
        exact: false 
      });
      
      console.log('Queries invalidadas exitosamente');
      
      // Regenerate time slots for all listings of this provider
      console.log('Regenerando slots de tiempo para el proveedor:', user.id);
      
      // Get all listings for this provider
      const { data: listings, error: listingsError } = await supabase
        .from('listings')
        .select('id')
        .eq('provider_id', user.id)
        .eq('is_active', true);
      
      if (listingsError) {
        console.error('Error fetching listings:', listingsError);
      } else if (listings && listings.length > 0) {
        // Regenerate slots for each listing
        for (const listing of listings) {
          try {
            const { error: regenerateError } = await supabase
              .rpc('regenerate_slots_for_listing', {
                p_listing_id: listing.id
              });
            
            if (regenerateError) {
              console.error('Error regenerating slots for listing:', listing.id, regenerateError);
            } else {
              console.log('Slots regenerados exitosamente para listing:', listing.id);
            }
          } catch (error) {
            console.error('Error calling regenerate function for listing:', listing.id, error);
          }
        }
      }
      
      // Notify hooks using traditional state management to refresh their data
      if (user?.id) {
        console.log('Notificando cambio de disponibilidad para proveedor:', user.id);
        
        // Add a small delay to ensure database operations have completed
        setTimeout(() => {
          notifyAvailabilityChange(user.id);
        }, 500);
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
        timeSlots: enabled ? prev[day].timeSlots : []
      }
    }));
  };

  const addTimeSlot = (day: string) => {
    setAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        timeSlots: [
          ...prev[day].timeSlots,
          { startTime: '09:00', endTime: '17:00' }
        ]
      }
    }));
  };

  const removeTimeSlot = (day: string, index: number) => {
    setAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        timeSlots: prev[day].timeSlots.filter((_, i) => i !== index)
      }
    }));
  };

  const updateTimeSlot = (day: string, index: number, field: 'startTime' | 'endTime', value: string) => {
    setAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        timeSlots: prev[day].timeSlots.map((slot, i) => 
          i === index ? { ...slot, [field]: value } : slot
        )
      }
    }));
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
    refreshAvailability: fetchAvailability
  };
};