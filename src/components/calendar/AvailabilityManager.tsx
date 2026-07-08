import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Save, Loader2, AlertTriangle } from 'lucide-react';
import { useProviderAvailability } from '@/hooks/useProviderAvailabilitySettings';
import { useAvailabilitySync } from '@/hooks/useAvailabilitySync';
import { AvailabilityConfigureTab } from './AvailabilityConfigureTab';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatInTimeZone } from 'date-fns-tz';

const TZ = 'America/Costa_Rica';

const DAY_MAP: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};
const DAY_ES: Record<string, string> = {
  monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles',
  thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo',
};

interface DayWarning {
  dayKey: string;
  appointmentCount: number;
}

export const AvailabilityManager: React.FC = () => {
  const { user } = useAuth();
  const {
    availability,
    isLoading,
    isSaving,
    updateDayAvailability,
    addTimeSlot,
    removeTimeSlot,
    updateTimeSlot,
    saveAvailability,
    copyDayToOtherDays,
  } = useProviderAvailability();

  useAvailabilitySync();

  const [warning, setWarning] = useState<DayWarning | null>(null);
  const [pendingDisable, setPendingDisable] = useState<string | null>(null);
  const [checkingDay, setCheckingDay] = useState<string | null>(null);

  const handleToggleDay = async (dayKey: string, enabled: boolean) => {
    if (enabled) {
      // Activar: sin restricción
      updateDayAvailability(dayKey, true);
      return;
    }

    // Desactivar: verificar si hay citas activas en ese día de la semana
    setCheckingDay(dayKey);
    try {
      const db = supabase as any;
      const dow = DAY_MAP[dayKey];
      const today = formatInTimeZone(new Date(), TZ, 'yyyy-MM-dd');

      const { data: appts } = await db
        .from('appointments')
        .select('id, start_time')
        .eq('provider_id', user?.id)
        .in('status', ['pending', 'confirmed'])
        .gte('start_time', `${today}T00:00:00-06:00`);

      const matching = (appts ?? []).filter((a: any) => {
        const localDate = new Date(a.start_time);
        // getDay en UTC-6
        const dowLocal = new Date(localDate.getTime() - 6 * 3600_000).getUTCDay();
        return dowLocal === dow;
      });

      if (matching.length > 0) {
        setWarning({ dayKey, appointmentCount: matching.length });
        setPendingDisable(dayKey);
      } else {
        updateDayAvailability(dayKey, false);
      }
    } finally {
      setCheckingDay(null);
    }
  };

  const confirmDisable = () => {
    if (pendingDisable) {
      updateDayAvailability(pendingDisable, false);
    }
    setWarning(null);
    setPendingDisable(null);
  };

  const cancelDisable = () => {
    setWarning(null);
    setPendingDisable(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      {/* Dialog de advertencia */}
      {warning && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 rounded-full bg-amber-100 p-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">Citas activas detectadas</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  El día <strong>{DAY_ES[warning.dayKey]}</strong> tiene{' '}
                  <strong>{warning.appointmentCount} cita{warning.appointmentCount > 1 ? 's' : ''}</strong>{' '}
                  activa{warning.appointmentCount > 1 ? 's' : ''}. No se recomienda desactivar este día.
                </p>
                <p className="text-xs text-destructive mt-2 font-medium">
                  Si continúas, estas citas deberán cancelarse manualmente.
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={cancelDisable}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={confirmDisable}
              >
                Desactivar igual
              </Button>
            </div>
          </div>
        </div>
      )}

      <AvailabilityConfigureTab
        availability={availability}
        updateDayAvailability={handleToggleDay}
        checkingDay={checkingDay}
        addTimeSlot={addTimeSlot}
        removeTimeSlot={removeTimeSlot}
        updateTimeSlot={updateTimeSlot}
        copyDayToOtherDays={copyDayToOtherDays}
      />

      {/* Guardar */}
      <div className="sticky bottom-0 bg-background pt-3 pb-2 mt-2 border-t -mx-5 px-5">
        <Button
          onClick={saveAvailability}
          disabled={isSaving}
          className="w-full h-12 text-base font-medium"
        >
          {isSaving ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" />Guardando...</>
          ) : (
            <><Save className="h-4 w-4 mr-2" />Guardar cambios</>
          )}
        </Button>
      </div>
    </>
  );
};
