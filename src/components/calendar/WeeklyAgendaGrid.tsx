import { useState } from "react";
import { addWeeks, format } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  useProviderAgendaWeek,
  weekStartMonday,
  type AgendaCell,
} from "@/hooks/useProviderAgendaWeek";
import AvailabilityImageGenerator from "./AvailabilityImageGenerator";

/**
 * Grilla semanal de la agenda del proveedor (filas = horas, columnas = días).
 * Chip verde "Libre" · gris "Bloq" · azul = cita · ámbar = pendiente.
 * Tap en Libre la bloquea; tap en Bloq la libera.
 */
function timeLabel(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12} ${period}` : `${h12}:${String(m).padStart(2, "0")}`;
}

// Show hour label only on the hour (not :30)
function showTimeLabel(hhmm: string) {
  return hhmm.endsWith(":00");
}

const CHIP: Record<AgendaCell["state"], string> = {
  libre:    "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 active:bg-emerald-200",
  bloq:     "bg-muted/60 text-muted-foreground border border-transparent hover:bg-muted active:bg-muted",
  cita:     "bg-blue-100 text-blue-800 border border-blue-200",
  pendiente:"bg-amber-50 text-amber-700 border border-amber-200",
  off:      "bg-gray-100 text-gray-300 border border-gray-100 cursor-default",
};

// Clases para celdas de continuación (bloques que siguen al primer slot de una cita)
const CHIP_CONTINUATION = "bg-blue-100 text-blue-800 border-x border-blue-200";
const CHIP_CONTINUATION_LAST = "bg-blue-100 text-blue-800 border-x border-b border-blue-200 rounded-b-md";

// Estilo para celdas de días pasados (gris, no interactivo)
const CHIP_PAST = "bg-gray-100 text-gray-300 border border-gray-100 cursor-default";

export default function WeeklyAgendaGrid() {
  const [weekStart, setWeekStart] = useState(() => weekStartMonday(new Date()));
  const { agenda, isLoading, toggleBlock, isToggling } = useProviderAgendaWeek(weekStart);

  const handleTap = (cell: AgendaCell | undefined) => {
    if (!cell || isToggling) return;
    if (cell.state === "libre" && cell.slotId) {
      toggleBlock(cell.slotId, true);
    } else if (cell.state === "bloq" && cell.slotId) {
      toggleBlock(cell.slotId, false);
    } else if (cell.state === "cita" || cell.state === "pendiente") {
      toast(`Cita: ${cell.label}`, { description: "El detalle de cita llega pronto." });
    }
  };

  const weekLabel = format(weekStart, "d MMM", { locale: es });

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      {/* Header */}
      <div className="bg-primary px-4 py-3 text-primary-foreground">
        {/* Top row: title + nav */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Mi disponibilidad</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setWeekStart((w) => addWeeks(w, -1))}
              className="rounded-lg p-1.5 hover:bg-white/20 active:bg-white/30"
              aria-label="Semana anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setWeekStart(weekStartMonday(new Date()))}
              className="rounded-lg px-2.5 py-1 text-xs font-medium hover:bg-white/20 active:bg-white/30"
            >
              Hoy
            </button>
            <button
              onClick={() => setWeekStart((w) => addWeeks(w, 1))}
              className="rounded-lg p-1.5 hover:bg-white/20 active:bg-white/30"
              aria-label="Semana siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Bottom row: week label + share button */}
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs font-normal opacity-80">
            Semana del {weekLabel}
          </span>
          <AvailabilityImageGenerator agenda={agenda} weekStart={weekStart} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : agenda.timeRows.length === 0 ? (
        <div className="px-4 py-12 text-center text-sm text-muted-foreground">
          No hay horarios esta semana. Configurá tu disponibilidad para generar slots.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-0 p-2 sm:p-3">
            {/* Day headers */}
            <div
              className="grid gap-1 pb-1"
              style={{ gridTemplateColumns: `2.2rem repeat(${agenda.days.length}, minmax(2.8rem, 1fr))` }}
            >
              <div />
              {agenda.days.map((d) => (
                <div key={d.key} className="text-center">
                  <span className={`text-[11px] font-bold uppercase ${d.isPast ? "text-gray-300" : "text-muted-foreground"}`}>
                    {d.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Time rows */}
            <div className="space-y-px">
              {agenda.timeRows.map((t) => (
                <div
                  key={t}
                  className="grid items-center gap-1"
                  style={{ gridTemplateColumns: `2.2rem repeat(${agenda.days.length}, minmax(2.8rem, 1fr))` }}
                >
                  {/* Time label: show only on the hour to reduce clutter */}
                  <div className="flex items-center justify-end pr-1">
                    {showTimeLabel(t) ? (
                      <span className="text-[10px] font-medium leading-none text-muted-foreground">
                        {timeLabel(t)}
                      </span>
                    ) : (
                      <span className="text-[8px] text-muted-foreground/40">·</span>
                    )}
                  </div>

                  {agenda.days.map((d) => {
                    const cell = agenda.cells[`${d.key}|${t}`];

                    // Día pasado: celda gris si hay slot, vacío si no
                    if (d.isPast) {
                      return (
                        <div
                          key={d.key}
                          className={`h-8 rounded-md ${cell ? CHIP_PAST : "bg-gray-50"}`}
                        />
                      );
                    }

                    if (!cell) {
                      return <div key={d.key} className="h-8 rounded-md bg-transparent" />;
                    }

                    // Celda "off": dentro del horario configurado pero sin slot disponible (hueco entre rangos)
                    if (cell.state === "off") {
                      return (
                        <div
                          key={d.key}
                          className={`h-8 rounded-md ${CHIP.off}`}
                          title="Fuera del horario disponible"
                        />
                      );
                    }

                    const isAppt = cell.state === "cita" || cell.state === "pendiente";

                    // Celdas de continuación: barra sólida sin texto (conectada visualmente)
                    if (isAppt && cell.isContinuation) {
                      const cls = cell.isLast ? CHIP_CONTINUATION_LAST : CHIP_CONTINUATION;
                      return (
                        <div
                          key={d.key}
                          className={`h-8 w-full ${cls}`}
                          title={cell.label}
                        />
                      );
                    }

                    const tappable = cell.state === "libre" || cell.state === "bloq";
                    // Primera celda de una cita: esquinas redondeadas arriba, no abajo si hay continuación
                    const isFirstOfBlock = isAppt && !cell.isContinuation;
                    const roundingClass = isFirstOfBlock
                      ? "rounded-t-md rounded-b-none"
                      : "rounded-md";

                    return (
                      <button
                        key={d.key}
                        onClick={() => handleTap(cell)}
                        disabled={!tappable && !isAppt}
                        className={`flex h-8 w-full items-center justify-center px-0.5 text-[10px] font-semibold leading-none transition-colors ${CHIP[cell.state]} ${roundingClass}`}
                        title={cell.label}
                      >
                        {cell.state === "libre" && <span className="truncate">Libre</span>}
                        {cell.state === "bloq" && <span className="truncate">Bloq</span>}
                        {isAppt && (
                          <span className="truncate">{(cell.label ?? "").split(" ")[0]}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-emerald-200 bg-emerald-50 text-[10px] font-bold text-emerald-700">●</span>
                Libre — toca para bloquear
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-muted text-[10px] font-bold text-muted-foreground">—</span>
                Bloqueado — toca para liberar
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded border border-blue-200 bg-blue-50" />
                Cita
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded border border-amber-200 bg-amber-50" />
                Pendiente
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
