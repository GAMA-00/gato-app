import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatInTimeZone } from "date-fns-tz";
import { addDays, startOfWeek, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Datos de la agenda semanal del proveedor — TZ-correcto (Costa Rica), con
 * react-query para refresco/invalidación limpios. Reemplaza la lógica dispersa
 * y con bugs de timezone de los hooks viejos para la nueva grilla.
 */
const TZ = "America/Costa_Rica";
const TZ_OFFSET = "-06:00"; // Costa Rica, sin horario de verano

export type CellState = "libre" | "bloq" | "cita" | "pendiente";

export interface AgendaCell {
  state: CellState;
  slotId?: string;
  label?: string; // nombre del cliente para citas
  appointmentId?: string;
}

export interface AgendaWeek {
  days: { key: string; label: string; date: Date }[];
  timeRows: string[]; // "HH:mm"
  cells: Record<string, AgendaCell>; // key `${dayKey}|${HH:mm}`
}

const DAY_LABELS = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];

export function weekStartMonday(d: Date) {
  return startOfWeek(d, { weekStartsOn: 1 });
}

export function useProviderAgendaWeek(weekStart: Date) {
  const { user } = useAuth();
  const providerId = user?.id;
  const queryClient = useQueryClient();

  // 7 días (Lun..Dom) como llaves yyyy-MM-dd
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const firstKey = format(weekDays[0], "yyyy-MM-dd");
  const afterLastKey = format(addDays(weekDays[6], 1), "yyyy-MM-dd");

  const queryKey = ["agenda-week", providerId, firstKey];

  const query = useQuery({
    queryKey,
    enabled: !!providerId,
    queryFn: async (): Promise<{ slots: any[]; appts: any[] }> => {
      const startISO = `${firstKey}T00:00:00${TZ_OFFSET}`;
      const endISO = `${afterLastKey}T00:00:00${TZ_OFFSET}`;
      const db = supabase as any;
      const [slotsRes, apptRes] = await Promise.all([
        db
          .from("provider_time_slots")
          .select("id, slot_datetime_start, is_available, is_reserved, slot_type, recurring_blocked")
          .eq("provider_id", providerId)
          .gte("slot_datetime_start", startISO)
          .lt("slot_datetime_start", endISO),
        db
          .from("appointments")
          .select("id, start_time, status, client_name")
          .eq("provider_id", providerId)
          .in("status", ["pending", "confirmed"])
          .gte("start_time", startISO)
          .lt("start_time", endISO),
      ]);
      if (slotsRes.error) throw slotsRes.error;
      if (apptRes.error) throw apptRes.error;
      return { slots: slotsRes.data ?? [], appts: apptRes.data ?? [] };
    },
  });

  const agenda = useMemo<AgendaWeek>(() => {
    const slots = query.data?.slots ?? [];
    const appts = query.data?.appts ?? [];

    const timeSet = new Set<string>();
    const cells: Record<string, AgendaCell> = {};
    const daysWithData = new Set<string>();

    const dayKey = (iso: string) => formatInTimeZone(new Date(iso), TZ, "yyyy-MM-dd");
    const timeKey = (iso: string) => formatInTimeZone(new Date(iso), TZ, "HH:mm");

    // 1) Slots → libre / bloq
    for (const s of slots) {
      const dk = dayKey(s.slot_datetime_start);
      const tk = timeKey(s.slot_datetime_start);
      timeSet.add(tk);
      daysWithData.add(dk);
      const blocked = s.is_available === false || s.slot_type === "manually_blocked";
      cells[`${dk}|${tk}`] = {
        state: blocked && !s.is_reserved ? "bloq" : "libre",
        slotId: s.id,
      };
    }

    // 2) Citas → cita (azul) / pendiente (ámbar). Pisan al slot.
    for (const a of appts) {
      const dk = dayKey(a.start_time);
      const tk = timeKey(a.start_time);
      timeSet.add(tk);
      daysWithData.add(dk);
      cells[`${dk}|${tk}`] = {
        state: a.status === "pending" ? "pendiente" : "cita",
        label: a.client_name || "Cliente",
        appointmentId: a.id,
        slotId: cells[`${dk}|${tk}`]?.slotId,
      };
    }

    // Columnas: días con datos; si no hay, Lun–Vie
    let dayCols = weekDays.filter((d) => daysWithData.has(format(d, "yyyy-MM-dd")));
    if (dayCols.length === 0) dayCols = weekDays.slice(0, 5);

    const days = dayCols.map((d) => ({
      key: format(d, "yyyy-MM-dd"),
      label: DAY_LABELS[d.getDay()],
      date: d,
    }));
    const timeRows = Array.from(timeSet).sort();

    return { days, timeRows, cells };
  }, [query.data, weekDays]);

  // Bloquear / desbloquear un slot
  const toggleBlock = useMutation({
    mutationFn: async ({ slotId, block }: { slotId: string; block: boolean }) => {
      const db = supabase as any;
      const { error } = await db
        .from("provider_time_slots")
        .update({
          is_available: !block,
          is_reserved: false,
          slot_type: block ? "manually_blocked" : "generated",
        })
        .eq("id", slotId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    agenda,
    isLoading: query.isLoading,
    isError: query.isError,
    toggleBlock: (slotId: string, block: boolean) => toggleBlock.mutate({ slotId, block }),
    isToggling: toggleBlock.isPending,
  };
}
