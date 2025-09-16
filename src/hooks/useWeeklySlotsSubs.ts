import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  
  // Subscribe to real-time changes for consistent slot state
  useEffect(() => {
    if (!providerId || !listingId) return;

    console.log('WeeklySlots: Configurando suscripción unificada en tiempo real');

    const channel = supabase
      .channel(`unified-slots-${providerId}-${listingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'provider_time_slots',
          filter: `provider_id=eq.${providerId}`
        },
        (payload) => {
          console.log('📡 Cambio en provider_time_slots:', payload);
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;
          if (newRecord?.listing_id === listingId || oldRecord?.listing_id === listingId) {
            setTimeout(() => onSlotsChanged(), 300);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `provider_id=eq.${providerId}`
        },
        (payload) => {
          console.log('📡 Cambio en appointments:', payload);
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;
          if (newRecord?.listing_id === listingId || oldRecord?.listing_id === listingId) {
            // Immediate refresh for appointment changes affecting slot availability
            setTimeout(() => onSlotsChanged(), 100);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recurring_rules',
          filter: `provider_id=eq.${providerId}`
        },
        (payload) => {
          console.log('📡 Cambio en recurring_rules:', payload);
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;
          if (newRecord?.listing_id === listingId || oldRecord?.listing_id === listingId) {
            setTimeout(() => onSlotsChanged(), 200);
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
          console.log('📡 Cambio en provider_availability:', payload);
          setTimeout(() => onSlotsChanged(), 800); // Longer delay for availability changes
        }
      )
      .subscribe();

    return () => {
      console.log('🧹 Limpiando suscripción unificada en tiempo real');
      supabase.removeChannel(channel);
    };
  }, [providerId, listingId, onSlotsChanged]);
};