import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Configuración del proveedor (concepto v1): buffer, descuento por proximidad y
 * toggles de recordatorio. Usado por A-3, SE-4 y M-1.
 * Ver docs/CONCEPTO_V1.md §5.4
 */
const db = supabase as any;

export interface ProviderSettings {
  provider_id: string;
  buffer_enabled: boolean;
  buffer_minutes: number;
  proximity_discount_enabled: boolean;
  proximity_discount_pct: number;
  show_recommended_slots: boolean;
  reminder_24h_enabled: boolean;
  reminder_2h_enabled: boolean;
  notify_daily_agenda: boolean;
  notify_1h_before: boolean;
}

export const DEFAULT_SETTINGS: Omit<ProviderSettings, "provider_id"> = {
  buffer_enabled: true,
  buffer_minutes: 30,
  proximity_discount_enabled: false,
  proximity_discount_pct: 0,
  show_recommended_slots: true,
  reminder_24h_enabled: true,
  reminder_2h_enabled: false,
  notify_daily_agenda: true,
  notify_1h_before: true,
};

/** Lee la config del proveedor; si no existe fila, devuelve los defaults. */
export function useProviderSettings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["provider-settings", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<ProviderSettings> => {
      const { data, error } = await db
        .from("provider_settings")
        .select("*")
        .eq("provider_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data ?? { provider_id: user!.id, ...DEFAULT_SETTINGS };
    },
  });
}

/** Guarda (upsert) la config del proveedor. */
export function useSaveProviderSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Omit<ProviderSettings, "provider_id">>) => {
      if (!user?.id) throw new Error("No hay proveedor autenticado");
      // Merge con la config actual para no pisar otros campos con defaults
      const { data: current } = await db
        .from("provider_settings")
        .select("*")
        .eq("provider_id", user.id)
        .maybeSingle();
      const base = current ?? { ...DEFAULT_SETTINGS };
      delete (base as any).updated_at;
      const { error } = await db
        .from("provider_settings")
        .upsert({ ...base, provider_id: user.id, ...patch }, { onConflict: "provider_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-settings"] });
    },
  });
}
