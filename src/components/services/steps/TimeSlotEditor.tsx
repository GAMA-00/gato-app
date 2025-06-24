
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
    <div className="flex items-center space-x-3 bg-gray-50 p-3 rounded-lg">
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-600 font-medium">De</span>
        <Input
          type="time"
          {...register(`availability.${dayKey}.timeSlots.${slotIndex}.startTime`)}
          className="w-24 text-sm"
        />
        <span className="text-xs text-gray-500 hidden sm:block">
          {formatTime(startTimeValue)}
        </span>
      </div>
      
      <span className="text-gray-400">-</span>
      
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-600 font-medium">Hasta</span>
        <Input
          type="time"
          {...register(`availability.${dayKey}.timeSlots.${slotIndex}.endTime`)}
          className="w-24 text-sm"
        />
        <span className="text-xs text-gray-500 hidden sm:block">
          {formatTime(endTimeValue)}
        </span>
      </div>
    </div>
  );
};

export default TimeSlotEditor;
