import { useQuery } from "@tanstack/react-query";
import { startOfMonth, startOfWeek } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { distanceKm, travelTimeMinutes, type LatLng } from "@/lib/geo/distance";

/**
 * Métricas del nuevo concepto que no existían en useStats (concepto v1, pilar #4):
 * - clientes nuevos del mes
 * - tiempo perdido en traslados (usa centroides de cantón + 30 km/h)
 * Ver docs/CONCEPTO_V1.md §8.3
 */
const TZ = "America/Costa_Rica";
const db = supabase as any;

interface TravelInsights {
  newClientsThisMonth: number;
  travelTimeHoursThisWeek: number;
  travelTimeHoursThisMonth: number;
}

/** Clave de identidad del cliente: id si existe, si no el WhatsApp (invitados). */
const clientKey = (a: { client_id: string | null; client_phone: string | null }) =>
  a.client_id ?? (a.client_phone ? `wa:${a.client_phone}` : null);

/** Suma el tiempo de traslado (horas) entre citas consecutivas del mismo día. */
function travelHours(
  appts: Array<{ start_time: string; canton_id: number | null }>,
  centroids: Map<number, LatLng>,
): number {
  // agrupar por día (en hora de CR) y ordenar por hora
  const byDay = new Map<string, Array<{ t: string; c: number | null }>>();
  for (const a of appts) {
    const day = formatInTimeZone(new Date(a.start_time), TZ, "yyyy-MM-dd");
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push({ t: a.start_time, c: a.canton_id });
  }
  let minutes = 0;
  for (const list of byDay.values()) {
    list.sort((x, y) => x.t.localeCompare(y.t));
    for (let i = 1; i < list.length; i++) {
      const prev = list[i - 1].c != null ? centroids.get(list[i - 1].c!) : undefined;
      const cur = list[i].c != null ? centroids.get(list[i].c!) : undefined;
      if (prev && cur) minutes += travelTimeMinutes(prev, cur);
    }
  }
  return Math.round((minutes / 60) * 10) / 10;
}

export function useTravelInsights() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["travel-insights", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<TravelInsights> => {
      const monthStart = startOfMonth(new Date());
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

      // Citas activas del mes (incluye semana)
      const { data: monthAppts = [], error } = await db
        .from("appointments")
        .select("client_id, client_phone, canton_id, start_time")
        .eq("provider_id", user!.id)
        .in("status", ["confirmed", "completed"])
        .gte("start_time", monthStart.toISOString());
      if (error) throw error;

      // Claves de clientes con citas ANTERIORES a este mes (para detectar nuevos)
      const { data: priorAppts = [] } = await db
        .from("appointments")
        .select("client_id, client_phone")
        .eq("provider_id", user!.id)
        .lt("start_time", monthStart.toISOString());
      const priorKeys = new Set(
        (priorAppts as any[]).map(clientKey).filter(Boolean) as string[],
      );

      const monthKeys = new Set(
        (monthAppts as any[]).map(clientKey).filter(Boolean) as string[],
      );
      const newClientsThisMonth = [...monthKeys].filter((k) => !priorKeys.has(k)).length;

      // Centroides de cantón (catálogo pequeño)
      const { data: cantones = [] } = await db
        .from("cantones")
        .select("id, centroid_lat, centroid_lng");
      const centroids = new Map<number, LatLng>();
      for (const c of cantones as any[]) {
        if (c.centroid_lat != null && c.centroid_lng != null) {
          centroids.set(c.id, { lat: c.centroid_lat, lng: c.centroid_lng });
        }
      }

      const weekAppts = (monthAppts as any[]).filter(
        (a) => new Date(a.start_time) >= weekStart,
      );

      return {
        newClientsThisMonth,
        travelTimeHoursThisWeek: travelHours(weekAppts, centroids),
        travelTimeHoursThisMonth: travelHours(monthAppts as any[], centroids),
      };
    },
  });
}

// re-exporta por conveniencia para consumidores que quieran distancia puntual
export { distanceKm };
