
import React from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import TimeSlotEditor from './TimeSlotEditor';

interface DayAvailabilityEditorProps {
  dayKey: string;
  dayLabel: string;
}

const DayAvailabilityEditor: React.FC<DayAvailabilityEditorProps> = ({ dayKey, dayLabel }) => {
  const { watch, setValue } = useFormContext();
  const availability = watch('availability') || {};
  const dayAvailability = availability[dayKey] || { enabled: false, timeSlots: [] };

  const { fields, append, remove } = useFieldArray({
    name: `availability.${dayKey}.timeSlots`
  });

  const handleToggleDay = (enabled: boolean) => {
    setValue(`availability.${dayKey}.enabled`, enabled);
    if (enabled && dayAvailability.timeSlots.length === 0) {
      // Agregar un slot por defecto cuando se habilita el día
      setValue(`availability.${dayKey}.timeSlots`, [{ startTime: '09:00', endTime: '17:00' }]);
    }
  };

  const addTimeSlot = () => {
    append({ startTime: '09:00', endTime: '17:00' });
  };

  const removeTimeSlot = (index: number) => {
    remove(index);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Switch
            checked={dayAvailability.enabled}
            onCheckedChange={handleToggleDay}
          />
          <span className="font-medium text-base">{dayLabel}</span>
        </div>
      </div>

      {dayAvailability.enabled && (
        <div className="ml-8 space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-center space-x-3">
              <TimeSlotEditor
                dayKey={dayKey}
                slotIndex={index}
              />
              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeTimeSlot(index)}
                  className="flex-shrink-0 p-2 h-9 w-9"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              )}
            </div>
          ))}
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addTimeSlot}
            className="flex items-center space-x-2 mt-2"
          >
            <Plus className="h-4 w-4" />
            <span>Agregar horario</span>
          </Button>
        </div>
      )}
    </div>
  );
};

export default DayAvailabilityEditor;
