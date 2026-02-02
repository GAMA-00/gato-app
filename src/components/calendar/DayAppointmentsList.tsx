import React from 'react';
import { format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Repeat, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isRecurring as checkIsRecurring, getRecurrenceInfo } from '@/lib/recurrence';

interface DayAppointmentsListProps {
  selectedDate: Date;
  appointments: any[];
}

const DayAppointmentsList: React.FC<DayAppointmentsListProps> = ({
  selectedDate,
  appointments
}) => {
  // Filter appointments for the selected day
  const dayAppointments = appointments
    .filter(apt => {
      const aptDate = new Date(apt.start_time);
      return isSameDay(aptDate, selectedDate);
    })
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  // Generate time slots from 6am to 8pm
  const timeSlots = Array.from({ length: 15 }, (_, i) => i + 6);

  // Get recurrence label - only show for actual recurring appointments
  const getRecurrenceLabel = (apt: any): string | null => {
    const recurrence = apt.recurrence;
    if (!checkIsRecurring(recurrence)) return null;
    const info = getRecurrenceInfo(recurrence);
    return info.label;
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'border-l-green-500 bg-green-50';
      case 'pending':
        return 'border-l-orange-500 bg-orange-50';
      case 'completed':
        return 'border-l-gray-400 bg-gray-50';
      default:
        return 'border-l-gray-300 bg-gray-50';
    }
  };

  // Get the day name in Spanish
  const dayName = format(selectedDate, 'EEEE', { locale: es });
  const capitalizedDayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);

  return (
    <div className="bg-white rounded-t-3xl -mt-6 pt-6 px-4 pb-4 min-h-[300px]">
      {/* Day Title */}
      <h3 className="text-lg font-semibold text-foreground mb-4">
        {capitalizedDayName}
      </h3>

      {/* Timeline View */}
      <div className="relative">
        {timeSlots.map((hour) => {
          const hourAppointments = dayAppointments.filter(apt => {
            const aptHour = new Date(apt.start_time).getHours();
            return aptHour === hour;
          });

          return (
            <div key={hour} className="flex min-h-[48px] border-b border-gray-100">
              {/* Time Label */}
              <div className="w-16 flex-shrink-0 text-xs text-muted-foreground py-2">
                {hour % 12 || 12}:00 {hour < 12 ? 'am' : 'pm'}
              </div>

              {/* Appointments */}
              <div className="flex-1 py-1">
                {hourAppointments.map((apt, index) => (
                  <div
                    key={`${apt.id}-${index}`}
                    className={cn(
                      "rounded-lg border-l-4 p-3 mb-1",
                      getStatusColor(apt.status)
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-foreground">
                            {apt.listings?.title || apt.service_title || 'Servicio'}
                          </span>
                          {(() => {
                            const label = getRecurrenceLabel(apt);
                            return label ? (
                              <span className="inline-flex items-center gap-1 text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                                <Repeat className="h-3 w-3" />
                                {label}
                              </span>
                            ) : null;
                          })()}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {apt.client_name || 'Cliente'}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(apt.start_time), 'HH:mm')} - {format(new Date(apt.end_time), 'HH:mm')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {dayAppointments.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">No hay citas programadas para este día</p>
        </div>
      )}
    </div>
  );
};

export default DayAppointmentsList;
