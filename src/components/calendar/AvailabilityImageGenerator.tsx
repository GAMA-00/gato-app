import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ImageDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type AgendaWeek } from "@/hooks/useProviderAgendaWeek";

interface Props {
  agenda: AgendaWeek;
  weekStart: Date;
}

// Convert consecutive "libre" slots into human-readable ranges per day
function buildRanges(agenda: AgendaWeek) {
  function timeLabel(hhmm: string) {
    const [h, m] = hhmm.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, "0")} ${period}`;
  }

  const SLOT_MIN = 30;

  return agenda.days.map((day) => {
    const freeSlots = agenda.timeRows.filter(
      (t) => agenda.cells[`${day.key}|${t}`]?.state === "libre"
    );

    const ranges: { start: string; end: string }[] = [];
    let rangeStart: string | null = null;
    let prev: string | null = null;

    for (const t of freeSlots) {
      if (!rangeStart) {
        rangeStart = t;
        prev = t;
        continue;
      }
      const [ph, pm] = prev!.split(":").map(Number);
      const [th, tm] = t.split(":").map(Number);
      const prevMin = ph * 60 + pm;
      const curMin = th * 60 + tm;
      if (curMin - prevMin === SLOT_MIN) {
        prev = t;
      } else {
        // Close range
        const [eh, em] = prev!.split(":").map(Number);
        const endMin = eh * 60 + em + SLOT_MIN;
        const endHH = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;
        ranges.push({ start: rangeStart, end: endHH });
        rangeStart = t;
        prev = t;
      }
    }
    if (rangeStart && prev) {
      const [eh, em] = prev.split(":").map(Number);
      const endMin = eh * 60 + em + SLOT_MIN;
      const endHH = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;
      ranges.push({ start: rangeStart, end: endHH });
    }

    return {
      dayLabel: format(day.date, "EEEE d", { locale: es }),
      ranges: ranges.map((r) => `${timeLabel(r.start)} – ${timeLabel(r.end)}`),
    };
  }).filter((d) => d.ranges.length > 0);
}

export default function AvailabilityImageGenerator({ agenda, weekStart }: Props) {
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    setGenerating(true);
    try {
      const days = buildRanges(agenda);

      // ── Layout constants — formato vertical (móvil) ───────────────────
      const W = 540;
      const PADDING = 36;
      const HEADER_H = 110;
      const DAY_TITLE_H = 40;
      const RANGE_H = 34;
      const DAY_GAP = 12;
      const FOOTER_H = 72;

      // Una sola columna — todas las tarjetas apiladas verticalmente
      const COL_W = W - PADDING * 2;
      let bodyH = 0;
      for (const day of days) {
        bodyH += DAY_TITLE_H + day.ranges.length * RANGE_H + 20 + DAY_GAP;
      }
      const H = HEADER_H + bodyH + FOOTER_H + PADDING;

      const canvas = document.createElement("canvas");
      canvas.width = W * 2;   // retina
      canvas.height = H * 2;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(2, 2);

      // ── Background ────────────────────────────────────────────────────
      ctx.fillStyle = "#FAFAF9";
      ctx.fillRect(0, 0, W, H);

      // ── Orange header bar ─────────────────────────────────────────────
      const PRIMARY = "#E07250";
      ctx.fillStyle = PRIMARY;
      roundRect(ctx, 0, 0, W, HEADER_H, { tl: 0, tr: 0, br: 0, bl: 0 });

      ctx.fillStyle = "#fff";
      ctx.font = "bold 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      ctx.textBaseline = "middle";
      ctx.fillText("Mi disponibilidad", PADDING, 38);

      ctx.font = "16px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.88)";
      const weekLabel = `Semana del ${format(weekStart, "d 'de' MMMM yyyy", { locale: es })}`;
      ctx.fillText(weekLabel, PADDING, 68);

      // ── Day cards — columna única ──────────────────────────────────────
      let y = HEADER_H + DAY_GAP;
      const x = PADDING;

      for (const day of days) {
        const cardH = DAY_TITLE_H + day.ranges.length * RANGE_H + 20;

        // Card bg
        ctx.fillStyle = "#fff";
        roundRect(ctx, x, y, COL_W, cardH, 14);
        // Card border
        ctx.strokeStyle = "#E8E5E1";
        ctx.lineWidth = 1;
        roundRect(ctx, x, y, COL_W, cardH, 14, true);

        // Day title
        ctx.fillStyle = "#1C1917";
        ctx.font = "bold 15px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
        ctx.textBaseline = "top";
        const dayTitle = day.dayLabel.charAt(0).toUpperCase() + day.dayLabel.slice(1);
        ctx.fillText(dayTitle, x + 18, y + 13);

        // Divider line
        ctx.strokeStyle = "#F0EDE9";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 18, y + DAY_TITLE_H - 2);
        ctx.lineTo(x + COL_W - 18, y + DAY_TITLE_H - 2);
        ctx.stroke();

        // Ranges
        day.ranges.forEach((range, ri) => {
          const ry = y + DAY_TITLE_H + ri * RANGE_H + 6;

          // Pill bg
          ctx.fillStyle = "#ECFDF5";
          roundRect(ctx, x + 14, ry, COL_W - 28, 26, 7);

          // Dot
          ctx.fillStyle = "#10B981";
          ctx.beginPath();
          ctx.arc(x + 28, ry + 13, 4, 0, Math.PI * 2);
          ctx.fill();

          // Range text
          ctx.fillStyle = "#065F46";
          ctx.font = "13px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
          ctx.textBaseline = "middle";
          ctx.fillText(range, x + 40, ry + 13);
        });

        y += cardH + DAY_GAP;
      }

      // ── Footer ────────────────────────────────────────────────────────
      const footerY = H - FOOTER_H;
      ctx.strokeStyle = "#E8E5E1";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PADDING, footerY);
      ctx.lineTo(W - PADDING, footerY);
      ctx.stroke();

      // Load and draw logo
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const logoH = 32;
          const logoW = logoH * (img.naturalWidth / img.naturalHeight);
          ctx.drawImage(img, PADDING, footerY + (FOOTER_H - logoH) / 2, logoW, logoH);
          // Tagline
          ctx.fillStyle = "#A8A29E";
          ctx.font = "12px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
          ctx.textBaseline = "middle";
          ctx.fillText("gato.app · Servicios a domicilio", PADDING + logoW + 12, footerY + FOOTER_H / 2);
          resolve();
        };
        img.onerror = () => {
          // Fallback: text logo
          ctx.fillStyle = PRIMARY;
          ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
          ctx.textBaseline = "middle";
          ctx.fillText("gato", PADDING, footerY + FOOTER_H / 2);
          ctx.fillStyle = "#A8A29E";
          ctx.font = "12px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
          ctx.fillText("gato.app · Servicios a domicilio", PADDING + 48, footerY + FOOTER_H / 2);
          resolve();
        };
        img.src = "/gato-logo.png";
      });

      // ── Download ──────────────────────────────────────────────────────
      const filename = `disponibilidad-${format(weekStart, "dd-MMM-yyyy", { locale: es })}.png`;
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }, "image/png");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button
      onClick={generate}
      disabled={generating || agenda.timeRows.length === 0}
      className="flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-2 text-sm font-medium text-white hover:bg-white/30 active:bg-white/40 disabled:opacity-40 transition-colors"
    >
      {generating ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <ImageDown className="h-3.5 w-3.5" />
      )}
      <span>Compartir</span>
    </button>
  );
}

// Canvas rounded rect helper
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  r: number | { tl: number; tr: number; br: number; bl: number } = 0,
  stroke = false
) {
  const rad = typeof r === "number" ? { tl: r, tr: r, br: r, bl: r } : r;
  ctx.beginPath();
  ctx.moveTo(x + rad.tl, y);
  ctx.lineTo(x + w - rad.tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad.tr);
  ctx.lineTo(x + w, y + h - rad.br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad.br, y + h);
  ctx.lineTo(x + rad.bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad.bl);
  ctx.lineTo(x, y + rad.tl);
  ctx.quadraticCurveTo(x, y, x + rad.tl, y);
  ctx.closePath();
  if (stroke) ctx.stroke(); else ctx.fill();
}
