import { useEffect, useRef } from 'react';
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
  
  // Use ref for callback to prevent re-subscriptions when callback identity changes
  const onSlotsChangedRef = useRef(onSlotsChanged);
  
  // Update ref when callback changes (but don't trigger re-subscription)
  useEffect(() => {
    onSlotsChangedRef.current = onSlotsChanged;
  }, [onSlotsChanged]);
  
  // Subscribe to real-time changes for consistent slot state
  // Only re-subscribe when providerId or listingId change (NOT when callback changes)
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
            setTimeout(() => onSlotsChangedRef.current(), 300);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all appointment events for better tracking
          schema: 'public',
          table: 'appointments',
          filter: `provider_id=eq.${providerId}`
        },
        (payload) => {
          console.log('📡 Cambio en appointments:', payload);
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;
          
          // Check if the appointment affects our listing
          if (newRecord?.listing_id === listingId || oldRecord?.listing_id === listingId) {
            // Immediate refresh for appointment changes affecting slot availability
            setTimeout(() => onSlotsChangedRef.current(), 100);
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
            setTimeout(() => onSlotsChangedRef.current(), 200);
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
          setTimeout(() => onSlotsChangedRef.current(), 800); // Longer delay for availability changes
        }
      )
      .subscribe();

    return () => {
      console.log('🧹 Limpiando suscripción unificada en tiempo real');
      supabase.removeChannel(channel);
    };
  }, [providerId, listingId]); // Removed onSlotsChanged from deps - using ref instead
};