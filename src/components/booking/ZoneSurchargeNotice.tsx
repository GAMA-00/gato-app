import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

/**
 * Aviso que explica el recargo por transporte cuando el día seleccionado
 * tiene una zona asignada distinta al cantón del cliente.
 */
interface Props {
  providerId: string;
  /** Día seleccionado en formato YYYY-MM-DD */
  dayKey: string;
  /** % de recargo que aplica a los slots de ese día (0 = no mostrar) */
  surchargePct: number;
}

export default function ZoneSurchargeNotice({ providerId, dayKey, surchargePct }: Props) {
  const jsDay = new Date(`${dayKey}T12:00:00`).getDay(); // 0=dom
  const ourDay = jsDay === 0 ? 6 : jsDay - 1; // 0=lun

  const { data: cantonNames = [] } = useQuery({
    queryKey: ["zone-notice-cantons", providerId, ourDay],
    enabled: !!providerId && surchargePct > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<string[]> => {
      const { data: filter } = await db
        .from("provider_route_filters")
        .select("canton_ids")
        .eq("provider_id", providerId)
        .eq("day_of_week", ourDay)
        .maybeSingle();
      const ids: number[] = Array.isArray(filter?.canton_ids) ? filter.canton_ids : [];
      if (ids.length === 0) return [];
      const { data: cantones } = await db
        .from("cantones")
        .select("id, nombre")
        .in("id", ids);
      return (cantones ?? []).map((c: any) => c.nombre);
    },
  });

  if (surchargePct <= 0 || cantonNames.length === 0) return null;

  const zonas =
    cantonNames.length === 1
      ? cantonNames[0]
      : `${cantonNames.slice(0, -1).join(", ")} y ${cantonNames[cantonNames.length - 1]}`;

  return (
    <p className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
      Este día el proveedor tiene su ruta asignada a <strong>{zonas}</strong>. Podés
      agendar igual, pero como tu dirección está fuera de esa zona se aplica un
      recargo del <strong>+{surchargePct}%</strong> por traslado.
    </p>
  );
}
