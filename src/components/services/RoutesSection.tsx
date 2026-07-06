import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, Route } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useProviderSettings, useSaveProviderSettings } from "@/hooks/useProviderSettings";
import { useRouteFilters, useSaveRouteFilter, useDeleteRouteFilter, DAY_LABELS, type RouteFilter } from "@/hooks/useRouteFilters";
import { useProvincias, useCantones } from "@/hooks/useGeografia";

export default function RoutesSection() {
  const { user } = useAuth();
  const { data: settings } = useProviderSettings();
  const saveSettings = useSaveProviderSettings();
  const { data: filters = [] } = useRouteFilters(user?.id);
  const saveFilter = useSaveRouteFilter();
  const deleteFilter = useDeleteRouteFilter();

  const { data: provincias = [] } = useProvincias();

  // Proximity discount local state
  const [discountPct, setDiscountPct] = useState<string>("");

  // Filter editor state
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [selectedProvIds, setSelectedProvIds] = useState<number[]>([]);
  const [expandedProv, setExpandedProv] = useState<number | null>(null);
  const [selectedCantonIds, setSelectedCantonIds] = useState<number[]>([]);
  const [surchargePct, setSurchargePct] = useState<string>("");

  const { data: cantonesAll = [] } = useCantones(undefined);

  const openEditor = (day: number) => {
    const existing = filters.find((f) => f.day_of_week === day);
    // Legacy: expandir provincias guardadas a sus cantones (el filtro opera a nivel de cantón)
    const legacyProvCantons = (existing?.province_ids ?? []).flatMap((pid) =>
      cantonesAll.filter((c: any) => c.provincia_id === pid).map((c: any) => c.id)
    );
    setSelectedProvIds([]);
    setSelectedCantonIds([...new Set([...(existing?.canton_ids ?? []), ...legacyProvCantons])]);
    setSurchargePct(existing?.transport_surcharge_pct ? String(existing.transport_surcharge_pct) : "");
    setExpandedProv(null);
    setEditingDay(day);
  };

  const saveFilterEdit = async () => {
    if (editingDay === null) return;
    const pct = Math.min(100, Math.max(0, Number(surchargePct) || 0));
    await saveFilter.mutateAsync({
      day_of_week: editingDay,
      province_ids: [], // el filtro opera a nivel de cantón; provincia = atajo de selección
      canton_ids: selectedCantonIds,
      transport_surcharge_pct: pct,
    });
    toast.success(`Filtro guardado para ${DAY_LABELS[editingDay]}`);
    setEditingDay(null);
  };

  const removeFilter = async (day: number) => {
    await deleteFilter.mutateAsync(day);
    toast.success(`Filtro eliminado para ${DAY_LABELS[day]}`);
  };

  // Checkbox de provincia = atajo para (de)seleccionar todos sus cantones
  const toggleProv = (pid: number) => {
    const provCantonIds = cantonesAll
      .filter((c: any) => c.provincia_id === pid)
      .map((c: any) => c.id);
    const allSelected = provCantonIds.every((id: number) => selectedCantonIds.includes(id));
    setSelectedCantonIds((prev) =>
      allSelected
        ? prev.filter((id) => !provCantonIds.includes(id))
        : [...new Set([...prev, ...provCantonIds])]
    );
  };

  const toggleCanton = (cid: number) => {
    setSelectedCantonIds((prev) =>
      prev.includes(cid) ? prev.filter((x) => x !== cid) : [...prev, cid]
    );
  };

  const cantonesOfProv = (pid: number) => cantonesAll.filter((c: any) => c.provincia_id === pid);

  const filteredDays = new Set(filters.map((f) => f.day_of_week));
  const freeDays = [0, 1, 2, 3, 4, 5, 6].filter((d) => !filteredDays.has(d));

  // Discount pct shown in UI: use local state if editing, else from settings
  const displayDiscountPct = discountPct !== "" ? discountPct : String(settings?.proximity_discount_pct ?? "");

  return (
    <div className="space-y-6">
      {/* ── Descuento por cercanía ─────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Route className="h-4 w-4 text-primary" />
            Descuento por cercanía
          </CardTitle>
          <CardDescription className="text-sm">
            Ofrecé un descuento a clientes que agendan en horarios recomendados (citas consecutivas dentro de un mismo cantón).
            Los recomendados siempre se muestran aunque el descuento esté desactivado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="discount-toggle" className="text-sm font-medium">
              Activar descuento por cercanía
            </Label>
            <Switch
              id="discount-toggle"
              checked={settings?.proximity_discount_enabled ?? false}
              onCheckedChange={(val) =>
                saveSettings.mutate({
                  proximity_discount_enabled: val,
                  proximity_discount_pct: Number(displayDiscountPct) || 0,
                })
              }
            />
          </div>

          {settings?.proximity_discount_enabled && (
            <div className="flex items-center gap-3">
              <Label htmlFor="discount-pct" className="text-sm shrink-0">
                Porcentaje de descuento
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="discount-pct"
                  type="number"
                  min={1}
                  max={50}
                  value={displayDiscountPct}
                  onChange={(e) => setDiscountPct(e.target.value)}
                  onBlur={() => {
                    const val = Math.min(50, Math.max(1, Number(displayDiscountPct) || 1));
                    setDiscountPct(String(val));
                    saveSettings.mutate({ proximity_discount_pct: val, proximity_discount_enabled: true });
                  }}
                  className="w-20 text-center"
                  placeholder="10"
                />
                <span className="text-lg font-bold text-primary">%</span>
              </div>
            </div>
          )}

          {settings?.proximity_discount_enabled && Number(displayDiscountPct) > 0 && (
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              Los clientes verán <strong>"{displayDiscountPct}% de descuento"</strong> en los horarios recomendados de su cantón.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Filtros por día y zona ─────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Route className="h-4 w-4 text-primary" />
            Filtros de zona por día
          </CardTitle>
          <CardDescription className="text-sm">
            Definí en qué días atendés clientes de ciertas provincias o cantones. Todos los clientes verán todos los horarios disponibles,
            pero si reservan en un día fuera de su zona designada se les cobrará un porcentaje adicional por transporte.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Existing filters */}
          {filters.map((f) => (
            <div key={f.day_of_week} className="flex items-start justify-between gap-2 rounded-xl border bg-muted/30 px-4 py-3">
              <div className="min-w-0">
                <p className="font-semibold text-sm">{DAY_LABELS[f.day_of_week]}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {f.province_ids.map((pid) => {
                    const prov = provincias.find((p: any) => p.id === pid);
                    return prov ? (
                      <Badge key={pid} variant="secondary" className="text-xs">{prov.nombre}</Badge>
                    ) : null;
                  })}
                  {f.canton_ids.map((cid) => {
                    const c = cantonesAll.find((x: any) => x.id === cid);
                    return c ? (
                      <Badge key={cid} variant="outline" className="text-xs">{c.nombre}</Badge>
                    ) : null;
                  })}
                  {f.province_ids.length === 0 && f.canton_ids.length === 0 && (
                    <span className="text-xs text-muted-foreground">Sin restricciones de zona</span>
                  )}
                </div>
                {f.transport_surcharge_pct > 0 && (
                  <p className="text-xs text-amber-700 mt-1">+{f.transport_surcharge_pct}% por transporte fuera de zona</p>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditor(f.day_of_week)}>
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeFilter(f.day_of_week)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}

          {/* Add filter button */}
          {freeDays.length > 0 && editingDay === null && (
            <div className="flex items-center gap-2">
              <Select onValueChange={(v) => openEditor(Number(v))}>
                <SelectTrigger className="h-9 w-48 text-sm">
                  <SelectValue placeholder="Agregar día..." />
                </SelectTrigger>
                <SelectContent>
                  {freeDays.map((d) => (
                    <SelectItem key={d} value={String(d)}>{DAY_LABELS[d]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">Seleccioná un día para agregar un filtro</span>
            </div>
          )}

          {/* Editor */}
          {editingDay !== null && (
            <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 space-y-4">
              <p className="font-semibold text-sm text-primary">{DAY_LABELS[editingDay]} — Zonas en ruta</p>
              <p className="text-xs text-muted-foreground">
                Seleccioná las provincias o cantones que cubrís este día sin costo extra. Los clientes fuera de estas zonas verán los horarios disponibles pero pagarán el recargo de transporte que definás.
              </p>

              {/* Province + canton selector */}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {provincias.map((prov: any) => {
                  const cantones = cantonesOfProv(prov.id);
                  const isProvSelected =
                    cantones.length > 0 &&
                    cantones.every((c: any) => selectedCantonIds.includes(c.id));
                  const expanded = expandedProv === prov.id;

                  return (
                    <div key={prov.id} className="rounded-lg border bg-background">
                      <div className="flex items-center gap-2 px-3 py-2">
                        <Checkbox
                          id={`prov-${prov.id}`}
                          checked={isProvSelected}
                          onCheckedChange={() => toggleProv(prov.id)}
                        />
                        <Label htmlFor={`prov-${prov.id}`} className="flex-1 cursor-pointer text-sm font-medium">
                          {prov.nombre}
                        </Label>
                        <button
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => setExpandedProv(expanded ? null : prov.id)}
                        >
                          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                      {expanded && (
                        <div className="grid grid-cols-2 gap-1 border-t px-3 py-2">
                          {cantones.map((c: any) => (
                            <div key={c.id} className="flex items-center gap-1.5">
                              <Checkbox
                                id={`c-${c.id}`}
                                checked={selectedCantonIds.includes(c.id)}
                                onCheckedChange={() => toggleCanton(c.id)}
                              />
                              <Label htmlFor={`c-${c.id}`} className="cursor-pointer text-xs">{c.nombre}</Label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Recargo por transporte */}
              <div className="space-y-1.5">
                <Label htmlFor="surcharge-pct" className="text-sm font-medium">
                  Recargo por transporte fuera de zona
                </Label>
                <p className="text-xs text-muted-foreground">
                  Porcentaje adicional que pagarán los clientes que reserven en días fuera de su zona.
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    id="surcharge-pct"
                    type="number"
                    min={0}
                    max={100}
                    value={surchargePct}
                    onChange={(e) => setSurchargePct(e.target.value)}
                    className="w-20 text-center"
                    placeholder="0"
                  />
                  <span className="text-lg font-bold text-amber-700">%</span>
                  {Number(surchargePct) === 0 && (
                    <span className="text-xs text-muted-foreground">(sin recargo extra)</span>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={saveFilterEdit} disabled={saveFilter.isPending}>
                  Guardar filtro
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingDay(null)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {filters.length === 0 && editingDay === null && (
            <p className="text-xs text-muted-foreground">Sin filtros de zona. Todos tus espacios son visibles desde cualquier cantón sin recargo.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
