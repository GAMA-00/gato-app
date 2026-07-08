import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatInTimeZone } from "date-fns-tz";
import { addDays, startOfWeek, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const TZ = "America/Costa_Rica";
const TZ_OFFSET = "-06:00";

export type CellState = "libre" | "bloq" | "cita" | "pendiente" | "off";

export interface AgendaCell {
  state: CellState;
  slotId?: string;
  label?: string;
  appointmentId?: string;
  isContinuation?: boolean;
  isLast?: boolean;
}

export interface AgendaDay {
  key: string;
  label: string;
  date: Date;
  isPast: boolean;
}

export interface AgendaWeek {
  days: AgendaDay[];
  timeRows: string[];
  cells: Record<string, AgendaCell>;
}

const DAY_LABELS = ["D", "L", "K", "M", "J", "V", "S"];

// día JS (0=dom) → clave de disponibilidad
const DOW_KEY = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];

export function weekStartMonday(d: Date) {
  return startOfWeek(d, { weekStartsOn: 1 });
}

/** Genera todas las marcas HH:mm de 30 en 30 entre start y end (no inclusivo en end) */
function timeRange30(start: string, end: string): string[] {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  const result: string[] = [];
  for (let m = startMin; m < endMin; m += 30) {
    result.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  }
  return result;
}

export function useProviderAgendaWeek(weekStart: Date) {
  const { user } = useAuth();
  const providerId = user?.id;
  const queryClient = useQueryClient();

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
    queryFn: async (): Promise<{ slots: any[]; appts: any[]; avail: any[] }> => {
      const startISO = `${firstKey}T00:00:00${TZ_OFFSET}`;
      const endISO = `${afterLastKey}T00:00:00${TZ_OFFSET}`;
      const db = supabase as any;
      const [slotsRes, apptRes, availRes] = await Promise.all([
        db
          .from("provider_time_slots")
          .select("id, slot_datetime_start, is_available, is_reserved, slot_type, recurring_blocked")
          .eq("provider_id", providerId)
          .gte("slot_datetime_start", startISO)
          .lt("slot_datetime_start", endISO),
        db
          .from("appointments")
          .select("id, start_time, end_time, status, client_name")
          .eq("provider_id", providerId)
          .in("status", ["pending", "confirmed"])
          .gte("start_time", startISO)
          .lt("start_time", endISO),
        // Configuración de disponibilidad (para calcular huecos grises)
        supabase
          .from("provider_availability")
          .select("day_of_week, start_time, end_time")
          .eq("provider_id", providerId)
          .eq("is_active", true),
      ]);
      if (slotsRes.error) throw slotsRes.error;
      if (apptRes.error) throw apptRes.error;
      return {
        slots: slotsRes.data ?? [],
        appts: apptRes.data ?? [],
        avail: availRes.data ?? [],
      };
    },
  });

  const agenda = useMemo<AgendaWeek>(() => {
    const slots = query.data?.slots ?? [];
    const appts = query.data?.appts ?? [];
    const avail = query.data?.avail ?? [];

    const todayKey = formatInTimeZone(new Date(), TZ, "yyyy-MM-dd");

    const timeSet = new Set<string>();
    const cells: Record<string, AgendaCell> = {};
    const daysWithSlots = new Set<string>();

    const dayKey = (iso: string) => formatInTimeZone(new Date(iso), TZ, "yyyy-MM-dd");
    const timeKey = (iso: string) => formatInTimeZone(new Date(iso), TZ, "HH:mm");

    // Construir mapa dow → rangos configurados (para huecos grises)
    const availByDow: Record<number, { start: string; end: string }[]> = {};
    for (const a of avail) {
      if (!availByDow[a.day_of_week]) availByDow[a.day_of_week] = [];
      availByDow[a.day_of_week].push({ start: a.start_time.slice(0, 5), end: a.end_time.slice(0, 5) });
    }

    // 1) Slots → libre / bloq
    for (const s of slots) {
      const dk = dayKey(s.slot_datetime_start);
      const tk = timeKey(s.slot_datetime_start);
      timeSet.add(tk);
      daysWithSlots.add(dk);
      const blocked = s.is_available === false || s.slot_type === "manually_blocked";
      cells[`${dk}|${tk}`] = {
        state: blocked && !s.is_reserved ? "bloq" : "libre",
        slotId: s.id,
      };
    }

    // 2) Citas → cita / pendiente (marca todos los slots de duración)
    const SLOT_MINUTES = 30;
    for (const a of appts) {
      const state: CellState = a.status === "pending" ? "pendiente" : "cita";
      const label = a.client_name || "Cliente";
      const startMs = new Date(a.start_time).getTime();
      const endMs = a.end_time ? new Date(a.end_time).getTime() : startMs + SLOT_MINUTES * 60_000;
      const totalSlots = Math.max(1, Math.round((endMs - startMs) / (SLOT_MINUTES * 60_000)));

      for (let i = 0; i < totalSlots; i++) {
        const slotMs = startMs + i * SLOT_MINUTES * 60_000;
        const slotDate = new Date(slotMs);
        const dk = formatInTimeZone(slotDate, TZ, "yyyy-MM-dd");
        const tk = formatInTimeZone(slotDate, TZ, "HH:mm");
        timeSet.add(tk);
        daysWithSlots.add(dk);
        cells[`${dk}|${tk}`] = {
          state,
          label,
          appointmentId: a.id,
          slotId: cells[`${dk}|${tk}`]?.slotId,
          isContinuation: i > 0,
          isLast: i === totalSlots - 1,
        };
      }
    }

    // 3) Huecos grises: tiempos dentro del rango configurado pero sin slot
    for (const d of weekDays) {
      const dow = d.getDay();
      const dk = format(d, "yyyy-MM-dd");
      const ranges = availByDow[dow];
      if (!ranges || ranges.length === 0) continue;

      for (const range of ranges) {
        const times = timeRange30(range.start, range.end);
        for (const tk of times) {
          timeSet.add(tk);
          daysWithSlots.add(dk);
          if (!cells[`${dk}|${tk}`]) {
            cells[`${dk}|${tk}`] = { state: "off" };
          }
        }
      }
    }

    // Columnas: L-V siempre; S/D si tienen datos
    const baseDays = weekDays.filter((d) => {
      const jsDay = d.getDay();
      if (jsDay >= 1 && jsDay <= 5) return true;
      const dk = format(d, "yyyy-MM-dd");
      return daysWithSlots.has(dk);
    });

    const days: AgendaDay[] = baseDays.map((d) => ({
      key: format(d, "yyyy-MM-dd"),
      label: DAY_LABELS[d.getDay()],
      date: d,
      isPast: format(d, "yyyy-MM-dd") < todayKey,
    }));

    const timeRows = Array.from(timeSet).sort();

    return { days, timeRows, cells };
  }, [query.data, weekDays]);

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
