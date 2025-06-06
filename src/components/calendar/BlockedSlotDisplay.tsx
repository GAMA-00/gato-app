
import React from 'react';
import { Clock, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BlockedTimeSlot } from '@/lib/types';

// Constants for time calculations
const CALENDAR_START_HOUR = 6;
const MINUTES_PER_HOUR = 60;
const PIXELS_PER_HOUR = 48;

const STATUS_COLOR = { bg: "#F5F5F5", border: "#9E9E9E", text: "#424242" };

interface BlockedSlotDisplayProps {
  blockedSlot: BlockedTimeSlot;
  expanded: boolean;
  onClick: () => void;
}

export const BlockedSlotDisplay: React.FC<BlockedSlotDisplayProps> = ({
  blockedSlot,
  expanded,
  onClick
}) => {
  // Calculate position and height
  const minutesFromCalendarStart = ((blockedSlot.startHour - CALENDAR_START_HOUR) * MINUTES_PER_HOUR);
  const totalDurationMinutes = (blockedSlot.endHour - blockedSlot.startHour) * MINUTES_PER_HOUR;
  
  const topPosition = (minutesFromCalendarStart / MINUTES_PER_HOUR) * PIXELS_PER_HOUR;
  const slotHeight = Math.max((totalDurationMinutes / MINUTES_PER_HOUR) * PIXELS_PER_HOUR, 20);

  // Don't render if outside visible hours
  if (blockedSlot.startHour < CALENDAR_START_HOUR || blockedSlot.startHour >= 20) {
    return null;
  }

  const formatHour = (hour: number) => {
    return `${hour % 12 || 12}:00 ${hour < 12 ? 'AM' : 'PM'}`;
  };

  return (
    <div
      className={cn(
        "absolute left-1 right-1 overflow-hidden shadow-sm transition-all duration-150 cursor-pointer rounded border-l-2 text-xs z-10",
        expanded ? "z-20 bg-white border border-gray-300 p-2 h-fit min-h-[24px]" : "px-1 py-0.5",
        blockedSlot.isRecurring && "border-2 border-dashed"
      )}
      style={{
        top: `${topPosition}px`,
        height: expanded ? undefined : `${slotHeight}px`,
        background: expanded ? '#fff' : STATUS_COLOR.bg,
        borderLeftColor: STATUS_COLOR.border,
        color: STATUS_COLOR.text,
        fontWeight: 500,
        minHeight: expanded ? '24px' : '20px'
      }}
      title={`${blockedSlot.note || 'Horario Bloqueado'} - ${formatHour(blockedSlot.startHour)} a ${formatHour(blockedSlot.endHour)}${blockedSlot.isRecurring ? ' (Recurrente)' : ''}`}
      onClick={onClick}
      tabIndex={0}
      role="button"
    >
      <div className="flex items-start gap-1 h-full">
        <div className="flex-shrink-0 flex items-center gap-1">
          <Clock className="h-2 w-2 text-gray-600 flex-shrink-0" />
          {blockedSlot.isRecurring && <Repeat className="h-2 w-2 text-gray-600 flex-shrink-0" />}
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <div 
            className={cn(
              "truncate font-semibold leading-tight", 
              expanded ? "text-xs mb-0.5" : "text-[10px]"
            )}
            style={{ color: STATUS_COLOR.text }}>
            {blockedSlot.note || 'Horario Bloqueado'}
          </div>
          {!expanded && slotHeight >= 28 && (
            <div className="text-[8px] mt-0.5 leading-tight opacity-75" style={{ color: STATUS_COLOR.text }}>
              {formatHour(blockedSlot.startHour)} - {formatHour(blockedSlot.endHour)}
            </div>
          )}
        </div>
      </div>
      
      {expanded && (
        <div className="text-[10px] mt-1 text-gray-400 border-t pt-1">
          <div className="font-medium">
            {formatHour(blockedSlot.startHour)} - {formatHour(blockedSlot.endHour)} ({totalDurationMinutes} min)
          </div>
          {blockedSlot.isRecurring && (
            <div className="flex gap-2 mt-1">
              <div className="flex items-center gap-1">
                <Repeat className="h-2 w-2 text-gray-600" />
                <span className="text-gray-600 text-[9px]">
                  {blockedSlot.recurrenceType === 'daily' ? 'Todos los días' : 'Semanal'}
                </span>
              </div>
            </div>
          )}
          <div className="mt-1 pt-1 border-t text-[9px]">
            <span className="px-1 py-0.5 rounded-full text-[8px] bg-gray-100 text-gray-700">
              Horario Bloqueado
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
