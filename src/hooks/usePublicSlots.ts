import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Slots disponibles de un proveedor/servicio para el booking link público.
 * Lee provider_time_slots (lectura pública dentro de la ventana de reserva).
 * Ver docs/CONCEPTO_V1.md §8.1
 */
const db = supabase as any;

export interface PublicSlot {
  id: string;
  slot_datetime_start: string; // ISO
  slot_datetime_end: string;
}

/** Slots disponibles (no reservados) desde mañana hasta `daysAhead` días. */
export function usePublicSlots(providerId?: string, listingId?: string, daysAhead = 30) {
  return useQuery({
    queryKey: ["public-slots", providerId, listingId, daysAhead],
    enabled: !!providerId && !!listingId,
    queryFn: async (): Promise<PublicSlot[]> => {
      const now = new Date().toISOString();
      const until = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await db
        .from("provider_time_slots")
        .select("id, slot_datetime_start, slot_datetime_end")
        .eq("provider_id", providerId)
        .eq("listing_id", listingId)
        .eq("is_available", true)
        .eq("is_reserved", false)
        .gte("slot_datetime_start", now)
        .lte("slot_datetime_start", until)
        .order("slot_datetime_start");
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Agrupa slots por día (YYYY-MM-DD) para el calendario. */
export function groupSlotsByDay(slots: PublicSlot[]): Record<string, PublicSlot[]> {
  return slots.reduce((acc, slot) => {
    const day = slot.slot_datetime_start.slice(0, 10);
    (acc[day] ??= []).push(slot);
    return acc;
  }, {} as Record<string, PublicSlot[]>);
}
