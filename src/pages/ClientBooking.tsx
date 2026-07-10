import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatInTimeZone } from "date-fns-tz";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, Calendar, Check, Loader2, Star, Clock } from "lucide-react";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageLayout from "@/components/layout/PageLayout";
import { toast } from "sonner";
import { usePublicSlots, groupSlotsByDay, type PublicSlot } from "@/hooks/usePublicSlots";
import ZoneSurchargeNotice from "@/components/booking/ZoneSurchargeNotice";
import { notifySolicitudReserva } from "@/utils/whatsappNotify";
import {
  usePublicProximity,
  applyProximityDiscount,
  type ProximityData,
} from "@/hooks/usePublicProximity";
import { filterConsecutiveSlots } from "@/hooks/usePublicSlots";

const TZ = "America/Costa_Rica";
const db = supabase as any;

type Step = "datetime" | "notas" | "done";

type CartItem = { listing: any; qty: number };

const colones = (n: number | null | undefined) =>
  n == null ? "" : `₡${n.toLocaleString("es-CR")}`;

const formatDuration = (min: number | null) => {
  if (!min) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h} h ${m} min`;
  if (h) return `${h} h`;
  return `${m} min`;
};

export default function ClientBooking() {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const locationState = useLocation().state || {};
  const { user } = useAuth();

  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("datetime");
  const [slot, setSlot] = useState<PublicSlot | null>(null);
  const [notas, setNotas] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load listing data
  const { data: listing, isLoading: loadingListing } = useQuery({
    queryKey: ["client-listing", serviceId],
    enabled: !!serviceId,
    queryFn: async () => {
      const { data, error } = await db
        .from("listings")
        .select(`
          id, provider_id, title, duration, base_price, currency,
          slot_preferences,
          users!listings_provider_id_fkey(id, name)
        `)
        .eq("id", serviceId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Load user saved location data
  const { data: userData } = useQuery({
    queryKey: ["client-user-location", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await db
        .from("users")
        .select("phone, canton_base_id, house_number, address, address_detail")
        .eq("id", user!.id)
        .single();
      return data;
    },
  });

  const providerId = listing?.provider_id ?? "";
  const listingId = listing?.id ?? "";
  const totalDuration = listing?.duration ?? 60;
  const minNoticeHours = listing?.slot_preferences?.minNoticeHours ?? 0;
  const cantonId = userData?.canton_base_id ?? null;

  const { data: proximity } = usePublicProximity(providerId || undefined, listingId || undefined, cantonId);

  const handleSubmit = async () => {
    if (!slot || !user || !listing) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const startMs = new Date(slot.slot_datetime_start).getTime();
      const endTime = new Date(startMs + totalDuration * 60 * 1000).toISOString();

      const addrParts = [
        userData?.address,
        userData?.house_number,
        userData?.address_detail?.referencias,
      ].filter(Boolean);

      const selectedIsRecommended = !!(
        proximity?.recommendedEpochs.has(new Date(slot.slot_datetime_start).getTime())
      );
      const effectivePrice = selectedIsRecommended && proximity
        ? applyProximityDiscount(listing.base_price, proximity.settings)
        : listing.base_price;

      // Usar || para fallback de string vacío (no solo null/undefined)
      const clientPhone = userData?.phone || user.phone || "Sin teléfono";
      const clientName = user.name || user.email?.split("@")[0] || "Cliente";

      const { data: rpcData, error: rpcError } = await db.rpc("create_external_booking", {
        p_provider_id: providerId,
        p_listing_id: listingId,
        p_start_time: slot.slot_datetime_start,
        p_end_time: endTime,
        p_client_name: clientName,
        p_client_phone: clientPhone,
        p_notes: notas.trim() || null,
        p_client_address: addrParts.join(" · ") || null,
        p_canton_id: cantonId,
        p_client_lat: null,
        p_client_lng: null,
        p_address_detail: userData?.address_detail ?? null,
        p_final_price: effectivePrice ?? null,
        p_total_duration: totalDuration,
        p_selected_services: {
          cart: [{
            name: listing.title,
            qty: 1,
            price: listing.base_price ?? 0,
            duration: listing.duration ?? 60,
          }],
        },
      });

      if (rpcError) throw rpcError;

      // Vincular appointment al cliente autenticado via RPC (bypasa RLS sobre client_id NULL)
      const appointmentId = Array.isArray(rpcData) ? rpcData[0]?.appointment_id : rpcData?.appointment_id;
      if (!appointmentId) throw new Error("No se recibió ID de cita del servidor");

      const { error: claimError } = await db.rpc("claim_appointment_as_client", {
        p_appointment_id: appointmentId,
      });
      if (claimError) throw claimError;

      // Notificación WhatsApp al cliente (fire-and-forget)
      notifySolicitudReserva({
        clientPhone,
        clientName,
        providerName: listing.users?.name ?? "tu proveedor",
        startIso: slot.slot_datetime_start,
        endIso: endTime,
        price: effectivePrice ?? null,
        appointmentId,
      });

      // Invalidar cache de reservas para que se muestre el nuevo appointment
      await queryClient.invalidateQueries({ queryKey: ["client-appointments-direct"] });
      await queryClient.invalidateQueries({ queryKey: ["client-appointments-count"] });

      toast.success("¡Solicitud enviada!");
      setStep("done");
    } catch (e: any) {
      setSubmitError(e?.message ?? "No se pudo enviar la solicitud");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingListing) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </PageLayout>
    );
  }

  if (!listing) {
    return (
      <PageLayout>
        <div className="text-center py-12 space-y-3">
          <p className="text-muted-foreground">No se pudo cargar el servicio.</p>
          <Button variant="outline" onClick={() => navigate(-1)}>Volver</Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="mx-auto max-w-md px-4 py-6 space-y-6">
        {step === "datetime" && (
          <DateTimeStep
            providerId={providerId}
            listingId={listingId}
            totalDuration={totalDuration}
            basePrice={listing.base_price}
            minNoticeHours={minNoticeHours}
            cantonId={cantonId}
            proximity={proximity}
            selected={slot}
            onSelect={setSlot}
            onBack={() => navigate(-1)}
            onNext={() => setStep("notas")}
          />
        )}

        {step === "notas" && slot && (
          <div className="space-y-4">
            <button onClick={() => setStep("datetime")} className="flex items-center text-sm text-muted-foreground">
              <ArrowLeft className="mr-1 h-4 w-4" /> Atrás
            </button>
            <h1 className="text-xl font-bold">Confirmá tu reserva</h1>

            {/* Resumen */}
            <div className="rounded-xl border bg-muted/30 p-4 space-y-2 text-sm">
              <p className="font-semibold text-base">{listing.title}</p>
              <p className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-4 w-4 shrink-0" />
                {formatInTimeZone(new Date(slot.slot_datetime_start), TZ, "EEEE d 'de' LLLL", { locale: es })}
              </p>
              <p className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-4 w-4 shrink-0" />
                {formatInTimeZone(new Date(slot.slot_datetime_start), TZ, "h:mm a")}
                {" – "}
                {formatInTimeZone(
                  new Date(new Date(slot.slot_datetime_start).getTime() + totalDuration * 60000),
                  TZ, "h:mm a"
                )}
                {" · "}{formatDuration(totalDuration)}
              </p>
              {listing.base_price != null && (
                <p className="font-semibold text-primary">{colones(listing.base_price)}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notas-cliente">¿Algo adicional que deba saber? <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Textarea
                id="notas-cliente"
                maxLength={300}
                placeholder="Ej: Tengo dos perros, acceso por portón azul..."
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className="resize-none"
                rows={3}
              />
            </div>

            {submitError && <p className="text-sm text-destructive">{submitError}</p>}

            <Button className="w-full h-12" disabled={submitting} onClick={handleSubmit}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Enviar solicitud
            </Button>
          </div>
        )}

        {step === "done" && (
          <div className="text-center space-y-4 py-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">¡Solicitud enviada!</h1>
            <p className="text-muted-foreground text-sm">
              {listing?.users?.name ?? "El proveedor"} revisará tu solicitud y te confirmará pronto.
            </p>
            {slot && (
              <div className="rounded-xl border bg-muted/30 p-4 text-sm text-left space-y-1">
                <p className="font-semibold">{listing.title}</p>
                <p className="text-muted-foreground">
                  {formatInTimeZone(new Date(slot.slot_datetime_start), TZ, "EEEE d 'de' LLLL · h:mm a", { locale: es })}
                </p>
              </div>
            )}
            <Button className="w-full" onClick={() => navigate("/client/bookings")}>
              Ver mis reservas
            </Button>
          </div>
        )}
      </div>
    </PageLayout>
  );
}

// ── DateTimeStep (mismo diseño que PublicBooking) ──────────────────────────

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

  const dayHasRec = (d: string) => byDay[d]?.some((s) => isRec(s));
  const days = Object.keys(byDay).sort();

  const keyToDate = (k: string) => new Date(k + "T00:00:00");
  const dateToKey = (d: Date) => format(d, "yyyy-MM-dd");
  const availableSet = useMemo(() => new Set(days), [slots]);
  const recommendedDates = useMemo(
    () => days.filter(dayHasRec).map(keyToDate),
    [slots, showRec, proximity],
  );

  const slotsForDay = (d: string) =>
    [...(byDay[d] ?? [])].sort(
      (a, b) =>
        Number(isRec(b)) - Number(isRec(a)) ||
        a.slot_datetime_start.localeCompare(b.slot_datetime_start),
    );

  const firstAvailableDate = days.length > 0 ? keyToDate(days[0]) : undefined;
  const displayMonth = calendarMonth ?? firstAvailableDate;

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center text-sm text-muted-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" /> Atrás
      </button>
      <h1 className="text-xl font-bold">¿Cuándo te queda bien?</h1>

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
    </div>
  );
}
