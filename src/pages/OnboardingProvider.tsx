import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, Loader2, Copy, Share2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CantonSelector } from "@/components/geo/CantonSelector";
import { useProvincias, useCantones } from "@/hooks/useGeografia";

const db = supabase as any;
const DAYS = [
  { idx: 1, label: "Lunes" }, { idx: 2, label: "Martes" }, { idx: 3, label: "Miércoles" },
  { idx: 4, label: "Jueves" }, { idx: 5, label: "Viernes" }, { idx: 6, label: "Sábado" }, { idx: 0, label: "Domingo" },
];
const DURATIONS = [
  { v: 30, l: "30 min" }, { v: 60, l: "1 h" }, { v: 90, l: "1 h 30" }, { v: 120, l: "2 h" },
  { v: 150, l: "2 h 30" }, { v: 180, l: "3 h" }, { v: 210, l: "3 h 30" }, { v: 240, l: "4 h" }, { v: 300, l: "más de 4 h" },
];
// Sugerencia por tipo de servicio
const SUGGEST: Record<string, { title: string; price: number; duration: number }> = {
  "Limpieza del hogar": { title: "Limpieza general", price: 25000, duration: 180 },
  "Fisioterapia / masajes": { title: "Sesión de fisioterapia", price: 35000, duration: 60 },
  "Lavado de carros": { title: "Lavado completo", price: 8000, duration: 60 },
  "Belleza a domicilio": { title: "Servicio de belleza", price: 15000, duration: 90 },
  "Jardinería": { title: "Mantenimiento de jardín", price: 20000, duration: 120 },
};

