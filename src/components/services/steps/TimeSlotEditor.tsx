
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';

interface TimeSlotEditorProps {
  dayKey: string;
  slotIndex: number;
}

const TimeSlotEditor: React.FC<TimeSlotEditorProps> = ({ dayKey, slotIndex }) => {
  const { register, watch, formState: { errors } } = useFormContext();
  
  const startTimeValue = watch(`availability.${dayKey}.timeSlots.${slotIndex}.startTime`);
  const endTimeValue = watch(`availability.${dayKey}.timeSlots.${slotIndex}.endTime`);

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <div className="bg-gray-50 p-4 rounded-lg space-y-4 sm:space-y-0">
      {/* Mobile Layout - Vertical */}
      <div className="flex flex-col space-y-4 sm:hidden">
        <div className="space-y-2">
          <label className="text-sm text-gray-600 font-medium">Hora de inicio</label>
          <Input
            type="time"
            {...register(`availability.${dayKey}.timeSlots.${slotIndex}.startTime`)}
            className="w-full text-base h-12"
          />
          {startTimeValue && (
            <span className="text-xs text-gray-500">
              {formatTime(startTimeValue)}
            </span>
          )}
        </div>
        
        <div className="space-y-2">
          <label className="text-sm text-gray-600 font-medium">Hora de fin</label>
          <Input
            type="time"
            {...register(`availability.${dayKey}.timeSlots.${slotIndex}.endTime`)}
            className="w-full text-base h-12"
          />
          {endTimeValue && (
            <span className="text-xs text-gray-500">
              {formatTime(endTimeValue)}
            </span>
          )}
        </div>
      </div>

      {/* Desktop Layout - Horizontal */}
      <div className="hidden sm:flex sm:items-center sm:space-x-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 font-medium">De</span>
          <Input
            type="time"
            {...register(`availability.${dayKey}.timeSlots.${slotIndex}.startTime`)}
            className="w-28 text-sm"
          />
          <span className="text-xs text-gray-500">
            {formatTime(startTimeValue)}
          </span>
        </div>
        
        <span className="text-gray-400">-</span>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 font-medium">Hasta</span>
          <Input
            type="time"
            {...register(`availability.${dayKey}.timeSlots.${slotIndex}.endTime`)}
            className="w-28 text-sm"
          />
          <span className="text-xs text-gray-500">
            {formatTime(endTimeValue)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TimeSlotEditor;
