import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAvailabilityContext } from '@/contexts/AvailabilityContext';

interface UseWeeklySlotSubsProps {
  providerId: string;
  listingId: string;
  onSlotsChanged: () => void;
}

export const useWeeklySlotsSubs = ({
  providerId,
  listingId,
  onSlotsChanged
}: UseWeeklySlotSubsProps) => {
  const { subscribeToAvailabilityChanges } = useAvailabilityContext();

  // Subscribe to availability changes for this provider
  useEffect(() => {
    if (!providerId) return;
    
    console.log('WeeklySlots: Suscribiendo a cambios de disponibilidad para proveedor:', providerId);
    
    const unsubscribe = subscribeToAvailabilityChanges(providerId, () => {
      console.log('WeeklySlots: Disponibilidad actualizada, refrescando slots...');
      
      // Add small delay to ensure database changes are propagated
      setTimeout(() => {
        onSlotsChanged();
      }, 1000);
    });
    
    return unsubscribe;
  }, [providerId, subscribeToAvailabilityChanges, onSlotsChanged]);

  // Subscribe to real-time changes in provider_time_slots
  useEffect(() => {
    if (!providerId || !listingId) return;

    console.log('WeeklySlots: Configurando suscripción en tiempo real para slots del proveedor:', providerId);

    const channel = supabase
      .channel('provider-time-slots-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'provider_time_slots',
          filter: `provider_id=eq.${providerId}`
        },
        (payload) => {
          console.log('WeeklySlots: Cambio detectado en provider_time_slots:', payload);
          
          // Only refresh if it affects the current listing
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;
          if (newRecord?.listing_id === listingId || oldRecord?.listing_id === listingId) {
            console.log('WeeklySlots: Cambio relevante para listing actual, refrescando...');
            setTimeout(() => {
              onSlotsChanged();
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
          setTimeout(() => {
            onSlotsChanged();
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
          
          // Only refresh if it affects the current listing
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;
          if (newRecord?.listing_id === listingId || oldRecord?.listing_id === listingId) {
            console.log('WeeklySlots: Cambio relevante en preferencias de slots, refrescando...');
            setTimeout(() => {
              onSlotsChanged();
            }, 300);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('WeeklySlots: Cancelando suscripción en tiempo real');
      supabase.removeChannel(channel);
    };
  }, [providerId, listingId, onSlotsChanged]);
};