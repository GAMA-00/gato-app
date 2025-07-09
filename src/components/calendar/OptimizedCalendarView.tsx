import React, { useState, useMemo } from 'react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { AppointmentDisplay } from './AppointmentDisplay';

// Optimized constants
const CALENDAR_START_HOUR = 6;
const CALENDAR_END_HOUR = 20;
const PIXELS_PER_HOUR = 48;

// Memoized calendar day component
const OptimizedCalendarDay = React.memo<{
  date: Date;
  appointments: any[];
  isCurrentMonth: boolean;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
}>(({ date, appointments, isCurrentMonth, expandedId, setExpandedId }) => {
  const dateString = format(date, 'yyyy-MM-dd');
  
  // Optimized filtering with useMemo
  const { dayAppointments } = useMemo(() => {
    const dayAppointments = appointments.filter(appointment => {
      const appointmentDate = new Date(appointment.start_time);
      const appointmentDateString = format(appointmentDate, 'yyyy-MM-dd');
      return appointmentDateString === dateString;
    });

    return { dayAppointments };
  }, [appointments, dateString, date]);

  const hours = useMemo(() => 
    Array.from({ length: CALENDAR_END_HOUR - CALENDAR_START_HOUR }, (_, i) => i + CALENDAR_START_HOUR),
    []
  );
  
  const isCurrentDay = isToday(date);

  return (
    <div className="relative border-r last:border-r-0 calendar-day bg-white">
      {/* Optimized header */}
      <div className="h-16 py-2 text-center border-b bg-white flex-shrink-0 flex flex-col justify-center">
        <div className={cn("text-xs uppercase tracking-wide", !isCurrentMonth && "text-muted-foreground")}>
          {format(date, 'EEE', { locale: es })}
        </div>
        <div className={cn("flex items-center justify-center", !isCurrentMonth && "text-muted-foreground", isCurrentDay && "font-bold text-primary")}>
          {isCurrentDay ? (
            <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">
              {format(date, 'd')}
            </div>
          ) : (
            <span className="text-sm">{format(date, 'd')}</span>
          )}
        </div>
      </div>

      {/* Time slots with virtualization for large lists */}
      <div className="relative">
        {hours.map((hour) => (
          <div key={hour} style={{ height: `${PIXELS_PER_HOUR}px` }} className="relative border-b border-gray-100">
            <div className="absolute left-1 top-0 text-[10px] text-muted-foreground select-none bg-white py-0 px-1 leading-none z-10">
              {hour % 12 || 12} {hour < 12 ? 'AM' : 'PM'}
            </div>
          </div>
        ))}
        
        {/* Optimized appointments and blocked slots overlay */}
        <div className="absolute inset-0 top-0">
          
          {/* Render appointments with collision detection */}
          {dayAppointments.map((appointment, index) => (
            <AppointmentDisplay
              key={`${appointment.id}-${index}`}
              appointment={appointment}
              expanded={expandedId === appointment.id}
              onClick={() => setExpandedId(expandedId === appointment.id ? null : appointment.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

OptimizedCalendarDay.displayName = 'OptimizedCalendarDay';

interface OptimizedCalendarViewProps {
  appointments: any[];
  currentDate?: Date;
  onDateChange?: (date: Date) => void;
  
}

const OptimizedCalendarView: React.FC<OptimizedCalendarViewProps> = ({ 
  appointments, 
  currentDate: propCurrentDate,
  onDateChange,
  
}) => {
  const [internalCurrentDate, setInternalCurrentDate] = useState(new Date());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const currentDate = propCurrentDate || internalCurrentDate;
  
  const handleDateChange = (newDate: Date) => {
    if (onDateChange) {
      onDateChange(newDate);
    } else {
      setInternalCurrentDate(newDate);
    }
  };

  // Optimized date calculations with memoization
  const { startDate, endDate, days, currentMonth } = useMemo(() => {
    const startDate = startOfWeek(currentDate, { weekStartsOn: 0 });
    const endDate = endOfWeek(currentDate, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const currentMonth = currentDate.getMonth();
    
    return { startDate, endDate, days, currentMonth };
  }, [currentDate]);

  const handlePreviousWeek = () => {
    const newDate = addDays(currentDate, -7);
    handleDateChange(newDate);
    setExpandedId(null);
  };

  const handleNextWeek = () => {
    const newDate = addDays(currentDate, 7);
    handleDateChange(newDate);
    setExpandedId(null);
  };

  const handleToday = () => {
    const today = new Date();
    handleDateChange(today);
    setExpandedId(null);
  };

  return (
    <Card className="overflow-hidden border-0 shadow-medium">
      <div className="p-4 flex items-center justify-between border-b bg-white">
        <h2 className="text-xl font-semibold">
          {format(currentDate, 'MMMM yyyy', { locale: es })}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleToday}>
            Hoy
          </Button>
          <div className="flex">
            <Button variant="outline" size="icon" onClick={handlePreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      <div className="overflow-auto max-h-[calc(100vh-200px)] bg-white">
        <div className="grid grid-cols-7 min-w-[700px]">
          {days.map((day, index) => (
            <OptimizedCalendarDay 
              key={`${day.getTime()}-${index}`} // Optimized key
              date={day} 
              appointments={appointments}
              isCurrentMonth={day.getMonth() === currentMonth}
              expandedId={expandedId}
              setExpandedId={setExpandedId}
              
            />
          ))}
        </div>
      </div>
    </Card>
  );
};

export default OptimizedCalendarView;