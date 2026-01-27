import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Trash2, Plus, Clock, Copy } from 'lucide-react';
import { formatTo12Hour } from '@/lib/utils';

const DAYS = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' }
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
  addTimeSlot: (day: string) => void;
  removeTimeSlot: (day: string, index: number) => void;
  updateTimeSlot: (day: string, index: number, field: 'startTime' | 'endTime', value: string) => void;
  copyDayToOtherDays: (sourceDay: string, targetDays: string[]) => void;
}

export const AvailabilityConfigureTab: React.FC<AvailabilityConfigureTabProps> = ({
  availability,
  updateDayAvailability,
  addTimeSlot,
  removeTimeSlot,
  updateTimeSlot,
  copyDayToOtherDays
}) => {
  return (
    <div className="space-y-3 pb-4">
      {DAYS.map(({ key, label }) => (
        <Card key={key} className="shadow-sm border-border">
          <CardHeader className="pb-2 px-4 pt-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <CardTitle className="text-base font-medium text-foreground whitespace-nowrap">{label}</CardTitle>
                {availability[key]?.enabled && availability[key].timeSlots.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const otherDays = DAYS.filter(d => d.key !== key).map(d => d.key);
                      copyDayToOtherDays(key, otherDays);
                    }}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground flex-shrink-0"
                    title="Copiar a otros días"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Switch
                  id={`${key}-enabled`}
                  checked={availability[key]?.enabled || false}
                  onCheckedChange={(checked) => updateDayAvailability(key, checked)}
                />
                <Label htmlFor={`${key}-enabled`} className="text-sm text-muted-foreground whitespace-nowrap">
                  Disponible
                </Label>
              </div>
            </div>
          </CardHeader>
          
          {availability[key]?.enabled && (
            <CardContent className="pt-0 px-4 pb-4">
              <div className="space-y-3">
                {availability[key].timeSlots.map((slot, index) => (
                  <div key={index} className="p-3 bg-muted/50 rounded-lg space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor={`${key}-start-${index}`} className="text-xs text-muted-foreground whitespace-nowrap">
                          Hora de inicio
                        </Label>
                        <div className="relative">
                          <Input
                            id={`${key}-start-${index}`}
                            type="time"
                            value={slot.startTime}
                            onChange={(e) => updateTimeSlot(key, index, 'startTime', e.target.value)}
                            className="h-10"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none hidden sm:inline">
                            {formatTo12Hour(slot.startTime)}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`${key}-end-${index}`} className="text-xs text-muted-foreground whitespace-nowrap">
                          Hora de fin
                        </Label>
                        <div className="relative">
                          <Input
                            id={`${key}-end-${index}`}
                            type="time"
                            value={slot.endTime}
                            onChange={(e) => updateTimeSlot(key, index, 'endTime', e.target.value)}
                            className="h-10"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none hidden sm:inline">
                            {formatTo12Hour(slot.endTime)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTimeSlot(key, index)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2 text-xs"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                ))}
                
                {availability[key].timeSlots.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addTimeSlot(key)}
                    className="w-full h-10 text-sm border-dashed"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Horario Adicional
                  </Button>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
};
