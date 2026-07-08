import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Recomendación por proximidad para el booking link (concepto v1, pilar #3).
 * Marca los slots contiguos a citas del mismo cantón y trae la config de descuento.
 * Ver docs/skills/SKILL_PROXIMITY_SLOTS.md
 */
const db = supabase as any;

export interface ProximitySettings {
  show_recommended_slots: boolean;
  proximity_discount_enabled: boolean;
  proximity_discount_pct: number;
}

export interface ProximityData {
  /** epochs (ms) de los slot_datetime_start recomendados, para match exacto */
  recommendedEpochs: Set<number>;
  settings: ProximitySettings;
}

const DEFAULTS: ProximitySettings = {
  show_recommended_slots: true,
  proximity_discount_enabled: false,
  proximity_discount_pct: 0,
};

export function usePublicProximity(
  providerId?: string,
  listingId?: string,
  cantonId?: number | null,
) {
  return useQuery({
    queryKey: ["public-proximity", providerId, listingId, cantonId],
    enabled: !!providerId && !!listingId,
    queryFn: async (): Promise<ProximityData> => {
      const [settingsRes, recRes] = await Promise.all([
        db.rpc("get_provider_public_settings", { p_provider_id: providerId }),
        cantonId
          ? db.rpc("get_recommended_slot_starts", {
              p_provider_id: providerId,
              p_listing_id: listingId,
              p_canton_id: cantonId,
            })
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (settingsRes.error) throw settingsRes.error;
      if (recRes.error) throw recRes.error;

      const settings: ProximitySettings = settingsRes.data?.[0] ?? DEFAULTS;
      const recommendedEpochs = new Set<number>(
        (recRes.data ?? []).map((r: any) => new Date(r.slot_start).getTime()),
      );
      return { recommendedEpochs, settings };
    },
  });
}

/** Precio con descuento por proximidad aplicado (redondeado). */
export function applyProximityDiscount(
  basePrice: number | null | undefined,
  settings: ProximitySettings,
): number | null {
  if (basePrice == null) return null;
  if (!settings.proximity_discount_enabled || settings.proximity_discount_pct <= 0) return basePrice;
  return Math.round(basePrice * (1 - settings.proximity_discount_pct / 100));
}
