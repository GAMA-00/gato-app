import { useState, useMemo } from "react";
import { getThemeGradient } from "@/utils/coverThemes";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatInTimeZone } from "date-fns-tz";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MapPin, Calendar, Check, Loader2, Star, ArrowLeft, Clock, Sparkles, Award, ChevronRight, Plus, Minus, ShoppingBag } from "lucide-react";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CantonSelector } from "@/components/geo/CantonSelector";
import LocationMap from "@/components/geo/LocationMap";
import {
  usePublicProvider,
  usePublicListings,
  type PublicListing,
} from "@/hooks/usePublicProvider";
import { usePublicSlots, groupSlotsByDay, filterConsecutiveSlots, type PublicSlot } from "@/hooks/usePublicSlots";
import ZoneSurchargeNotice from "@/components/booking/ZoneSurchargeNotice";
import { notifySolicitudReserva } from "@/utils/whatsappNotify";
import {
  usePublicProximity,
  applyProximityDiscount,
  type ProximityData,
} from "@/hooks/usePublicProximity";

const TZ = "America/Costa_Rica";
const db = supabase as any;

type Step = "profile" | "location" | "service" | "datetime" | "datos" | "done";

// Carrito de servicios seleccionados
type CartItem = { listing: PublicListing; qty: number };

const colones = (n: number | null | undefined) =>
  n == null ? "" : `₡${n.toLocaleString("es-CR")}`;

