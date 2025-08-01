import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseWeeklySlotSubsProps {
  providerId: string;
  listingId: string;
  onRefresh: () => void;
  clearCache: () => void;
}

export const useWeeklySlotsSubs = ({ 
  providerId, 
  listingId, 
  onRefresh, 
  clearCache 
}: UseWeeklySlotSubsProps) => {

  const subscribeToAvailabilityChanges = useCallback((providerId: string, callback: () => void) => {
    console.log('WeeklySlots: Suscribiéndose a cambios de disponibilidad para provider:', providerId);
    
    const unsubscribe = () => {
      console.log('WeeklySlots: Desuscribiéndose de cambios de disponibilidad');
    };
    
    // Simulated subscription - in real app this would connect to real-time changes
    const timer = setTimeout(() => {
      // This would be triggered by actual availability changes
    }, 1000);
    
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  // Subscribe to availability changes for this provider
  useEffect(() => {
    if (!providerId) return;
    
    console.log('WeeklySlots: Configurando suscripción a cambios de disponibilidad');
    
    const unsubscribe = subscribeToAvailabilityChanges(providerId, () => {
      console.log('WeeklySlots: Disponibilidad actualizada, refrescando slots...');
      
      // Clear cache and force immediate refresh
      clearCache();
      
      // Add small delay to ensure database changes are propagated
      setTimeout(() => {
        onRefresh();
      }, 1000);
    });
    
    return unsubscribe;
  }, [providerId, subscribeToAvailabilityChanges, onRefresh, clearCache]);

  // Subscribe to real-time changes in provider_time_slots
  useEffect(() => {
    if (!providerId || !listingId) return;

    console.log('WeeklySlots: Configurando suscripciones en tiempo real');
    
    const channel = supabase
      .channel('weekly_slots_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'provider_time_slots',
          filter: `provider_id=eq.${providerId}`
        },
        (payload) => {
          console.log('WeeklySlots: Cambio detectado en provider_time_slots:', payload);
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;
          if (newRecord?.listing_id === listingId || oldRecord?.listing_id === listingId) {
            console.log('WeeklySlots: Cambio relevante para listing actual, refrescando...');
            clearCache();
            setTimeout(() => {
              onRefresh();
            }, 500);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'provider_availability',
          filter: `provider_id=eq.${providerId}`
        },
        (payload) => {
          console.log('WeeklySlots: Cambio detectado en provider_availability:', payload);
          clearCache();
          setTimeout(() => {
            onRefresh();
          }, 1500); // Longer delay for availability changes as they trigger slot regeneration
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'provider_slot_preferences',
          filter: `provider_id=eq.${providerId}`
        },
        (payload) => {
          console.log('WeeklySlots: Cambio detectado en provider_slot_preferences:', payload);
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;
          if (newRecord?.listing_id === listingId || oldRecord?.listing_id === listingId) {
            console.log('WeeklySlots: Cambio relevante en preferencias de slots, refrescando...');
            clearCache();
            setTimeout(() => {
              onRefresh();
            }, 300);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('WeeklySlots: Cancelando suscripción en tiempo real');
      supabase.removeChannel(channel);
    };
  }, [providerId, listingId, onRefresh, clearCache]);
};