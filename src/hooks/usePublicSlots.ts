import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getTransportSurcharge } from "./useRouteFilters";

const db = supabase as any;

export interface PublicSlot {
  id: string;
  slot_datetime_start: string; // ISO
  slot_datetime_end: string;
  transport_surcharge_pct?: number; // 0 o ausente = en zona; >0 = recargo por transporte
}

/** Slots disponibles respetando antelación mínima. Todos los slots son visibles;
 *  los que estén fuera de zona del cantón del cliente llevan transport_surcharge_pct > 0. */
export function usePublicSlots(
  providerId?: string,
  listingId?: string,
  daysAhead = 30,
  minNoticeHours = 0,
  cantonId?: number | null,
) {
  return useQuery({
    queryKey: ["public-slots", providerId, listingId, daysAhead, minNoticeHours, cantonId ?? null],
    enabled: !!providerId && !!listingId,
    queryFn: async (): Promise<PublicSlot[]> => {
      const earliest = new Date(Date.now() + minNoticeHours * 60 * 60 * 1000).toISOString();
      const until = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await db
        .from("provider_time_slots")
        .select("id, slot_datetime_start, slot_datetime_end")
        .eq("provider_id", providerId)
        .eq("listing_id", listingId)
        .eq("is_available", true)
        .eq("is_reserved", false)
        .gte("slot_datetime_start", earliest)
        .lte("slot_datetime_start", until)
        .order("slot_datetime_start");
      if (error) throw error;
      const slots: PublicSlot[] = data ?? [];

      // Si hay cantón conocido, calcular recargo por zona para cada día único
      if (cantonId && slots.length > 0) {
        const dayCache = new Map<string, number>();
        const tagged = await Promise.all(
          slots.map(async (s) => {
            const dayKey = s.slot_datetime_start.slice(0, 10);
            if (!dayCache.has(dayKey)) {
              const pct = await getTransportSurcharge(providerId!, cantonId, new Date(s.slot_datetime_start));
              dayCache.set(dayKey, pct);
            }
            const pct = dayCache.get(dayKey)!;
            return pct > 0 ? { ...s, transport_surcharge_pct: pct } : s;
          })
        );
        return tagged;
      }

      return slots;
    },
  });
}

/** Filtra solo los slots que tienen N slots consecutivos de 30 min necesarios. */
export function filterConsecutiveSlots(slots: PublicSlot[], totalDurationMin: number): PublicSlot[] {
  const slotsNeeded = Math.max(1, Math.ceil(totalDurationMin / 30));
  if (slotsNeeded <= 1) return slots;
  const startEpochs = new Set(slots.map((s) => new Date(s.slot_datetime_start).getTime()));
  return slots.filter((startSlot) => {
    const startMs = new Date(startSlot.slot_datetime_start).getTime();
    for (let i = 1; i < slotsNeeded; i++) {
      if (!startEpochs.has(startMs + i * 30 * 60 * 1000)) return false;
    }
    return true;
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
