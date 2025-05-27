
import React, { useState } from 'react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Repeat } from 'lucide-react';
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
  
  // Calculate position from midnight in minutes (8AM = 480 minutes)
  const startHour = startTime.getHours();
  const startMinutes = startTime.getMinutes();
  const minutesFromMidnight = (startHour * 60) + startMinutes;
  
  // Adjust position to start at 8 AM (subtract 480 minutes = 8 hours)
  const positionFromTop = minutesFromMidnight - 480;
  
  // Calculate duration in minutes
  const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);

  const statusColor = STATUS_COLORS[appointment.status] || STATUS_COLORS['pending'];
  
  // Check if this is a recurring appointment
  const isRecurring = appointment.recurrence && appointment.recurrence !== 'none';
  
  // Get person name with improved fallback logic  
  const getPersonName = () => {
    // For client view (looking at provider's name)
    if (user?.role === 'client') {
      // Show provider name for clients
      if (appointment.provider_name) {
        return appointment.provider_name;
      } else {
        return 'Proveedor';
      }
    } else {
      // Show client name for providers
      if (appointment.client_name) {
        return appointment.client_name;
      } else {
        return 'Cliente';
      }
    }
  };
  
  const personName = getPersonName();
  const serviceName = appointment.listings?.title || 'Servicio';

  return (
    <div
      className={cn(
        "absolute left-1 right-1 overflow-hidden shadow transition-all duration-150 cursor-pointer rounded-lg flex flex-col border-l-4",
        expanded ? "z-20 bg-white border border-gray-200 p-3 h-fit min-h-[70px]" : "px-2 py-1 gap-0.5",
        isRecurring && "border-2 border-dashed"
      )}
      style={{
        top: `${positionFromTop}px`,
        height: expanded ? undefined : `${Math.max(durationMinutes, 36)}px`,
        background: expanded ? '#fff' : statusColor.bg,
        borderLeftColor: statusColor.border,
        color: statusColor.text,
        fontWeight: 500
      }}
      title={`${serviceName}${isRecurring ? ' (Recurrente)' : ''}`}
      onClick={onClick}
      tabIndex={0}
      role="button"
    >
      <div className="flex items-center gap-1">
        {isRecurring && <Repeat className="h-3 w-3 text-blue-600" />}
        <div 
          className={cn(
            "truncate font-semibold flex-1", 
            expanded ? "text-base mb-1" : "text-xs"
          )}
          style={{ color: statusColor.text }}>
          {personName}
        </div>
      </div>
      <div 
        className={cn(
          "truncate",
          expanded ? "text-sm font-medium" : "text-[10px] font-normal"
        )}
        style={{ color: statusColor.text }}>
        {serviceName}
      </div>
      {expanded && (
        <div className="text-[11px] mt-1 text-gray-400">
          <span>
            {format(new Date(appointment.start_time), "HH:mm")} - {format(new Date(appointment.end_time), "HH:mm")}
          </span>
          {isRecurring && (
            <div className="mt-1 flex items-center gap-1">
              <Repeat className="h-3 w-3 text-blue-600" />
              <span className="text-blue-600 text-xs">
                {appointment.recurrence === 'weekly' ? 'Semanal' : 
                 appointment.recurrence === 'biweekly' ? 'Quincenal' :
                 appointment.recurrence === 'monthly' ? 'Mensual' : 'Recurrente'}
              </span>
            </div>
          )}
          <div className="mt-1 pt-1 border-t text-xs">
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[10px]",
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
  // Filter appointments for this day - include all recurring appointments
  const dayAppointments = appointments.filter(appointment => {
    const appointmentDate = new Date(appointment.start_time);
    const isSameDate = isSameDay(appointmentDate, date);
    const isNotCancelledOrRejected = appointment.status !== 'cancelled' && appointment.status !== 'rejected';
    
    if (isSameDate && isNotCancelledOrRejected) {
      console.log(`Found appointment for ${date.toDateString()}:`, {
        id: appointment.id,
        start_time: appointment.start_time,
        recurrence: appointment.recurrence,
        status: appointment.status,
        title: appointment.listings?.title
      });
    }
    
    return isSameDate && isNotCancelledOrRejected;
  });
  
  // Show hours from 8 AM to 8 PM (12 hours)
  const hours = Array.from({ length: 13 }, (_, i) => i + 8);
  const isCurrentDay = isToday(date);

  return (
    <div className="h-[780px] relative border-r last:border-r-0 calendar-day bg-white">
      <div className="sticky top-0 py-2 text-center border-b z-10 bg-white">
        <div className={cn("text-xs uppercase tracking-wide mb-1", !isCurrentMonth && "text-muted-foreground")}>
          {format(date, 'EEE', { locale: es })}
        </div>
        <div className={cn("flex items-center justify-center", !isCurrentMonth && "text-muted-foreground", isCurrentDay && "font-bold text-primary")}>
          {isCurrentDay ? (
            <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              {format(date, 'd')}
            </div>
          ) : (
            format(date, 'd')
          )}
        </div>
        {dayAppointments.length > 0 && (
          <div className="text-xs text-blue-600 font-medium mt-1">
            {dayAppointments.length} cita{dayAppointments.length > 1 ? 's' : ''}
          </div>
        )}
      </div>

      <div className="relative h-full bg-white">
        {hours.map((hour) => (
          <div key={hour} className="border-b h-[60px] relative">
            <div className="absolute left-1 -top-3 text-xs text-muted-foreground select-none bg-white py-0 px-1">
              {hour % 12 || 12} {hour < 12 ? 'AM' : 'PM'}
            </div>
          </div>
        ))}
        {dayAppointments.map(appointment => {
          console.log(`Rendering appointment for ${date.toDateString()}:`, {
            id: appointment.id,
            scheduled_time: new Date(appointment.start_time).toLocaleTimeString(),
            recurrence: appointment.recurrence,
            client: appointment.client_name,
            service: appointment.listings?.title
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

  // Debug appointments for current week
  React.useEffect(() => {
    const weekStart = startDate.toDateString();
    const weekEnd = endDate.toDateString();
    const weekAppointments = appointments.filter(app => {
      const appDate = new Date(app.start_time);
      return appDate >= startDate && appDate <= endDate;
    });
    
    console.log(`Calendar week ${weekStart} to ${weekEnd}:`);
    console.log(`Total appointments in view: ${appointments.length}`);
    console.log(`Appointments for this week: ${weekAppointments.length}`);
    
    const recurringInWeek = weekAppointments.filter(app => 
      app.recurrence && app.recurrence !== 'none'
    );
    console.log(`Recurring appointments this week: ${recurringInWeek.length}`, recurringInWeek);
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
        <div className="flex min-w-[700px]">
          {days.map((day, index) => (
            <div key={index} className="flex-1">
              <CalendarDay 
                date={day} 
                appointments={appointments}
                isCurrentMonth={day.getMonth() === currentMonth}
                expandedId={expandedId}
                setExpandedId={setExpandedId}
              />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default CalendarView;
