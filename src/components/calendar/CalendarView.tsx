import React, { useState } from 'react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Repeat, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

// Status color mapping
const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  confirmed:    { bg: "#F2FCE2", border: "#75C632", text: "#256029" }, // Green
  pending:      { bg: "#FFF3E0", border: "#FF9100", text: "#924C00" }, // Orange
  completed:    { bg: "#EEE", border: "#8E9196", text: "#555" },       // Grey
  rejected:     { bg: "#FFEBEE", border: "#E57373", text: "#C62828" }, // Red
  cancelled:    { bg: "#FFEBEE", border: "#E57373", text: "#C62828" }  // Red
};

// Constants for time calculations
const CALENDAR_START_HOUR = 6; // 6 AM
const CALENDAR_END_HOUR = 20;  // 8 PM
const MINUTES_PER_HOUR = 60;
const PIXELS_PER_HOUR = 48; // Height of each hour slot in pixels

interface CalendarAppointmentProps {
  appointment: any;
  expanded: boolean;
  onClick: () => void;
}

const CalendarAppointment: React.FC<CalendarAppointmentProps> = ({
  appointment,
  expanded,
  onClick
}) => {
  const { user } = useAuth();
  
  // Convert start and end times correctly
  const startTime = new Date(appointment.start_time);
  const endTime = new Date(appointment.end_time);
  
  // Calculate precise position and height based on actual time and duration
  const startHour = startTime.getHours();
  const startMinutes = startTime.getMinutes();
  const endHour = endTime.getHours();
  const endMinutes = endTime.getMinutes();
  
  // Calculate total minutes from calendar start (6 AM)
  const minutesFromCalendarStart = ((startHour - CALENDAR_START_HOUR) * MINUTES_PER_HOUR) + startMinutes;
  const totalDurationMinutes = ((endHour - startHour) * MINUTES_PER_HOUR) + (endMinutes - startMinutes);
  
  // Convert to pixels - more precise calculation
  const topPosition = (minutesFromCalendarStart / MINUTES_PER_HOUR) * PIXELS_PER_HOUR;
  const appointmentHeight = Math.max((totalDurationMinutes / MINUTES_PER_HOUR) * PIXELS_PER_HOUR, 24); // Minimum 24px height

  const statusColor = STATUS_COLORS[appointment.status] || STATUS_COLORS['pending'];
  
  // Check if this is a recurring appointment or external booking
  const isRecurring = appointment.recurrence && appointment.recurrence !== 'none';
  const isExternal = appointment.is_external || appointment.external_booking;
  
  // Get person name with improved fallback logic  
  const getPersonName = () => {
    // For client view (looking at provider's name)
    if (user?.role === 'client') {
      if (appointment.provider_name) {
        return appointment.provider_name;
      } else {
        return 'Proveedor';
      }
    } else {
      // For provider view, show client name with external indicator
      if (appointment.client_name) {
        return appointment.client_name;
      } else {
        return isExternal ? 'Cliente Externo' : 'Cliente';
      }
    }
  };
  
  const personName = getPersonName();
  const serviceName = appointment.listings?.title || 'Servicio';

  // Don't render if appointment is outside visible hours (6 AM - 8 PM)
  if (startHour < CALENDAR_START_HOUR || startHour >= CALENDAR_END_HOUR) {
    return null;
  }

  return (
    <div
      className={cn(
        "absolute left-1 right-1 overflow-hidden shadow-sm transition-all duration-150 cursor-pointer rounded border-l-2 text-xs z-10",
        expanded ? "z-20 bg-white border border-gray-200 p-2 h-fit min-h-[32px]" : "px-1 py-0.5",
        isRecurring && "border-2 border-dashed",
        isExternal && "border-r-2 border-r-blue-400"
      )}
      style={{
        top: `${topPosition}px`,
        height: expanded ? undefined : `${appointmentHeight}px`,
        background: expanded ? '#fff' : statusColor.bg,
        borderLeftColor: statusColor.border,
        color: statusColor.text,
        fontWeight: 500,
        minHeight: expanded ? '32px' : '24px'
      }}
      title={`${serviceName} - ${format(startTime, "HH:mm")} a ${format(endTime, "HH:mm")}${isRecurring ? ' (Recurrente)' : ''}${isExternal ? ' (Externa)' : ''}`}
      onClick={onClick}
      tabIndex={0}
      role="button"
    >
      <div className="flex items-start gap-1 h-full">
        <div className="flex-shrink-0 flex items-center gap-1">
          {isRecurring && <Repeat className="h-2 w-2 text-blue-600 flex-shrink-0" />}
          {isExternal && <ExternalLink className="h-2 w-2 text-blue-500 flex-shrink-0" />}
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <div 
            className={cn(
              "truncate font-semibold leading-tight", 
              expanded ? "text-sm mb-1" : "text-[10px]"
            )}
            style={{ color: statusColor.text }}>
            {personName}
          </div>
          <div 
            className={cn(
              "truncate leading-tight",
              expanded ? "text-xs font-medium" : "text-[9px] font-normal"
            )}
            style={{ color: statusColor.text }}>
            {serviceName}
          </div>
          {!expanded && appointmentHeight >= 32 && (
            <div className="text-[8px] mt-0.5 leading-tight opacity-75" style={{ color: statusColor.text }}>
              {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")}
            </div>
          )}
        </div>
      </div>
      
      {expanded && (
        <div className="text-[10px] mt-1 text-gray-400 border-t pt-1">
          <div className="font-medium">
            {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")} ({totalDurationMinutes} min)
          </div>
          <div className="flex gap-2 mt-1">
            {isRecurring && (
              <div className="flex items-center gap-1">
                <Repeat className="h-2 w-2 text-blue-600" />
                <span className="text-blue-600 text-[9px]">
                  {appointment.recurrence === 'weekly' ? 'Semanal' : 
                   appointment.recurrence === 'biweekly' ? 'Quincenal' :
                   appointment.recurrence === 'monthly' ? 'Mensual' : 'Recurrente'}
                </span>
              </div>
            )}
            {isExternal && (
              <div className="flex items-center gap-1">
                <ExternalLink className="h-2 w-2 text-blue-500" />
                <span className="text-blue-500 text-[9px]">Externa</span>
              </div>
            )}
          </div>
          <div className="mt-1 pt-1 border-t text-[9px]">
            <span className={cn(
              "px-1 py-0.5 rounded-full text-[8px]",
              appointment.status === 'pending' ? "bg-amber-50 text-amber-800" :
              appointment.status === 'confirmed' ? "bg-green-50 text-green-800" :
              "bg-gray-50 text-gray-700"
            )}>
              {appointment.status === 'confirmed' ? 'Confirmada' : 
               appointment.status === 'pending' ? 'Pendiente' :
               appointment.status === 'completed' ? 'Completada' :
               appointment.status === 'rejected' ? 'Rechazada' :
               appointment.status === 'cancelled' ? 'Cancelada' : 
               'Desconocido'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

interface CalendarDayProps {
  date: Date;
  appointments: any[];
  isCurrentMonth: boolean;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
}

const CalendarDay: React.FC<CalendarDayProps> = ({
  date,
  appointments,
  isCurrentMonth,
  expandedId,
  setExpandedId
}) => {
  // Filter appointments for this day - include all appointments (internal and external)
  const dayAppointments = appointments.filter(appointment => {
    const appointmentDate = new Date(appointment.start_time);
    const isSameDate = isSameDay(appointmentDate, date);
    const isNotCancelledOrRejected = appointment.status !== 'cancelled' && appointment.status !== 'rejected';
    
    if (isSameDate && isNotCancelledOrRejected) {
      console.log(`Found appointment for ${date.toDateString()}:`, {
        id: appointment.id,
        start_time: appointment.start_time,
        end_time: appointment.end_time,
        duration: appointment.listings?.duration,
        recurrence: appointment.recurrence,
        status: appointment.status,
        title: appointment.listings?.title,
        is_external: appointment.is_external || appointment.external_booking,
        client_name: appointment.client_name
      });
    }
    
    return isSameDate && isNotCancelledOrRejected;
  });
  
  // Show hours from 6 AM to 8 PM
  const hours = Array.from({ length: CALENDAR_END_HOUR - CALENDAR_START_HOUR }, (_, i) => i + CALENDAR_START_HOUR);
  const isCurrentDay = isToday(date);

  // Count external vs internal appointments for display
  const externalCount = dayAppointments.filter(app => app.is_external || app.external_booking).length;
  const internalCount = dayAppointments.length - externalCount;

  return (
    <div className="relative border-r last:border-r-0 calendar-day bg-white">
      {/* Fixed header with consistent height */}
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
          </div>
        )}
      </div>

      {/* Time slots container with precise hour grid */}
      <div className="relative">
        {hours.map((hour) => (
          <div key={hour} style={{ height: `${PIXELS_PER_HOUR}px` }} className="relative border-b border-gray-100">
            <div className="absolute left-1 top-0 text-[10px] text-muted-foreground select-none bg-white py-0 px-1 leading-none z-10">
              {hour % 12 || 12} {hour < 12 ? 'AM' : 'PM'}
            </div>
          </div>
        ))}
        
        {/* Appointments overlay with precise positioning */}
        <div className="absolute inset-0 top-0">
          {dayAppointments.map(appointment => {
            console.log(`Rendering appointment for ${date.toDateString()}:`, {
              id: appointment.id,
              start_time: new Date(appointment.start_time).toLocaleTimeString(),
              end_time: new Date(appointment.end_time).toLocaleTimeString(),
              duration_minutes: (new Date(appointment.end_time).getTime() - new Date(appointment.start_time).getTime()) / (1000 * 60),
              recurrence: appointment.recurrence,
              client: appointment.client_name,
              service: appointment.listings?.title,
              is_external: appointment.is_external || appointment.external_booking
            });
            return (
              <CalendarAppointment
                key={appointment.id}
                appointment={appointment}
                expanded={expandedId === appointment.id}
                onClick={() => setExpandedId(expandedId === appointment.id ? null : appointment.id)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface CalendarViewProps {
  appointments: any[];
  currentDate?: Date;
  onDateChange?: (date: Date) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ 
  appointments, 
  currentDate: propCurrentDate,
  onDateChange 
}) => {
  const [internalCurrentDate, setInternalCurrentDate] = useState(new Date());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Use prop currentDate if provided, otherwise use internal state
  const currentDate = propCurrentDate || internalCurrentDate;
  
  const handleDateChange = (newDate: Date) => {
    console.log('Calendar view date changing to:', newDate.toISOString());
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

  // Debug appointments for current week with external booking info
  React.useEffect(() => {
    const weekStart = startDate.toDateString();
    const weekEnd = endDate.toDateString();
    const weekAppointments = appointments.filter(app => {
      const appDate = new Date(app.start_time);
      return appDate >= startDate && appDate <= endDate;
    });
    
    const externalAppointments = weekAppointments.filter(app => 
      app.is_external || app.external_booking
    );
    const recurringAppointments = weekAppointments.filter(app => 
      app.recurrence && app.recurrence !== 'none'
    );
    
    console.log(`Calendar week ${weekStart} to ${weekEnd}:`);
    console.log(`Total appointments in view: ${appointments.length}`);
    console.log(`Appointments for this week: ${weekAppointments.length}`);
    console.log(`  - Internal: ${weekAppointments.length - externalAppointments.length}`);
    console.log(`  - External: ${externalAppointments.length}`);
    console.log(`  - Recurring: ${recurringAppointments.length}`);
    
    // Log timing details for debugging
    weekAppointments.forEach(app => {
      const start = new Date(app.start_time);
      const end = new Date(app.end_time);
      const duration = (end.getTime() - start.getTime()) / (1000 * 60);
      console.log(`  - ${app.id}: ${start.toLocaleTimeString()} - ${end.toLocaleTimeString()} (${duration} min)`);
    });
  }, [appointments, startDate, endDate]);

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
            />
          ))}
        </div>
      </div>
    </Card>
  );
};

export default CalendarView;
