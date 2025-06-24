
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
    <div className="space-y-4 p-4 sm:p-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <div className="flex items-center space-x-3">
          <Switch
            checked={dayAvailability.enabled}
            onCheckedChange={handleToggleDay}
            className="scale-110"
          />
          <span className="font-medium text-base sm:text-lg">{dayLabel}</span>
        </div>
      </div>

      {dayAvailability.enabled && (
        <div className="pl-2 sm:ml-8 space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:space-x-3">
              <div className="flex-1">
                <TimeSlotEditor
                  dayKey={dayKey}
                  slotIndex={index}
                />
              </div>
              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeTimeSlot(index)}
                  className="w-full sm:w-auto sm:flex-shrink-0 p-3 sm:p-2 h-11 sm:h-9 sm:w-9 mt-2 sm:mt-0"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                  <span className="ml-2 sm:hidden">Eliminar horario</span>
                </Button>
              )}
            </div>
          ))}
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addTimeSlot}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 mt-3 p-3 sm:p-2"
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