export default function PublicBooking() {
  const { slug } = useParams<{ slug: string }>();
  const { data: provider, isLoading, error } = usePublicProvider(slug);
  const { data: listings = [] } = usePublicListings(provider?.id);

  const [step, setStep] = useState<Step>("profile");
  const [cantonId, setCantonId] = useState<number | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationMode, setLocationMode] = useState<"gps" | "map" | null>(null);
  const [addr, setAddr] = useState({ residencial: "", casa: "", referencias: "" });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [slot, setSlot] = useState<PublicSlot | null>(null);
  const [datos, setDatos] = useState({ nombre: "", whatsapp: "", notas: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Servicio primario (primero del carrito) para compatibilidad con hooks existentes
  const primaryService = cart[0]?.listing ?? null;
  const totalDuration = cart.reduce((sum, item) => sum + (item.listing.duration ?? 0) * item.qty, 0);
  const totalPrice = cart.reduce((sum, item) => sum + (item.listing.base_price ?? 0) * item.qty, 0);

  const { data: proximity } = usePublicProximity(provider?.id, primaryService?.listing_id, cantonId);

  // IDs de cantones cubiertos por el proveedor
  const { data: coveredCantonIds = [] } = useQuery({
    queryKey: ["public-provider-covered-cantons", provider?.id],
    enabled: !!provider?.id,
    queryFn: async (): Promise<number[]> => {
      const { data } = await db
        .from("provider_cantones")
        .select("canton_id")
        .eq("provider_id", provider!.id);
      return (data ?? []).map((r: any) => r.canton_id);
    },
  });
  const cantonCovered = cantonId == null ? null : coveredCantonIds.includes(cantonId);

  // ¿El slot elegido es recomendado por proximidad?
  const selectedIsRecommended = !!(
    slot && proximity?.recommendedEpochs.has(new Date(slot.slot_datetime_start).getTime())
  );
  // Precio efectivo del servicio primario (con descuento si aplica)
  const effectivePrimaryPrice =
    selectedIsRecommended && proximity
      ? applyProximityDiscount(primaryService?.base_price, proximity.settings)
      : primaryService?.base_price ?? null;
  const baseTotal = cart.reduce((sum, item) => {
    const price = item.listing.listing_id === primaryService?.listing_id && effectivePrimaryPrice != null
      ? effectivePrimaryPrice : (item.listing.base_price ?? 0);
    return sum + price * item.qty;
  }, 0);
  const transportSurchargePct = slot?.transport_surcharge_pct ?? 0;
  const transportSurchargeAmount = transportSurchargePct > 0 ? Math.round(baseTotal * transportSurchargePct / 100) : 0;
  const effectiveTotal = baseTotal + transportSurchargeAmount;

  if (isLoading) {
    return <Centered><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></Centered>;
  }
  if (error || !provider) {
    return (
      <Centered>
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-medium">Proveedor no encontrado</p>
          <p className="text-sm">Revisá el enlace e intentá de nuevo.</p>
        </div>
      </Centered>
    );
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}, // si niega el GPS, sigue con selección manual de cantón
    );
  };

  const handleSubmit = async () => {
    if (!primaryService || !slot || cart.length === 0) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      // end_time = start + totalDuration (para cubrir todos los slots consecutivos)
      const startMs = new Date(slot.slot_datetime_start).getTime();
      const endTime = new Date(startMs + totalDuration * 60 * 1000).toISOString();

      // Lista de servicios en las notas si hay varios
      const serviceSummary = cart.length > 1
        ? `Servicios: ${cart.map(i => `${i.listing.title}${i.qty > 1 ? ` x${i.qty}` : ""}`).join(", ")}. `
        : "";

      const { data: rpcData, error: rpcError } = await db.rpc("create_external_booking", {
        p_provider_id: provider.id,
        p_listing_id: primaryService.listing_id,
        p_start_time: slot.slot_datetime_start,
        p_end_time: endTime,
        p_client_name: datos.nombre.trim(),
        p_client_phone: datos.whatsapp.trim(),
        p_notes: (serviceSummary + datos.notas.trim()).trim(),
        p_client_address: [addr.residencial, addr.casa, addr.referencias].filter(Boolean).join(" · "),
        p_canton_id: cantonId,
        p_client_lat: coords?.lat ?? null,
        p_client_lng: coords?.lng ?? null,
        p_address_detail: {
          residencial: addr.residencial,
          house_number: addr.casa,
          referencias: addr.referencias,
        },
        p_final_price: effectiveTotal || null,
        p_total_duration: totalDuration,
        p_selected_services: {
          cart: cart.map((i) => ({
            name: i.listing.title,
            qty: i.qty,
            price: i.listing.base_price ?? 0,
            duration: i.listing.duration ?? 60,
          })),
        },
      });
      if (rpcError) throw rpcError;

      // Notificación WhatsApp al cliente (fire-and-forget, no bloquea la reserva)
      const apptId = Array.isArray(rpcData) ? rpcData[0]?.appointment_id : rpcData?.appointment_id;
      notifySolicitudReserva({
        clientPhone: datos.whatsapp.trim(),
        clientName: datos.nombre.trim(),
        providerName: provider.name ?? "tu proveedor",
        startIso: slot.slot_datetime_start,
        endIso: endTime,
        price: effectiveTotal || null,
        appointmentId: apptId,
      });

      setStep("done");
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "No se pudo enviar la solicitud");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-4 py-6 space-y-6">
        {step === "profile" && (
          <ProfileStep provider={provider} listings={listings} onStart={() => setStep("location")} />
        )}

        {step === "location" && (
          <StepShell title="¿Dónde necesitás el servicio?" onBack={() => setStep("profile")}>

            {/* Selector de modo */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setLocationMode("gps");
                  setCoords(null);
                  useMyLocation();
                }}
                className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-sm font-medium transition-colors
                  ${locationMode === "gps"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-background text-foreground hover:bg-muted/50"}`}
              >
                <MapPin className="h-6 w-6" />
                <span className="leading-tight text-center">Usar mi ubicación actual</span>
                {locationMode === "gps" && coords && (
                  <span className="text-xs text-primary font-normal">Capturada ✓</span>
                )}
              </button>
              <button
                onClick={() => {
                  setLocationMode("map");
                  setCoords(null);
                }}
                className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-sm font-medium transition-colors
                  ${locationMode === "map"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-background text-foreground hover:bg-muted/50"}`}
              >
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6-10l6-3m6 3l-5.447-2.724A1 1 0 0115 4.618v10.764a1 1 0 01-.553.894L9 20m6-16v13" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="leading-tight text-center">Seleccionar en el mapa</span>
                {locationMode === "map" && coords && (
                  <span className="text-xs text-primary font-normal">Ubicación seleccionada ✓</span>
                )}
              </button>
            </div>

            {/* Mapa — solo si eligió esa opción */}
            {locationMode === "map" && (
              <LocationMap
                initialCoords={coords}
                onLocationSelect={(c, label) => {
                  setCoords(c);
                  setAddr(prev => ({
                    ...prev,
                    referencias: prev.referencias || label.split(",").slice(0, 3).join(",").trim(),
                  }));
                }}
              />
            )}

            <CantonSelector value={cantonId} onChange={setCantonId} cantonLabel="Tu cantón" />
            {cantonId != null && cantonCovered === false && (
              <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
                <p className="font-medium">Este cantón está fuera de la zona de cobertura del proveedor.</p>
                <p className="mt-0.5 text-orange-700">Podés continuar igual y el proveedor decidirá si puede atenderte.</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="residencial">Residencial / Condominio (opcional)</Label>
              <Input id="residencial" placeholder="Ej: Residencial Los Robles" value={addr.residencial} onChange={(e) => setAddr({ ...addr, residencial: e.target.value })} className="h-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="casa">Número de casa / apartamento (opcional)</Label>
              <Input id="casa" value={addr.casa} onChange={(e) => setAddr({ ...addr, casa: e.target.value })} className="h-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ref">Referencias (opcional)</Label>
              <Input id="ref" placeholder="100m norte del super, casa color beige" value={addr.referencias} onChange={(e) => setAddr({ ...addr, referencias: e.target.value })} className="h-12" />
            </div>
            <Button className="w-full h-12" disabled={!cantonId} onClick={() => setStep("service")}>
              Siguiente →
            </Button>
          </StepShell>
        )}

        {step === "service" && (
          <ServiceStep
            listings={listings}
            cart={cart}
            onCartChange={setCart}
            onNext={() => { setSlot(null); setStep("datetime"); }}
            onBack={() => setStep("location")}
          />
        )}

        {step === "datetime" && primaryService && (
          <DateTimeStep
            providerId={provider.id}
            listingId={primaryService.listing_id}
            totalDuration={totalDuration}
            basePrice={effectivePrimaryPrice}
            minNoticeHours={primaryService.slot_preferences?.minNoticeHours ?? 0}
            cantonId={cantonId}
            proximity={proximity}
            selected={slot}
            onSelect={setSlot}
            onBack={() => setStep("service")}
            onNext={() => setStep("datos")}
          />
        )}

        {step === "datos" && (
          <StepShell title="¿Cómo te contactamos?" onBack={() => setStep("datetime")}>
            <CartSummary cart={cart} slot={slot} totalDuration={totalDuration} effectiveTotal={effectiveTotal} transportSurchargePct={transportSurchargePct} transportSurchargeAmount={transportSurchargeAmount} />
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre completo</Label>
              <Input id="nombre" value={datos.nombre} onChange={(e) => setDatos({ ...datos, nombre: e.target.value })} className="h-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wa">Número de WhatsApp 🇨🇷</Label>
              <Input id="wa" inputMode="numeric" placeholder="8888 8888" value={datos.whatsapp} onChange={(e) => setDatos({ ...datos, whatsapp: e.target.value })} className="h-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notas">Algo adicional que deba saber (opcional)</Label>
              <Textarea id="notas" maxLength={200} value={datos.notas} onChange={(e) => setDatos({ ...datos, notas: e.target.value })} />
            </div>
            {submitError && <p className="text-sm text-destructive">{submitError}</p>}
            <Button className="w-full h-12" disabled={!datos.nombre.trim() || !datos.whatsapp.trim() || submitting} onClick={handleSubmit}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Enviar solicitud
            </Button>
          </StepShell>
        )}

        {step === "done" && (
          <div className="text-center space-y-4 py-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">¡Solicitud enviada!</h1>
            <p className="text-muted-foreground">
              {provider.name} revisará tu solicitud y te confirmará por WhatsApp.
            </p>
            <CartSummary cart={cart} slot={slot} totalDuration={totalDuration} effectiveTotal={effectiveTotal} transportSurchargePct={transportSurchargePct} transportSurchargeAmount={transportSurchargeAmount} />
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- subcomponentes ----------

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-background p-4">{children}</div>;
}

function StepShell({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center text-sm text-muted-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" /> Atrás
      </button>
      <h1 className="text-xl font-bold">{title}</h1>
      {children}
    </div>
  );
}

function formatDuration(min: number | null) {
  if (!min) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h} h ${m} min`;
  if (h) return `${h} h`;
  return `${m} min`;
}

function ProfileStep({
  provider,
  listings,
  onStart,
}: {
  provider: {
    id: string;
    name: string;
    avatar_url: string | null;
    about_me: string | null;
    average_rating: number | null;
    experience_years: number | null;
    certification_files: { name: string; type: string; url: string }[] | null;
    cover_theme: string | null;
    service_type_name: string | null;
  };
  listings: PublicListing[];
  onStart: () => void;
}) {
  const { data: provNames = [] } = useQuery({
    queryKey: ["public-provider-prov-names", provider.id],
    queryFn: async (): Promise<string[]> => {
      const { data } = await (supabase as any)
        .from("provider_cantones")
        .select("cantones(provincias(nombre))")
        .eq("provider_id", provider.id);
      const names = (data ?? [])
        .map((r: any) => r.cantones?.provincias?.nombre)
        .filter(Boolean);
      return Array.from(new Set(names)) as string[];
    },
  });

  const { data: teamCount = 0 } = useQuery({
    queryKey: ["public-team-count", provider.id],
    queryFn: async (): Promise<number> => {
      const { count } = await (supabase as any)
        .from("provider_team_members")
        .select("id", { count: "exact", head: true })
        .eq("provider_id", provider.id)
        .eq("is_active", true);
      return count ?? 0;
    },
  });

  return (
    <div className="-mx-4 -mt-6 space-y-6 pb-24">
      {/* Hero con gradiente */}
      <div className="relative">
        <div className={`h-28 ${getThemeGradient(provider.cover_theme)}`} />
        <div className="px-4">
          <Avatar className="-mt-12 h-24 w-24 ring-4 ring-background shadow-md">
            <AvatarImage src={provider.avatar_url ?? undefined} />
            <AvatarFallback className="bg-primary/10 text-2xl font-semibold text-primary">
              {provider.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <h1 className="mt-3 text-2xl font-bold leading-tight">{provider.name}</h1>
          {provider.service_type_name && (
            <p className="mt-0.5 text-sm font-medium text-primary">{provider.service_type_name}</p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {provider.average_rating != null && (
              <span className="flex items-center font-medium text-foreground">
                <Star className="mr-1 h-4 w-4 fill-yellow-400 text-yellow-400" />
                {provider.average_rating.toFixed(1)}
              </span>
            )}
            {provider.experience_years ? (
              <span className="flex items-center">
                <Award className="mr-1 h-4 w-4" /> {provider.experience_years} años de experiencia
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-6 px-4">
        {provNames.length > 0 && (
          <div className="space-y-2">
            <p className="flex items-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <MapPin className="mr-1 h-3.5 w-3.5" /> Trabaja en
            </p>
            <div className="flex flex-wrap gap-1.5">
              {provNames.map((p) => (
                <span key={p} className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}

        {provider.about_me && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {teamCount > 0 ? "Sobre nosotros" : "Sobre mí"}
            </p>
            <p className="text-sm leading-relaxed text-foreground/80">{provider.about_me}</p>
          </div>
        )}

        {/* Galería de trabajos */}
        {(() => {
          // Deduplicar por listing_id para evitar duplicados cuando hay múltiples variantes del mismo listing
          const seenListingIds = new Set<string>();
          const allImages = listings.flatMap((l) => {
            if (seenListingIds.has(l.listing_id)) return [];
            seenListingIds.add(l.listing_id);
            return Array.isArray(l.gallery_images) ? l.gallery_images.filter(Boolean) : [];
          });
          if (allImages.length === 0) return null;
          return (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Trabajos anteriores
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {allImages.slice(0, 6).map((url, i) => (
                  <div key={i} className="aspect-square overflow-hidden rounded-lg bg-muted">
                    <img src={url} alt={`Trabajo ${i + 1}`} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
              {allImages.length > 6 && (
                <p className="text-xs text-muted-foreground">+{allImages.length - 6} fotos más</p>
              )}
            </div>
          );
        })()}

        {/* Certificaciones */}
        {provider.certification_files && provider.certification_files.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Certificaciones
            </p>
            <div className="space-y-1.5">
              {provider.certification_files.map((cert, i) => (
                <a
                  key={i}
                  href={cert.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-primary hover:bg-muted transition-colors"
                >
                  <Award className="h-4 w-4 shrink-0" />
                  <span className="truncate">{cert.name}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CTA fija abajo */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t bg-background/95 p-4 backdrop-blur">
        <div className="mx-auto max-w-md">
          <Button className="h-12 w-full text-base font-semibold" onClick={onStart}>
            Agendar una cita <ChevronRight className="ml-1 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Filtra los slots para que solo aparezcan inicios con `slotsNeeded` slots consecutivos libres. */

function DateTimeStep({
  providerId,
  listingId,
  totalDuration,
  basePrice,
  minNoticeHours = 0,
  cantonId,
  proximity,
  selected,
  onSelect,
  onBack,
  onNext,
}: {
  providerId: string;
  listingId: string;
  totalDuration: number;
  basePrice: number | null;
  minNoticeHours?: number;
  cantonId?: number | null;
  proximity?: ProximityData;
  selected: PublicSlot | null;
  onSelect: (s: PublicSlot) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  // 90 días para que el cliente pueda navegar meses futuros
  const { data: rawSlots = [], isLoading } = usePublicSlots(providerId, listingId, 90, minNoticeHours, cantonId);
  const slots = useMemo(() => filterConsecutiveSlots(rawSlots, totalDuration), [rawSlots, totalDuration]);
  const byDay = useMemo(() => groupSlotsByDay(slots), [slots]);
  const [day, setDay] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<Date | undefined>(undefined);

  const showRec = proximity?.settings.show_recommended_slots ?? true;
  const recommended = proximity?.recommendedEpochs ?? new Set<number>();
  const isRec = (s: PublicSlot) => showRec && recommended.has(new Date(s.slot_datetime_start).getTime());
  const discounted =
    proximity && proximity.settings.proximity_discount_enabled
      ? applyProximityDiscount(basePrice, proximity.settings)
      : null;

  const dayHasRec = (d: string) => byDay[d].some((s) => isRec(s));
  const days = Object.keys(byDay).sort();

  // Helpers fecha <-> key (tratamos las keys como fechas de calendario simples)
  const keyToDate = (k: string) => new Date(k + "T00:00:00");
  const dateToKey = (d: Date) => format(d, "yyyy-MM-dd");
  const availableSet = useMemo(() => new Set(days), [slots]);
  const recommendedDates = useMemo(
    () => days.filter(dayHasRec).map(keyToDate),
    [slots, showRec, proximity],
  );

  // Dentro del día, recomendados primero
  const slotsForDay = (d: string) =>
    [...byDay[d]].sort(
      (a, b) =>
        Number(isRec(b)) - Number(isRec(a)) ||
        a.slot_datetime_start.localeCompare(b.slot_datetime_start),
    );

  // Navega automáticamente al primer mes con disponibilidad cuando cargan los slots
  const firstAvailableDate = days.length > 0 ? keyToDate(days[0]) : undefined;
  const displayMonth = calendarMonth ?? firstAvailableDate;

  return (
    <StepShell title="¿Cuándo te queda bien?" onBack={onBack}>
      {isLoading ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Cargando horarios disponibles…</p>
        </div>
      ) : days.length === 0 ? (
        <div className="rounded-xl border border-muted bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
          <p className="font-medium">Sin disponibilidad en los próximos 3 meses</p>
          <p className="mt-1 text-xs">Escribile directo al proveedor para coordinar.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Calendario mensual con navegación entre meses */}
          <div className="flex justify-center rounded-lg border bg-card">
            <CalendarUI
              mode="single"
              selected={day ? keyToDate(day) : undefined}
              onSelect={(d) => {
                if (!d) return;
                const key = dateToKey(d);
                setDay(availableSet.has(key) ? key : null);
              }}
              month={displayMonth}
              onMonthChange={setCalendarMonth}
              fromDate={firstAvailableDate}
              toDate={keyToDate(days[days.length - 1])}
              disabled={(d) => !availableSet.has(dateToKey(d))}
              modifiers={{ recomendado: recommendedDates }}
              modifiersClassNames={{
                recomendado:
                  "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-emerald-500",
              }}
            />
          </div>

          {showRec && recommendedDates.length > 0 && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Días con horario eficiente (el proveedor ya estará en tu zona)
            </p>
          )}

          {/* Horas del día elegido, en grilla compacta */}
          {day ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {formatInTimeZone(keyToDate(day), TZ, "EEEE d 'de' LLLL", { locale: es })}
              </p>
              <ZoneSurchargeNotice
                providerId={providerId}
                dayKey={day}
                surchargePct={Math.max(0, ...slotsForDay(day).map((s) => s.transport_surcharge_pct ?? 0))}
              />
              <div className="grid grid-cols-3 gap-2">
                {slotsForDay(day).map((s) => {
                  const rec = isRec(s);
                  const isSel = selected?.id === s.id;
                  const surcharge = s.transport_surcharge_pct ?? 0;
                  return (
                    <button
                      key={s.id}
                      onClick={() => onSelect(s)}
                      className={`flex h-14 flex-col items-center justify-center rounded-lg border text-sm transition-colors
                        ${isSel ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}
                        ${rec && !isSel ? "border-emerald-500" : ""}
                        ${surcharge > 0 && !isSel ? "border-amber-400" : ""}`}
                    >
                      <span className="flex items-center font-medium">
                        {rec && <Star className="mr-0.5 h-3 w-3 fill-emerald-500 text-emerald-500" />}
                        {formatInTimeZone(new Date(s.slot_datetime_start), TZ, "h:mm a")}
                      </span>
                      {rec && discounted != null && basePrice != null && (
                        <span className={`text-[10px] ${isSel ? "text-primary-foreground/80" : "text-emerald-600"}`}>
                          {colones(discounted)} · -{proximity!.settings.proximity_discount_pct}%
                        </span>
                      )}
                      {surcharge > 0 && !rec && (
                        <span className={`text-[10px] ${isSel ? "text-primary-foreground/80" : "text-amber-600"}`}>
                          +{surcharge}% transp.
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {showRec && dayHasRec(day) && (
                <p className="text-xs text-emerald-600">
                  ⭐ Horario recomendado — el proveedor ya estará en tu zona.
                </p>
              )}
            </div>
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" /> Elegí un día para ver las horas.
            </p>
          )}
        </div>
      )}
      <Button className="h-12 w-full" disabled={!selected} onClick={onNext}>
        Siguiente →
      </Button>
    </StepShell>
  );
}

function ServiceStep({
  listings,
  cart,
  onCartChange,
  onNext,
  onBack,
}: {
  listings: PublicListing[];
  cart: CartItem[];
  onCartChange: (c: CartItem[]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const getQty = (id: string) => cart.find((i) => i.listing.id === id)?.qty ?? 0;

  const changeQty = (listing: PublicListing, delta: number) => {
    const current = getQty(listing.id);
    const next = Math.max(0, current + delta);
    if (next === 0) {
      onCartChange(cart.filter((i) => i.listing.id !== listing.id));
    } else if (current === 0) {
      onCartChange([...cart, { listing, qty: 1 }]);
    } else {
      onCartChange(cart.map((i) => i.listing.id === listing.id ? { ...i, qty: next } : i));
    }
  };

  const totalItems = cart.reduce((s, i) => s + i.qty, 0);
  const totalPrice = cart.reduce((s, i) => s + (i.listing.base_price ?? 0) * i.qty, 0);
  const totalDuration = cart.reduce((s, i) => s + (i.listing.duration ?? 0) * i.qty, 0);

  return (
    <StepShell title="¿Qué servicios necesitás?" onBack={onBack}>
      <div className="space-y-3">
        {listings.map((l) => {
          const qty = getQty(l.id);
          return (
            <Card key={l.id} className={`overflow-hidden transition ${qty > 0 ? "ring-2 ring-primary" : ""}`}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-orange-200/40 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-tight">{l.title}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    {l.duration ? <span className="flex items-center"><Clock className="mr-1 h-3 w-3" />{formatDuration(l.duration)}</span> : null}
                    {l.base_price != null ? <span className="font-medium text-foreground">{colones(l.base_price)}</span> : null}
                  </div>
                </div>
                {/* Controles +/- */}
                <div className="flex items-center gap-2 shrink-0">
                  {qty > 0 ? (
                    <>
                      <button
                        onClick={() => changeQty(l, -1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-4 text-center text-sm font-bold">{qty}</span>
                    </>
                  ) : null}
                  <button
                    onClick={() => changeQty(l, 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Resumen del carrito */}
      {totalItems > 0 && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <ShoppingBag className="h-4 w-4" />
            {totalItems} {totalItems === 1 ? "servicio" : "servicios"} seleccionado{totalItems > 1 ? "s" : ""}
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Duración total</span>
            <span className="font-medium text-foreground">{formatDuration(totalDuration)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total estimado</span>
            <span className="font-bold text-foreground">{colones(totalPrice)}</span>
          </div>
        </div>
      )}

      <Button className="h-12 w-full" disabled={totalItems === 0} onClick={onNext}>
        Elegir fecha y hora →
      </Button>
    </StepShell>
  );
}

function CartSummary({
  cart,
  slot,
  totalDuration,
  effectiveTotal,
  transportSurchargePct = 0,
  transportSurchargeAmount = 0,
}: {
  cart: CartItem[];
  slot: PublicSlot | null;
  totalDuration: number;
  effectiveTotal: number;
  transportSurchargePct?: number;
  transportSurchargeAmount?: number;
}) {
  if (cart.length === 0 || !slot) return null;
  const baseTotal = effectiveTotal - transportSurchargeAmount;
  return (
    <Card className="bg-muted/40">
      <CardContent className="p-4 text-sm space-y-2">
        {cart.map((item) => (
          <div key={item.listing.id} className="flex justify-between">
            <span className="text-foreground">
              {item.listing.title}{item.qty > 1 ? ` x${item.qty}` : ""}
            </span>
            {item.listing.base_price != null && (
              <span className="text-muted-foreground">{colones(item.listing.base_price * item.qty)}</span>
            )}
          </div>
        ))}
        {transportSurchargePct > 0 && (
          <div className="flex justify-between text-amber-700">
            <span>Recargo por transporte (+{transportSurchargePct}%)</span>
            <span>{colones(transportSurchargeAmount)}</span>
          </div>
        )}
        <div className="border-t pt-2 flex justify-between font-semibold">
          <span>Total</span>
          <span>{colones(effectiveTotal)}</span>
        </div>
        <p className="text-muted-foreground">
          {formatInTimeZone(new Date(slot.slot_datetime_start), TZ, "EEEE d 'de' LLLL, h:mm a", { locale: es })}
          {totalDuration > 30 ? ` · ${formatDuration(totalDuration)}` : ""}
        </p>
      </CardContent>
    </Card>
  );
}
