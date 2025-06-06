
import React, { useState } from 'react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { BlockedTimeSlot } from '@/lib/types';
import { AppointmentDisplay } from './AppointmentDisplay';
import { BlockedSlotDisplay } from './BlockedSlotDisplay';

// Constants for time calculations
const CALENDAR_START_HOUR = 6; // 6 AM
const CALENDAR_END_HOUR = 20;  // 8 PM
const PIXELS_PER_HOUR = 48; // Height of each hour slot in pixels

interface CalendarDayProps {
  date: Date;
  appointments: any[];
  isCurrentMonth: boolean;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  blockedSlots: BlockedTimeSlot[];
}

const CalendarDay: React.FC<CalendarDayProps> = ({
  date,
  appointments,
  isCurrentMonth,
  expandedId,
  setExpandedId,
  blockedSlots
}) => {
  // Filter appointments for this day
  const dayAppointments = appointments.filter(appointment => {
    const appointmentDate = new Date(appointment.start_time);
    const isSameDate = isSameDay(appointmentDate, date);
    const isNotCancelledOrRejected = appointment.status !== 'cancelled' && appointment.status !== 'rejected';
    
    return isSameDate && isNotCancelledOrRejected;
  });

  // Get blocked time slots for this day
  const dayOfWeek = date.getDay();
  const dayBlockedSlots = blockedSlots.filter(slot => {
    return slot.day === dayOfWeek || slot.day === -1; // -1 means all days
  });
  
  // Show hours from 6 AM to 8 PM
  const hours = Array.from({ length: CALENDAR_END_HOUR - CALENDAR_START_HOUR }, (_, i) => i + CALENDAR_START_HOUR);
  const isCurrentDay = isToday(date);

  // Count external vs internal appointments
  const externalCount = dayAppointments.filter(app => app.external_booking || app.is_external).length;
  const recurringCount = dayAppointments.filter(app => app.is_recurring_instance).length;

  return (
    <div className="relative border-r last:border-r-0 calendar-day bg-white">
      {/* Fixed header */}
      <div className="h-20 py-2 text-center border-b bg-white flex-shrink-0 flex flex-col justify-between">
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
        {dayAppointments.length > 0 && (
          <div className="text-[10px] font-medium space-y-0.5">
            <div className="text-blue-600">
              {dayAppointments.length} cita{dayAppointments.length > 1 ? 's' : ''}
            </div>
            {externalCount > 0 && (
              <div className="text-blue-500 text-[9px]">
                {externalCount} externa{externalCount > 1 ? 's' : ''}
              </div>
            )}
            {recurringCount > 0 && (
              <div className="text-purple-500 text-[9px]">
                {recurringCount} recurrente{recurringCount > 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Time slots container */}
      <div className="relative">
        {hours.map((hour) => (
          <div key={hour} style={{ height: `${PIXELS_PER_HOUR}px` }} className="relative border-b border-gray-100">
            <div className="absolute left-1 top-0 text-[10px] text-muted-foreground select-none bg-white py-0 px-1 leading-none z-10">
              {hour % 12 || 12} {hour < 12 ? 'AM' : 'PM'}
            </div>
          </div>
        ))}
        
        {/* Appointments and blocked slots overlay */}
        <div className="absolute inset-0 top-0">
          {/* Render blocked time slots */}
          {dayBlockedSlots.map(blockedSlot => (
            <BlockedSlotDisplay
              key={`blocked-${blockedSlot.id}`}
              blockedSlot={blockedSlot}
              expanded={expandedId === `blocked-${blockedSlot.id}`}
              onClick={() => setExpandedId(expandedId === `blocked-${blockedSlot.id}` ? null : `blocked-${blockedSlot.id}`)}
            />
          ))}
          
          {/* Render appointments */}
          {dayAppointments.map(appointment => (
            <AppointmentDisplay
              key={appointment.id}
              appointment={appointment}
              expanded={expandedId === appointment.id}
              onClick={() => setExpandedId(expandedId === appointment.id ? null : appointment.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

interface CalendarViewProps {
  appointments: any[];
  currentDate?: Date;
  onDateChange?: (date: Date) => void;
  blockedSlots?: BlockedTimeSlot[];
}

const CalendarView: React.FC<CalendarViewProps> = ({ 
  appointments, 
  currentDate: propCurrentDate,
  onDateChange,
  blockedSlots = []
}) => {
  const [internalCurrentDate, setInternalCurrentDate] = useState(new Date());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Use prop currentDate if provided, otherwise use internal state
  const currentDate = propCurrentDate || internalCurrentDate;
  
  const handleDateChange = (newDate: Date) => {
    console.log('Calendar view date changing to:', format(newDate, 'yyyy-MM-dd'));
    if (onDateChange) {
      onDateChange(newDate);
    } else {
      setInternalCurrentDate(newDate);
    }
  };

  const startDate = startOfWeek(currentDate, { weekStartsOn: 0 });
  const endDate = endOfWeek(currentDate, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const currentMonth = currentDate.getMonth();

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

  // Debug appointments for current week
  React.useEffect(() => {
    const weekAppointments = appointments.filter(app => {
      const appDate = new Date(app.start_time);
      return appDate >= startDate && appDate <= endDate;
    });
    
    console.log(`=== CALENDAR WEEK ${format(startDate, 'MMM dd')} - ${format(endDate, 'MMM dd')} ===`);
    console.log(`Total appointments in view: ${appointments.length}`);
    console.log(`Appointments for this week: ${weekAppointments.length}`);
    console.log(`Blocked slots: ${blockedSlots.length}`);
    
    // Log breakdown
    const breakdown = {
      regular: weekAppointments.filter(app => !app.is_recurring_instance).length,
      recurring: weekAppointments.filter(app => app.is_recurring_instance).length,
      external: weekAppointments.filter(app => app.external_booking).length,
      confirmed: weekAppointments.filter(app => app.status === 'confirmed').length,
      pending: weekAppointments.filter(app => app.status === 'pending').length,
      completed: weekAppointments.filter(app => app.status === 'completed').length
    };
    console.log('Week breakdown:', breakdown);
    console.log('=======================================');
  }, [appointments, startDate, endDate, blockedSlots]);

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
            <CalendarDay 
              key={index}
              date={day} 
              appointments={appointments}
              isCurrentMonth={day.getMonth() === currentMonth}
              expandedId={expandedId}
              setExpandedId={setExpandedId}
              blockedSlots={blockedSlots}
            />
          ))}
        </div>
      </div>
    </Card>
  );
};

export default CalendarView;
