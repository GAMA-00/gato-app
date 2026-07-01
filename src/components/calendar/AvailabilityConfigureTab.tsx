import React from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Trash2, Plus, Loader2 } from 'lucide-react';

const DAYS = [
  { key: 'monday',    label: 'Lunes' },
  { key: 'tuesday',   label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday',  label: 'Jueves' },
  { key: 'friday',    label: 'Viernes' },
  { key: 'saturday',  label: 'Sábado' },
  { key: 'sunday',    label: 'Domingo' },
];

interface TimeSlot {
  startTime: string;
  endTime: string;
  id?: string;
}

interface DayAvailability {
  enabled: boolean;
  timeSlots: TimeSlot[];
}

interface WeeklyAvailability {
  [key: string]: DayAvailability;
}

interface AvailabilityConfigureTabProps {
  availability: WeeklyAvailability;
  updateDayAvailability: (day: string, enabled: boolean) => void;
  checkingDay?: string | null;
  addTimeSlot: (day: string) => void;
  removeTimeSlot: (day: string, index: number) => void;
  updateTimeSlot: (day: string, index: number, field: 'startTime' | 'endTime', value: string) => void;
  copyDayToOtherDays: (sourceDay: string, targetDays: string[]) => void;
}

export const AvailabilityConfigureTab: React.FC<AvailabilityConfigureTabProps> = ({
  availability,
  updateDayAvailability,
  checkingDay,
  addTimeSlot,
  removeTimeSlot,
  updateTimeSlot,
  copyDayToOtherDays,
}) => {
  return (
    <div className="divide-y divide-border pb-2">
      {DAYS.map(({ key, label }) => {
        const day = availability[key];
        const enabled = day?.enabled ?? false;
        const slots = day?.timeSlots ?? [];

        return (
          <div key={key} className="py-3">
            {/* Row: toggle + day label + copy */}
            <div className="flex items-center gap-3">
              {checkingDay === key ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground flex-shrink-0" />
              ) : (
                <Switch
                  checked={enabled}
                  onCheckedChange={(checked) => updateDayAvailability(key, checked)}
                  className="flex-shrink-0"
                  disabled={checkingDay !== null && checkingDay !== undefined}
                />
              )}
              <span className={`flex-1 text-sm font-medium ${enabled ? 'text-foreground' : 'text-muted-foreground'}`}>
                {label}
              </span>
              {!enabled && (
                <span className="text-xs text-muted-foreground">No disponible</span>
              )}
            </div>

            {/* Time slots */}
            {enabled && (
              <div className="mt-2.5 space-y-2 pl-10">
                {slots.map((slot, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={slot.startTime}
                      onChange={(e) => updateTimeSlot(key, index, 'startTime', e.target.value)}
                      className="h-9 text-sm flex-1"
                    />
                    <span className="text-muted-foreground text-xs flex-shrink-0">—</span>
                    <Input
                      type="time"
                      value={slot.endTime}
                      onChange={(e) => updateTimeSlot(key, index, 'endTime', e.target.value)}
                      className="h-9 text-sm flex-1"
                    />
                    <button
                      onClick={() => removeTimeSlot(key, index)}
                      className="flex-shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Eliminar horario"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                <button
                  onClick={() => addTimeSlot(key)}
                  className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Agregar horario
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
