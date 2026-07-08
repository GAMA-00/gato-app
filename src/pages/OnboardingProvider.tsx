import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, Loader2, Copy, Share2, ChevronRight, ChevronDown, Plus, Trash2, Upload, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CantonSelector } from "@/components/geo/CantonSelector";
import { useProvincias } from "@/hooks/useGeografia";
import { uploadGalleryImages } from "@/utils/uploadService";

const db = supabase as any;
const DAYS = [
  { idx: 1, label: "Lunes" }, { idx: 2, label: "Martes" }, { idx: 3, label: "Miércoles" },
  { idx: 4, label: "Jueves" }, { idx: 5, label: "Viernes" }, { idx: 6, label: "Sábado" }, { idx: 0, label: "Domingo" },
];
const DURATIONS = [
  { v: 30, l: "30 min" }, { v: 60, l: "1 h" }, { v: 90, l: "1 h 30" }, { v: 120, l: "2 h" },
  { v: 150, l: "2 h 30" }, { v: 180, l: "3 h" }, { v: 210, l: "3 h 30" }, { v: 240, l: "4 h" }, { v: 300, l: "más de 4 h" },
];
const NOTICE_OPTIONS = [
  { v: 0, l: "Sin antelación mínima" },
  { v: 1, l: "1 hora" },
  { v: 2, l: "2 horas" },
  { v: 4, l: "4 horas" },
  { v: 12, l: "12 horas" },
  { v: 24, l: "1 día" },
  { v: 48, l: "2 días" },
  { v: 72, l: "3 días" },
];

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

  // Paso 1 — Sobre vos
  const [name, setName] = useState(user?.name ?? "");
  const [serviceTypeId, setServiceTypeId] = useState<string>("");
  const [aboutMe, setAboutMe] = useState("");
  const [requirements, setRequirements] = useState("");
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [minNoticeHours, setMinNoticeHours] = useState(0);

  // Paso 2 — Cantón
  const [cantonBase, setCantonBase] = useState<number | null>(null);

  // Paso 3 — Catálogo
  const [svcs, setSvcs] = useState([{ title: "", price: "", duration: 180 }]);

  // Paso 4 — Horarios
  const [days, setDays] = useState<Record<number, { on: boolean; start: string; end: string }>>(
    () => Object.fromEntries(DAYS.map((d) => [d.idx, { on: d.idx >= 1 && d.idx <= 5, start: "08:00", end: "18:00" }])),
  );

  // Paso 5 — Zonas
  const [workCantones, setWorkCantones] = useState<number[]>([]);
  const [expandedProv, setExpandedProv] = useState<number | null>(null);

  const { data: serviceTypes = [] } = useQuery({
    queryKey: ["service-types"],
    queryFn: async () =>
      (await db.from("service_types").select("id, name, service_categories(id, name, label)").order("name")).data ?? [],
  });
  const { data: provincias = [] } = useProvincias();
  const { data: allCantones = [] } = useQuery({
    queryKey: ["cantones-all"],
    queryFn: async () => (await db.from("cantones").select("id, nombre, provincia_id").order("nombre")).data ?? [],
  });

  const selectedTypeName = useMemo(
    () => serviceTypes.find((t: any) => t.id === serviceTypeId)?.name as string | undefined,
    [serviceTypes, serviceTypeId],
  );
  useEffect(() => {
    if (selectedTypeName && SUGGEST[selectedTypeName] && !svcs[0].title) {
      const s = SUGGEST[selectedTypeName];
      setSvcs([{ title: s.title, price: String(s.price), duration: s.duration }]);
    }
  }, [selectedTypeName]); // eslint-disable-line

  useEffect(() => {
    if (!user?.id) return;
    db.from("listings").select("id").eq("provider_id", user.id).maybeSingle().then(({ data }: any) => {
      if (data) navigate("/dashboard", { replace: true });
    });
  }, [user?.id]); // eslint-disable-line

  // Gallery file management
  const addGalleryFiles = (files: File[]) => {
    const newFiles = [...galleryFiles, ...files];
    const newPreviews = [...galleryPreviews, ...files.map((f) => URL.createObjectURL(f))];
    setGalleryFiles(newFiles);
    setGalleryPreviews(newPreviews);
  };
  const removeGalleryFile = (i: number) => {
    URL.revokeObjectURL(galleryPreviews[i]);
    setGalleryFiles((prev) => prev.filter((_, idx) => idx !== i));
    setGalleryPreviews((prev) => prev.filter((_, idx) => idx !== i));
  };

  const updateSvc = (i: number, field: string, value: string | number) =>
    setSvcs((prev) => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  const addSvc = () => setSvcs((prev) => [...prev, { title: "", price: "", duration: 60 }]);
  const removeSvc = (i: number) => setSvcs((prev) => prev.filter((_, idx) => idx !== i));

  const toggleZona = (id: number) =>
    setWorkCantones((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleProvincia = (provId: number) => {
    const ids = allCantones.filter((c: any) => c.provincia_id === provId).map((c: any) => c.id);
    const allSel = ids.every((id: number) => workCantones.includes(id));
    setWorkCantones((prev) => allSel ? prev.filter((id) => !ids.includes(id)) : Array.from(new Set([...prev, ...ids])));
  };
  const provinciaFullySelected = (provId: number) => {
    const ids = allCantones.filter((c: any) => c.provincia_id === provId).map((c: any) => c.id);
    return ids.length > 0 && ids.every((id: number) => workCantones.includes(id));
  };
  const provinciaPartiallySelected = (provId: number) => {
    const ids = allCantones.filter((c: any) => c.provincia_id === provId).map((c: any) => c.id);
    return ids.some((id: number) => workCantones.includes(id)) && !ids.every((id: number) => workCantones.includes(id));
  };

  const finish = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      // 1) Perfil de usuario (el cliente Supabase no lanza: verificar error)
      const { error: userErr } = await db.from("users").update({
        name: name.trim(),
        canton_base_id: cantonBase,
        about_me: aboutMe.trim() || null,
      }).eq("id", user.id);
      if (userErr) throw userErr;

      // 2) Disponibilidad
      await db.from("provider_availability").delete().eq("provider_id", user.id);
      const availRows = DAYS.filter((d) => days[d.idx].on).map((d) => ({
        provider_id: user.id, day_of_week: d.idx, start_time: days[d.idx].start, end_time: days[d.idx].end, is_active: true,
      }));
      if (availRows.length) {
        const { error: availErr } = await db.from("provider_availability").insert(availRows);
        if (availErr) throw availErr;
      }

      // 3) Galería — subir archivos
      let galleryUrls: string[] = [];
      if (galleryFiles.length > 0) {
        galleryUrls = await uploadGalleryImages(galleryFiles, user.id);
      }

      // 4) Catálogo de servicios — UN listing con service_variants
      const validSvcs = svcs.filter((s) => s.title.trim() && Number(s.price) > 0);
      if (validSvcs.length === 0) throw new Error("Agregá al menos un servicio con precio");
      const serviceVariants = validSvcs.map((s, i) => ({
        id: crypto.randomUUID ? crypto.randomUUID() : `sv-${i}`,
        name: s.title.trim(),
        price: Number(s.price),
        duration: s.duration,
      }));
      const first = serviceVariants[0];
      const { error: listingErr } = await db.from("listings").insert({
        provider_id: user.id,
        service_type_id: serviceTypeId,
        title: name.trim(),           // nombre del negocio
        description: aboutMe.trim(),
        base_price: first.price,
        duration: first.duration,
        standard_duration: first.duration,
        is_active: true,
        currency: "CRC",
        slot_size: 30,
        service_variants: serviceVariants,
        gallery_images: galleryUrls.length > 0 ? galleryUrls : null,
        slot_preferences: {
          serviceRequirements: requirements.trim() || null,
          minNoticeHours: minNoticeHours,
        },
      });
      if (listingErr) throw listingErr;

      // 5) Zonas de trabajo
      const zonas = Array.from(new Set([...(cantonBase ? [cantonBase] : []), ...workCantones]));
      if (zonas.length) {
        const { error: zonasErr } = await db.from("provider_cantones").upsert(
          zonas.map((c) => ({ provider_id: user.id, canton_id: c, accepts_requests: true })),
          { onConflict: "provider_id,canton_id" },
        );
        if (zonasErr) throw zonasErr;
      }

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
    !!serviceTypeId && !!name.trim() && !!aboutMe.trim(),
    !!cantonBase,
    svcs.some((s) => s.title.trim() && Number(s.price) > 0),
    DAYS.some((d) => days[d.idx].on),
    true,
  ];

  const titles = [
    "Cuéntanos sobre vos",
    "¿En qué cantón vivís?",
    "¿Qué servicio ofrecés?",
    "¿Cuándo trabajás?",
    "¿En qué zonas trabajás?",
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

      {/* Paso 1 — Sobre vos */}
      {step === 0 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tu nombre o el del negocio</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-12" placeholder="Ej: Juan Pérez / Limpiezas El Rey" />
          </div>

          <div className="space-y-2">
            <Label>Tipo de servicio principal</Label>
            <Select value={serviceTypeId} onValueChange={setServiceTypeId}>
              <SelectTrigger className="h-12"><SelectValue placeholder="Elegí tu servicio" /></SelectTrigger>
              <SelectContent>
                {(() => {
                  const cats = new Map<string, { label: string; types: any[] }>();
                  for (const t of serviceTypes) {
                    const cat = (t as any).service_categories;
                    const key = cat?.name ?? "other";
                    const label = cat?.label ?? "Otros";
                    if (!cats.has(key)) cats.set(key, { label, types: [] });
                    cats.get(key)!.types.push(t);
                  }
                  return Array.from(cats.entries()).map(([key, { label, types }]) => (
                    <SelectGroup key={key}>
                      <SelectLabel>{label}</SelectLabel>
                      {types.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectGroup>
                  ));
                })()}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Descripción de vos o tu servicio <span className="text-destructive">*</span></Label>
            <Textarea
              value={aboutMe}
              onChange={(e) => setAboutMe(e.target.value)}
              placeholder="Ej: Soy profesional con 5 años de experiencia en lavado de carros a domicilio, especializado en vehículos de lujo."
              maxLength={300}
              className="min-h-[90px]"
            />
            <p className="text-xs text-muted-foreground text-right">{aboutMe.length}/300</p>
          </div>

          <div className="space-y-2">
            <Label>Requerimientos para el servicio <span className="text-muted-foreground text-xs">(opcional)</span></Label>
            <Textarea
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder="Ej: Acceso a toma de agua, área techada, espacio para parquear..."
              maxLength={300}
              className="min-h-[70px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Antelación mínima para reservar</Label>
            <Select value={String(minNoticeHours)} onValueChange={(v) => setMinNoticeHours(Number(v))}>
              <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
              <SelectContent>
                {NOTICE_OPTIONS.map((o) => <SelectItem key={o.v} value={String(o.v)}>{o.l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Imágenes para tu galería <span className="text-muted-foreground text-xs">(opcional)</span></Label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-border p-3 hover:border-primary hover:bg-primary/5 transition-colors">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Subir fotos de trabajos anteriores</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addGalleryFiles(Array.from(e.target.files));
                  e.target.value = "";
                }}
              />
            </label>
            {galleryPreviews.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {galleryPreviews.map((url, i) => (
                  <div key={i} className="relative">
                    <img src={url} alt="" className="h-20 w-20 rounded-lg object-cover" />
                    <button
                      type="button"
                      onClick={() => removeGalleryFile(i)}
                      className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white text-xs shadow"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Paso 2 — Cantón */}
      {step === 1 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Usamos esto para calcular distancias — no publicamos tu dirección exacta.</p>
          <CantonSelector value={cantonBase} onChange={setCantonBase} />
        </div>
      )}

      {/* Paso 3 — Catálogo */}
      {step === 2 && (
        <div className="space-y-3">
          {svcs.map((s, i) => (
            <div key={i} className="rounded-xl border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-foreground">Servicio {i + 1}</span>
                {svcs.length > 1 && (
                  <button onClick={() => removeSvc(i)} className="text-destructive hover:opacity-70 transition-opacity">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={s.title}
                  onChange={(e) => updateSvc(i, "title", e.target.value)}
                  className="h-12"
                  placeholder="Limpieza general"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Precio (₡)</Label>
                  <Input
                    inputMode="numeric"
                    value={s.price}
                    onChange={(e) => updateSvc(i, "price", e.target.value.replace(/\D/g, ""))}
                    className="h-12"
                    placeholder="25000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duración</Label>
                  <Select value={String(s.duration)} onValueChange={(v) => updateSvc(i, "duration", Number(v))}>
                    <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                    <SelectContent>{DURATIONS.map((d) => <SelectItem key={d.v} value={String(d.v)}>{d.l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={addSvc}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/40 py-3 text-sm font-medium text-primary hover:border-primary hover:bg-primary/5 transition-colors"
          >
            <Plus className="h-4 w-4" /> Agregar otro servicio
          </button>
        </div>
      )}

      {/* Paso 4 — Horarios */}
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

      {/* Paso 5 — Zonas */}
      {step === 4 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Ayuda a que clientes cercanos te encuentren. Tu cantón base ya está incluido.</p>
          {workCantones.length > 0 && (
            <p className="text-xs font-medium text-primary">{workCantones.length} cantón(es) seleccionado(s)</p>
          )}
          <div className="space-y-1.5">
            {provincias.map((p: any) => {
              const cantonesOfProv = allCantones.filter((c: any) => c.provincia_id === p.id);
              const fullySel = provinciaFullySelected(p.id);
              const partiallySel = provinciaPartiallySelected(p.id);
              const isExpanded = expandedProv === p.id;
              return (
                <div key={p.id} className="overflow-hidden rounded-xl border">
                  <div className="flex items-center gap-2 p-3">
                    <button
                      onClick={() => toggleProvincia(p.id)}
                      className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-colors ${
                        fullySel ? "border-primary bg-primary text-white" : partiallySel ? "border-primary bg-primary/20" : "border-muted-foreground"
                      }`}
                    >
                      {fullySel && <Check className="h-3 w-3" />}
                      {partiallySel && <span className="h-2 w-2 rounded-sm bg-primary" />}
                    </button>
                    <button
                      className="flex flex-1 items-center justify-between text-left"
                      onClick={() => setExpandedProv(isExpanded ? null : p.id)}
                    >
                      <span className="text-sm font-semibold">{p.nombre}</span>
                      <div className="flex items-center gap-1.5">
                        {partiallySel && (
                          <span className="text-xs text-muted-foreground">
                            {cantonesOfProv.filter((c: any) => workCantones.includes(c.id)).length}/{cantonesOfProv.length}
                          </span>
                        )}
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </div>
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="border-t bg-muted/30 px-3 pb-3 pt-2">
                      <div className="flex flex-wrap gap-1.5">
                        {cantonesOfProv.map((c: any) => (
                          <button
                            key={c.id}
                            onClick={() => toggleZona(c.id)}
                            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                              workCantones.includes(c.id) ? "border-primary bg-primary/10 text-primary" : "border-border bg-background"
                            }`}
                          >
                            {c.nombre}{workCantones.includes(c.id) && " ✓"}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Botón siguiente / finalizar */}
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

      {/* Paso final — Listo */}
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
