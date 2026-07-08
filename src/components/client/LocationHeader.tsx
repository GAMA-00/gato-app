import React, { useState } from 'react';
import { MapPin, ChevronDown, X, Loader2, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { CantonSelector } from '@/components/geo/CantonSelector';
import LocationMap from '@/components/geo/LocationMap';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

const db = supabase as any;

const LocationHeader = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [locationMode, setLocationMode] = useState<'gps' | 'map' | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [editCantonId, setEditCantonId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data: cantonBaseId, isLoading: loadingUser } = useQuery({
    queryKey: ['user-canton-base-id', user?.id],
    enabled: !!user?.id,
    staleTime: 0,
    queryFn: async () => {
      const { data } = await db
        .from('users')
        .select('canton_base_id')
        .eq('id', user!.id)
        .single();
      return data?.canton_base_id ?? null;
    },
  });

  const { data: cantonData, isLoading: loadingCanton } = useQuery({
    queryKey: ['canton-with-province', cantonBaseId],
    enabled: !!cantonBaseId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await db
        .from('cantones')
        .select('nombre, provincias(nombre)')
        .eq('id', cantonBaseId)
        .single();
      return data;
    },
  });

  const isLoading = loadingUser || (!!cantonBaseId && loadingCanton);
  const cantonName = cantonData?.nombre ?? null;
  const provinceName = cantonData?.provincias?.nombre ?? null;
  const displayLabel = cantonName && provinceName
    ? `${cantonName}, ${provinceName}`
    : cantonName ?? 'Sin ubicación';

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
    );
  };

  const handleOpen = () => {
    setEditCantonId(cantonBaseId ?? null);
    setLocationMode(null);
    setCoords(null);
    setSaved(false);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!user?.id || !editCantonId) return;
    setSaving(true);
    try {
      await db.from('users').update({
        canton_base_id: editCantonId,
        ...(coords ? { client_lat: coords.lat, client_lng: coords.lng } : {}),
      }).eq('id', user.id);
      await queryClient.invalidateQueries({ queryKey: ['user-canton-base-id', user.id] });
      await queryClient.invalidateQueries({ queryKey: ['canton-with-province', editCantonId] });
      await queryClient.invalidateQueries({ queryKey: ['client-user-location', user.id] });
      setSaved(true);
      setTimeout(() => setOpen(false), 800);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-1">
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-5 w-36" />
      </div>
    );
  }

  return (
    <>
      <button onClick={handleOpen} className="text-left space-y-0.5">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
          Ubicación
        </span>
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-sm font-medium text-foreground leading-tight">
            {displayLabel}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </div>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl h-[95vh] overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>Tu ubicación</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 pb-6">
            {/* GPS / Mapa */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { setLocationMode('gps'); setCoords(null); useMyLocation(); }}
                className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-3 text-sm font-medium transition-colors
                  ${locationMode === 'gps' ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-background text-foreground hover:bg-muted/50'}`}
              >
                <MapPin className="h-5 w-5" />
                <span className="leading-tight text-center text-xs">Usar ubicación actual</span>
                {locationMode === 'gps' && coords && <span className="text-[10px] font-normal">Capturada ✓</span>}
              </button>
              <button
                type="button"
                onClick={() => { setLocationMode('map'); setCoords(null); }}
                className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-3 text-sm font-medium transition-colors
                  ${locationMode === 'map' ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-background text-foreground hover:bg-muted/50'}`}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6-10l6-3m6 3l-5.447-2.724A1 1 0 0115 4.618v10.764a1 1 0 01-.553.894L9 20m6-16v13" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="leading-tight text-center text-xs">Seleccionar en mapa</span>
                {locationMode === 'map' && coords && <span className="text-[10px] font-normal">Seleccionada ✓</span>}
              </button>
            </div>

            {locationMode === 'map' && (
              <LocationMap
                initialCoords={coords}
                onLocationSelect={(c) => setCoords(c)}
              />
            )}

            <CantonSelector
              value={editCantonId}
              onChange={setEditCantonId}
              cantonLabel="Tu cantón"
            />

            <Button
              className="w-full h-12"
              disabled={!editCantonId || saving}
              onClick={handleSave}
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : saved ? (
                <Check className="mr-2 h-4 w-4" />
              ) : null}
              {saved ? 'Guardado' : 'Guardar ubicación'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default LocationHeader;
