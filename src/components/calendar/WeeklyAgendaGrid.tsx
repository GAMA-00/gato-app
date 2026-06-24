import { useState } from "react";
import { addWeeks, format } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Loader2, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  useProviderAgendaWeek,
  weekStartMonday,
  type AgendaCell,
} from "@/hooks/useProviderAgendaWeek";

/**
 * Grilla semanal de la agenda del proveedor (filas = horas, columnas = días).
 * Chip verde "Libre" · gris "Bloq" · azul = cita (nombre del cliente) · ámbar = pendiente.
 * Tap en Libre la bloquea; tap en Bloq la libera. Es el enganche principal del v1.
 */
function timeLabel(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

const CHIP: Record<AgendaCell["state"], string> = {
  libre: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
  bloq: "bg-muted text-muted-foreground border-transparent hover:bg-muted/70",
  cita: "bg-blue-50 text-blue-700 border-blue-200",
  pendiente: "bg-amber-50 text-amber-700 border-amber-200",
};

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

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      {/* Header naranja */}
      <div className="flex items-center justify-between bg-primary px-4 py-3 text-primary-foreground">
        <div className="flex items-center gap-2 text-sm font-semibold">
          📅 Mi disponibilidad
          <span className="font-normal opacity-90">
            · Semana del {format(weekStart, "d 'de' LLL", { locale: es })}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekStart((w) => addWeeks(w, -1))}
            className="rounded-md p-1 hover:bg-white/20"
            aria-label="Semana anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setWeekStart(weekStartMonday(new Date()))}
            className="rounded-md px-2 py-0.5 text-xs hover:bg-white/20"
          >
            Hoy
          </button>
          <button
            onClick={() => setWeekStart((w) => addWeeks(w, 1))}
            className="rounded-md p-1 hover:bg-white/20"
            aria-label="Semana siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
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
        <div className="overflow-x-auto p-3">
          {/* Encabezado de días */}
          <div
            className="grid gap-1.5 pb-2"
            style={{ gridTemplateColumns: `3rem repeat(${agenda.days.length}, minmax(4.5rem, 1fr))` }}
          >
            <div />
            {agenda.days.map((d) => (
              <div key={d.key} className="text-center text-xs font-semibold text-muted-foreground">
                {d.label}
              </div>
            ))}
          </div>

          {/* Filas por hora */}
          <div className="space-y-1.5">
            {agenda.timeRows.map((t) => (
              <div
                key={t}
                className="grid items-center gap-1.5"
                style={{ gridTemplateColumns: `3rem repeat(${agenda.days.length}, minmax(4.5rem, 1fr))` }}
              >
                <div className="text-right text-[11px] font-medium text-muted-foreground">
                  {timeLabel(t)}
                </div>
                {agenda.days.map((d) => {
                  const cell = agenda.cells[`${d.key}|${t}`];
                  if (!cell) {
                    return <div key={d.key} className="h-9 rounded-lg bg-transparent" />;
                  }
                  const tappable = cell.state === "libre" || cell.state === "bloq";
                  return (
                    <button
                      key={d.key}
                      onClick={() => handleTap(cell)}
                      disabled={!tappable && cell.state !== "cita" && cell.state !== "pendiente"}
                      className={`flex h-9 items-center justify-center gap-0.5 rounded-lg border px-1 text-[11px] font-medium leading-tight transition-colors ${CHIP[cell.state]}`}
                      title={cell.label}
                    >
                      {cell.state === "libre" && <span>Libre</span>}
                      {cell.state === "bloq" && <span>Bloq</span>}
                      {(cell.state === "cita" || cell.state === "pendiente") && (
                        <span className="truncate">{cell.label}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Leyenda */}
          <div className="mt-3 flex flex-wrap items-center gap-3 px-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded border border-emerald-200 bg-emerald-50" /> Libre <Lock className="h-3 w-3" /></span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-muted" /> Bloqueado <Unlock className="h-3 w-3" /></span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded border border-blue-200 bg-blue-50" /> Cita</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded border border-amber-200 bg-amber-50" /> Pendiente</span>
          </div>
        </div>
      )}
    </div>
  );
}