export default function OnboardingProvider() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [slug, setSlug] = useState<string | null>(null);

  // datos del wizard
  const [name, setName] = useState(user?.name ?? "");
  const [serviceTypeId, setServiceTypeId] = useState<string>("");
  const [cantonBase, setCantonBase] = useState<number | null>(null);
  const [svc, setSvc] = useState({ title: "", price: "", duration: 180 });
  const [days, setDays] = useState<Record<number, { on: boolean; start: string; end: string }>>(
    () => Object.fromEntries(DAYS.map((d) => [d.idx, { on: d.idx >= 1 && d.idx <= 5, start: "08:00", end: "18:00" }])),
  );
  const [workCantones, setWorkCantones] = useState<number[]>([]);
  const [zonaProv, setZonaProv] = useState<number | undefined>(undefined);

  const { data: serviceTypes = [] } = useQuery({
    queryKey: ["service-types"],
    queryFn: async () => (await db.from("service_types").select("id, name").order("name")).data ?? [],
  });
  const { data: provincias = [] } = useProvincias();
  const { data: zonaCantones = [] } = useCantones(zonaProv);

  // prefill catálogo según tipo
  const selectedTypeName = useMemo(
    () => serviceTypes.find((t: any) => t.id === serviceTypeId)?.name as string | undefined,
    [serviceTypes, serviceTypeId],
  );
  useEffect(() => {
    if (selectedTypeName && SUGGEST[selectedTypeName] && !svc.title) {
      const s = SUGGEST[selectedTypeName];
      setSvc({ title: s.title, price: String(s.price), duration: s.duration });
    }
  }, [selectedTypeName]); // eslint-disable-line

  // si ya tiene listing, no debería estar acá
  useEffect(() => {
    if (!user?.id) return;
    db.from("listings").select("id").eq("provider_id", user.id).maybeSingle().then(({ data }: any) => {
      if (data) navigate("/dashboard", { replace: true });
    });
  }, [user?.id]); // eslint-disable-line

  const toggleZona = (id: number) =>
    setWorkCantones((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const finish = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      // 1) perfil: nombre + cantón base
      await db.from("users").update({ name: name.trim(), canton_base_id: cantonBase }).eq("id", user.id);

      // 2) disponibilidad (ANTES del listing → los slots se generan con el trigger)
      await db.from("provider_availability").delete().eq("provider_id", user.id);
      const availRows = DAYS.filter((d) => days[d.idx].on).map((d) => ({
        provider_id: user.id, day_of_week: d.idx, start_time: days[d.idx].start, end_time: days[d.idx].end, is_active: true,
      }));
      if (availRows.length) await db.from("provider_availability").insert(availRows);

      // 3) catálogo (1 servicio) → dispara generación de slots
      await db.from("listings").insert({
        provider_id: user.id, service_type_id: serviceTypeId,
        title: svc.title.trim(), description: svc.title.trim(),
        base_price: Number(svc.price) || 0, duration: svc.duration, standard_duration: svc.duration,
        is_active: true, currency: "CRC", slot_size: 30,
      });

      // 4) zonas de trabajo (+ cantón base)
      const zonas = Array.from(new Set([...(cantonBase ? [cantonBase] : []), ...workCantones]));
      if (zonas.length) {
        await db.from("provider_cantones").upsert(
          zonas.map((c) => ({ provider_id: user.id, canton_id: c, accepts_requests: true })),
          { onConflict: "provider_id,canton_id" },
        );
      }

      // 5) slug (lo generó el trigger al registrarse)
      const { data: u } = await db.from("users").select("slug").eq("id", user.id).single();
      setSlug(u?.slug ?? null);
      setStep(5);
    } catch (e: any) {
      toast.error("Error guardando: " + (e.message ?? "intentá de nuevo"));
    } finally {
      setSaving(false);
    }
  };

  const link = slug ? `${window.location.origin}/${slug}` : "";
  const canNext = [
    !!serviceTypeId && !!name.trim(),
    !!cantonBase,
    !!svc.title.trim() && Number(svc.price) > 0,
    DAYS.some((d) => days[d.idx].on),
    true,
  ];

  const titles = [
    "Cuéntanos sobre vos", "¿En qué cantón vivís?", "¿Qué servicio ofrecés?",
    "¿Cuándo trabajás?", "¿En qué zonas trabajás?",
  ];

  return (
    <div className="mx-auto min-h-screen max-w-md px-4 py-6">
      {step < 5 && (
        <>
          <div className="mb-4 flex items-center gap-3">
            {step > 0 && (
              <button onClick={() => setStep((s) => s - 1)} className="text-muted-foreground">
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <div className="flex-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all" style={{ width: `${((step + 1) / 5) * 100}%` }} />
              </div>
            </div>
            <span className="text-xs text-muted-foreground">{step + 1}/5</span>
          </div>
          <h1 className="mb-5 text-2xl font-bold">{titles[step]}</h1>
        </>
      )}

      {/* O-2 */}
      {step === 0 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tu nombre o el del negocio</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-12" />
          </div>
          <div className="space-y-2">
            <Label>Tipo de servicio principal</Label>
            <Select value={serviceTypeId} onValueChange={setServiceTypeId}>
              <SelectTrigger className="h-12"><SelectValue placeholder="Elegí tu servicio" /></SelectTrigger>
              <SelectContent>
                {serviceTypes.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* O-3 */}
      {step === 1 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Usamos esto para calcular distancias — no publicamos tu dirección exacta.</p>
          <CantonSelector value={cantonBase} onChange={setCantonBase} />
        </div>
      )}

      {/* O-4 */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre del servicio</Label>
            <Input value={svc.title} onChange={(e) => setSvc({ ...svc, title: e.target.value })} className="h-12" placeholder="Limpieza general" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Precio (₡)</Label>
              <Input inputMode="numeric" value={svc.price} onChange={(e) => setSvc({ ...svc, price: e.target.value.replace(/\D/g, "") })} className="h-12" placeholder="25000" />
            </div>
            <div className="space-y-2">
              <Label>Duración</Label>
              <Select value={String(svc.duration)} onValueChange={(v) => setSvc({ ...svc, duration: Number(v) })}>
                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                <SelectContent>{DURATIONS.map((d) => <SelectItem key={d.v} value={String(d.v)}>{d.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* O-5 */}
      {step === 3 && (
        <div className="space-y-2">
          {DAYS.map((d) => {
            const day = days[d.idx];
            return (
              <div key={d.idx} className="flex items-center gap-2 rounded-lg border p-2">
                <button
                  onClick={() => setDays({ ...days, [d.idx]: { ...day, on: !day.on } })}
                  className={`flex h-7 w-12 items-center rounded-full px-0.5 transition-colors ${day.on ? "bg-primary" : "bg-muted"}`}
                >
                  <span className={`h-6 w-6 rounded-full bg-white shadow transition-transform ${day.on ? "translate-x-5" : ""}`} />
                </button>
                <span className="w-20 text-sm font-medium">{d.label}</span>
                {day.on ? (
                  <div className="flex flex-1 items-center justify-end gap-1">
                    <Input type="time" value={day.start} onChange={(e) => setDays({ ...days, [d.idx]: { ...day, start: e.target.value } })} className="h-9 w-[6.5rem]" />
                    <span className="text-muted-foreground">a</span>
                    <Input type="time" value={day.end} onChange={(e) => setDays({ ...days, [d.idx]: { ...day, end: e.target.value } })} className="h-9 w-[6.5rem]" />
                  </div>
                ) : <span className="flex-1 text-right text-xs text-muted-foreground">Cerrado</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* O-6 */}
      {step === 4 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Ayuda a que clientes cercanos te encuentren. Tu cantón base ya está incluido.</p>
          <Select value={zonaProv ? String(zonaProv) : undefined} onValueChange={(v) => setZonaProv(Number(v))}>
            <SelectTrigger className="h-12"><SelectValue placeholder="Elegí una provincia" /></SelectTrigger>
            <SelectContent>{provincias.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.nombre}</SelectItem>)}</SelectContent>
          </Select>
          {zonaProv && (
            <div className="flex flex-wrap gap-1.5">
              {zonaCantones.map((c) => (
                <button
                  key={c.id}
                  onClick={() => toggleZona(c.id)}
                  className={`rounded-full border px-3 py-1.5 text-sm ${workCantones.includes(c.id) ? "border-primary bg-primary/10 text-primary" : "bg-background"}`}
                >
                  {c.nombre}{workCantones.includes(c.id) && " ✓"}
                </button>
              ))}
            </div>
          )}
          {workCantones.length > 0 && <p className="text-xs text-muted-foreground">{workCantones.length} cantón(es) seleccionado(s)</p>}
        </div>
      )}

      {/* botón siguiente / finalizar */}
      {step < 5 && (
        <div className="mt-6">
          {step < 4 ? (
            <Button className="h-12 w-full" disabled={!canNext[step]} onClick={() => setStep((s) => s + 1)}>
              Siguiente <ChevronRight className="ml-1 h-5 w-5" />
            </Button>
          ) : (
            <Button className="h-12 w-full" disabled={saving} onClick={finish}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              ¡Crear mi cuenta!
            </Button>
          )}
          {step === 4 && (
            <button onClick={finish} className="mt-3 block w-full text-center text-sm text-muted-foreground">
              Saltar zonas por ahora
            </button>
          )}
        </div>
      )}

      {/* O-7 */}
      {step === 5 && (
        <div className="space-y-6 pt-10 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
            <Check className="h-10 w-10 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">¡Tu cuenta está lista!</h1>
            <p className="mt-1 text-sm text-muted-foreground">Compartí tu link para que te agenden.</p>
          </div>
          <div className="rounded-xl border bg-muted/40 p-3 text-sm font-medium break-all">{link}</div>
          <div className="space-y-2">
            <Button
              className="h-12 w-full"
              onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Hola, podés agendar tu cita aquí: ${link}`)}`, "_blank")}
            >
              <Share2 className="mr-2 h-4 w-4" /> Compartir por WhatsApp
            </Button>
            <Button variant="outline" className="h-12 w-full" onClick={() => { navigator.clipboard.writeText(link); toast.success("Link copiado"); }}>
              <Copy className="mr-2 h-4 w-4" /> Copiar link
            </Button>
            <button onClick={() => navigate("/dashboard")} className="block w-full pt-2 text-sm text-primary">
              Ver mi agenda →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
