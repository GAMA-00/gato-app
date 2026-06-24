import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatInTimeZone } from "date-fns-tz";
import { format } from "date-fns";
import { MapPin, Calendar, Check, Loader2, Star, ArrowLeft, Clock, Sparkles, Award, ChevronRight } from "lucide-react";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CantonSelector } from "@/components/geo/CantonSelector";
import {
  usePublicProvider,
  usePublicListings,
  type PublicListing,
} from "@/hooks/usePublicProvider";
import { usePublicSlots, groupSlotsByDay, type PublicSlot } from "@/hooks/usePublicSlots";
import {
  usePublicProximity,
  applyProximityDiscount,
  type ProximityData,
} from "@/hooks/usePublicProximity";

const TZ = "America/Costa_Rica";
const db = supabase as any;

type Step = "profile" | "location" | "service" | "datetime" | "datos" | "done";

const colones = (n: number | null | undefined) =>
  n == null ? "" : `₡${n.toLocaleString("es-CR")}`;

export default function PublicBooking() {
  const { slug } = useParams<{ slug: string }>();
  const { data: provider, isLoading, error } = usePublicProvider(slug);
  const { data: listings = [] } = usePublicListings(provider?.id);

  const [step, setStep] = useState<Step>("profile");
  const [cantonId, setCantonId] = useState<number | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [addr, setAddr] = useState({ casa: "", senas: "", referencias: "" });
  const [service, setService] = useState<PublicListing | null>(null);
  const [slot, setSlot] = useState<PublicSlot | null>(null);
  const [datos, setDatos] = useState({ nombre: "", whatsapp: "", notas: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: proximity } = usePublicProximity(provider?.id, service?.id, cantonId);

  // ¿El slot elegido es recomendado por proximidad?
  const selectedIsRecommended = !!(
    slot && proximity?.recommendedEpochs.has(new Date(slot.slot_datetime_start).getTime())
  );
  // Precio efectivo (con descuento si aplica al slot recomendado)
  const effectivePrice =
    selectedIsRecommended && proximity
      ? applyProximityDiscount(service?.base_price, proximity.settings)
      : service?.base_price ?? null;

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
    if (!service || !slot) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { error: rpcError } = await db.rpc("create_external_booking", {
        p_provider_id: provider.id,
        p_listing_id: service.id,
        p_start_time: slot.slot_datetime_start,
        p_end_time: slot.slot_datetime_end,
        p_client_name: datos.nombre.trim(),
        p_client_phone: datos.whatsapp.trim(),
        p_notes: datos.notas.trim(),
        p_client_address: [addr.casa, addr.senas, addr.referencias].filter(Boolean).join(" · "),
        p_canton_id: cantonId,
        p_client_lat: coords?.lat ?? null,
        p_client_lng: coords?.lng ?? null,
        p_address_detail: {
          house_number: addr.casa,
          color_senas: addr.senas,
          referencias: addr.referencias,
        },
        p_final_price: effectivePrice,
        p_total_duration: service.duration,
      });
      if (rpcError) throw rpcError;
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
            <Button variant="outline" className="w-full h-12" onClick={useMyLocation}>
              <MapPin className="mr-2 h-4 w-4" />
              {coords ? "Ubicación capturada ✓" : "Usar mi ubicación actual"}
            </Button>
            <CantonSelector value={cantonId} onChange={setCantonId} cantonLabel="Tu cantón" />
            <div className="space-y-2">
              <Label htmlFor="casa">Número de casa / apartamento</Label>
              <Input id="casa" value={addr.casa} onChange={(e) => setAddr({ ...addr, casa: e.target.value })} className="h-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senas">Color o señas de la casa</Label>
              <Input id="senas" placeholder="Casa amarilla con portón negro" value={addr.senas} onChange={(e) => setAddr({ ...addr, senas: e.target.value })} className="h-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ref">Referencias (opcional)</Label>
              <Input id="ref" placeholder="100m norte del super" value={addr.referencias} onChange={(e) => setAddr({ ...addr, referencias: e.target.value })} className="h-12" />
            </div>
            <Button className="w-full h-12" disabled={!cantonId || !addr.casa || !addr.senas} onClick={() => setStep("service")}>
              Siguiente →
            </Button>
          </StepShell>
        )}

        {step === "service" && (
          <StepShell title="¿Qué servicio necesitás?" onBack={() => setStep("location")}>
            <div className="space-y-3">
              {listings.map((l) => (
                <Card
                  key={l.id}
                  className={`cursor-pointer transition ${service?.id === l.id ? "ring-2 ring-primary" : ""}`}
                  onClick={() => setService(l)}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{l.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {l.duration ? `${l.duration} min` : ""} {l.base_price ? `· ${colones(l.base_price)}` : ""}
                      </p>
                    </div>
                    {service?.id === l.id && <Check className="h-5 w-5 text-primary" />}
                  </CardContent>
                </Card>
              ))}
            </div>
            <Button className="w-full h-12" disabled={!service} onClick={() => setStep("datetime")}>
              Siguiente →
            </Button>
          </StepShell>
        )}

        {step === "datetime" && service && (
          <DateTimeStep
            providerId={provider.id}
            listingId={service.id}
            basePrice={service.base_price}
            proximity={proximity}
            selected={slot}
            onSelect={setSlot}
            onBack={() => setStep("service")}
            onNext={() => setStep("datos")}
          />
        )}

        {step === "datos" && (
          <StepShell title="¿Cómo te contactamos?" onBack={() => setStep("datetime")}>
            <Summary service={service} slot={slot} />
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
            <Summary service={service} slot={slot} />
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
  };
  listings: PublicListing[];
  onStart: () => void;
}) {
  const { data: cantonNames = [] } = useQuery({
    queryKey: ["public-provider-canton-names", provider.id],
    queryFn: async (): Promise<string[]> => {
      const { data } = await (supabase as any)
        .from("provider_cantones")
        .select("cantones(nombre)")
        .eq("provider_id", provider.id);
      return (data ?? []).map((r: any) => r.cantones?.nombre).filter(Boolean);
    },
  });
  const desde = listings.reduce(
    (min, l) => (l.base_price != null && (min == null || l.base_price < min) ? l.base_price : min),
    null as number | null,
  );

  return (
    <div className="-mx-4 -mt-6 space-y-6 pb-24">
      {/* Hero con gradiente */}
      <div className="relative">
        <div className="h-28 bg-gradient-to-br from-primary via-primary to-orange-400" />
        <div className="px-4">
          <Avatar className="-mt-12 h-24 w-24 ring-4 ring-background shadow-md">
            <AvatarImage src={provider.avatar_url ?? undefined} />
            <AvatarFallback className="bg-primary/10 text-2xl font-semibold text-primary">
              {provider.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <h1 className="mt-3 text-2xl font-bold leading-tight">{provider.name}</h1>
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
        {provider.about_me && (
          <p className="text-sm leading-relaxed text-muted-foreground">{provider.about_me}</p>
        )}

        {cantonNames.length > 0 && (
          <div className="space-y-2">
            <p className="flex items-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <MapPin className="mr-1 h-3.5 w-3.5" /> Trabaja en
            </p>
            <div className="flex flex-wrap gap-1.5">
              {cantonNames.map((c) => (
                <span key={c} className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Servicios */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Servicios {desde != null && <span className="normal-case text-muted-foreground">· desde {colones(desde)}</span>}
          </p>
          <div className="space-y-2.5">
            {listings.map((l) => (
              <Card key={l.id} className="overflow-hidden border-muted">
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-orange-200/40 text-primary">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold leading-tight">{l.title}</p>
                    {l.description && (
                      <p className="truncate text-xs text-muted-foreground">{l.description}</p>
                    )}
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      {l.duration ? (
                        <span className="flex items-center">
                          <Clock className="mr-1 h-3 w-3" /> {formatDuration(l.duration)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {l.base_price != null && (
                    <span className="shrink-0 font-bold text-foreground">{colones(l.base_price)}</span>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
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

function DateTimeStep({
  providerId,
  listingId,
  basePrice,
  proximity,
  selected,
  onSelect,
  onBack,
  onNext,
}: {
  providerId: string;
  listingId: string;
  basePrice: number | null;
  proximity?: ProximityData;
  selected: PublicSlot | null;
  onSelect: (s: PublicSlot) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const { data: slots = [], isLoading } = usePublicSlots(providerId, listingId);
  const byDay = useMemo(() => groupSlotsByDay(slots), [slots]);
  const [day, setDay] = useState<string | null>(null);

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

  return (
    <StepShell title="¿Cuándo te queda bien?" onBack={onBack}>
      {isLoading ? (
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
      ) : days.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay horarios disponibles por ahora.</p>
      ) : (
        <div className="space-y-4">
          {/* Calendario mensual: solo días con cupo se pueden tocar */}
          <div className="flex justify-center rounded-lg border bg-card">
            <CalendarUI
              mode="single"
              selected={day ? keyToDate(day) : undefined}
              onSelect={(d) => d && setDay(dateToKey(d))}
              defaultMonth={keyToDate(days[0])}
              fromDate={keyToDate(days[0])}
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
                {formatInTimeZone(keyToDate(day), TZ, "EEEE d 'de' LLLL")}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {slotsForDay(day).map((s) => {
                  const rec = isRec(s);
                  const isSel = selected?.id === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => onSelect(s)}
                      className={`flex h-14 flex-col items-center justify-center rounded-lg border text-sm transition-colors
                        ${isSel ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}
                        ${rec && !isSel ? "border-emerald-500" : ""}`}
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

function Summary({ service, slot }: { service: PublicListing | null; slot: PublicSlot | null }) {
  if (!service || !slot) return null;
  return (
    <Card className="bg-muted/40">
      <CardContent className="p-4 text-sm">
        <p className="font-medium">{service.title}</p>
        <p className="text-muted-foreground">
          {formatInTimeZone(new Date(slot.slot_datetime_start), TZ, "EEEE d 'de' LLLL, h:mm a")}
        </p>
        {service.base_price != null && <p className="text-muted-foreground">{colones(service.base_price)}</p>}
      </CardContent>
    </Card>
  );
}
