import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const db = supabase as any;

export interface RouteFilter {
  id?: string;
  provider_id?: string;
  day_of_week: number; // 0=lun … 6=dom
  province_ids: number[];
  canton_ids: number[];
  transport_surcharge_pct: number; // % de recargo para clientes fuera de zona
}

export const DAY_LABELS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export function useRouteFilters(providerId?: string) {
  return useQuery({
    queryKey: ["route-filters", providerId],
    enabled: !!providerId,
    queryFn: async (): Promise<RouteFilter[]> => {
      const { data, error } = await db
        .from("provider_route_filters")
        .select("*")
        .eq("provider_id", providerId)
        .order("day_of_week");
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        ...r,
        province_ids: Array.isArray(r.province_ids) ? r.province_ids : [],
        canton_ids: Array.isArray(r.canton_ids) ? r.canton_ids : [],
        transport_surcharge_pct: r.transport_surcharge_pct ?? 0,
      }));
    },
  });
}

export function useSaveRouteFilter() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (filter: RouteFilter) => {
      if (!user?.id) throw new Error("No autenticado");
      const { error } = await db
        .from("provider_route_filters")
        .upsert(
          {
            provider_id: user.id,
            day_of_week: filter.day_of_week,
            province_ids: filter.province_ids,
            canton_ids: filter.canton_ids,
            transport_surcharge_pct: filter.transport_surcharge_pct,
          },
          { onConflict: "provider_id,day_of_week" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["route-filters"] });
    },
  });
}

export function useDeleteRouteFilter() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (day_of_week: number) => {
      if (!user?.id) throw new Error("No autenticado");
      const { error } = await db
        .from("provider_route_filters")
        .delete()
        .eq("provider_id", user.id)
        .eq("day_of_week", day_of_week);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["route-filters"] });
    },
  });
}

/**
 * Para el booking link: dado un canton_id y fecha, devuelve el % de recargo
 * por transporte que aplica (0 = en zona o sin filtro para ese día).
 */
export async function getTransportSurcharge(
  providerId: string,
  cantonId: number,
  date: Date
): Promise<number> {
  const jsDay = date.getDay(); // 0=dom
  const ourDay = jsDay === 0 ? 6 : jsDay - 1; // 0=lun

  const { data: dayFilter } = await db
    .from("provider_route_filters")
    .select("province_ids, canton_ids, transport_surcharge_pct")
    .eq("provider_id", providerId)
    .eq("day_of_week", ourDay)
    .maybeSingle();

  // Sin filtro para ese día → sin recargo
  if (!dayFilter) return 0;

  const allowedCantons: number[] = Array.isArray(dayFilter.canton_ids) ? dayFilter.canton_ids : [];
  const allowedProvinces: number[] = Array.isArray(dayFilter.province_ids) ? dayFilter.province_ids : [];
  const surchargePct: number = dayFilter.transport_surcharge_pct ?? 0;

  // Sin restricciones → sin recargo
  if (allowedCantons.length === 0 && allowedProvinces.length === 0) return 0;

  // Cliente en zona permitida → sin recargo
  if (allowedCantons.includes(cantonId)) return 0;

  if (allowedProvinces.length > 0) {
    const { data: cantonData } = await db
      .from("cantones")
      .select("provincia_id")
      .eq("id", cantonId)
      .maybeSingle();
    if (cantonData && allowedProvinces.includes(cantonData.provincia_id)) return 0;
  }

  // Cliente fuera de zona → recargo
  return surchargePct;
}

/** @deprecated Usar getTransportSurcharge. Mantenido para compatibilidad. */
export async function checkRouteFilterAllowed(
  providerId: string,
  cantonId: number,
  date: Date
): Promise<boolean> {
  const surcharge = await getTransportSurcharge(providerId, cantonId, date);
  return surcharge === 0;
}
