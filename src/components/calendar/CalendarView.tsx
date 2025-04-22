
import React, { useState } from 'react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Appointment, Client, Service } from '@/lib/types';
import { MOCK_SERVICES, MOCK_CLIENTS } from '@/lib/data';
import { cn } from '@/lib/utils';

// Mapeo de estatus a colores 
const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  confirmed:    { bg: "#F2FCE2", border: "#75C632", text: "#256029" }, // Verde
  scheduled:    { bg: "#FEC6A1", border: "#FF9100", text: "#924C00" }, // Naranja
  completed:    { bg: "#EEE", border: "#8E9196", text: "#555" }        // Gris
};

interface CalendarAppointmentProps {
  appointment: Appointment;
  service: Service;
  client: Client;
  expanded: boolean;
  onClick: () => void;
}

const CalendarAppointment: React.FC<CalendarAppointmentProps> = ({
  appointment,
  service,
  client,
  expanded,
  onClick
}) => {
  const startHour = appointment.startTime.getHours();
  const startMinutes = appointment.startTime.getMinutes();
  const durationMinutes = (appointment.endTime.getTime() - appointment.startTime.getTime()) / (1000 * 60);

  const statusColor = STATUS_COLORS[appointment.status] || STATUS_COLORS['scheduled'];

  // Mostrar solo la dirección del cliente como ubicación (primer parte)
  const location = client.address.split(',')[0];

  return (
    <div
      className={cn(
        "absolute left-1 right-1 overflow-hidden shadow transition-all duration-150 cursor-pointer rounded-lg flex flex-col border-l-4",
        expanded ? "z-20 bg-white border border-gray-200 p-3 h-fit min-h-[70px]" : "px-2 py-1 gap-0.5"
      )}
      style={{
        top: `${startHour * 60 + startMinutes}px`,
        height: expanded ? undefined : `${Math.max(durationMinutes, 36)}px`,
        background: expanded ? '#fff' : statusColor.bg,
        borderLeft: `4px solid ${statusColor.border}`,
        color: statusColor.text,
        fontWeight: 500
      }}
      title={service.name}
      onClick={onClick}
      tabIndex={0}
      role="button"
    >
      <div 
        className={cn(
          "truncate font-semibold", 
          expanded ? "text-base mb-1" : "text-xs"
        )}
        style={{ color: statusColor.text }}>
        {location}
      </div>
      <div 
        className={cn(
          "truncate",
          expanded ? "text-sm font-medium" : "text-[10px] font-normal"
        )}
        style={{ color: statusColor.text }}>
        {client.name}
      </div>
      <div 
        className={cn(
          "truncate text-muted-foreground",
          expanded ? "text-xs mt-1" : "text-[9px] mt-0.5"
        )}
        style={{ fontWeight: 400 }}>
        {service.name}
      </div>
      {expanded &&
        <div className="text-[11px] mt-1 text-gray-400">
          {/* Puedes agregar más detalles si hay campos extra requeridos */}
          <span>
            {format(appointment.startTime, "HH:mm")} - {format(appointment.endTime, "HH:mm")}
          </span>
        </div>
      }
    </div>
  );
};

interface CalendarDayProps {
  date: Date;
  appointments: Appointment[];
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
  const dayAppointments = appointments.filter(appointment => 
    isSameDay(appointment.startTime, date) && 
    appointment.endTime.getHours() <= 20
  );
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
          const service = MOCK_SERVICES.find(s => s.id === appointment.serviceId)!;
          const client = MOCK_CLIENTS.find(c => c.id === appointment.clientId)!;
          return (
            <CalendarAppointment
              key={appointment.id}
              appointment={appointment}
              service={service}
              client={client}
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
  appointments: Appointment[];
}

const CalendarView: React.FC<CalendarViewProps> = ({ appointments }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const startDate = startOfWeek(currentDate, { weekStartsOn: 0 });
  const endDate = endOfWeek(currentDate, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const currentMonth = currentDate.getMonth();

  const handlePreviousWeek = () => {
    setCurrentDate(prevDate => addDays(prevDate, -7));
    setExpandedId(null);
  };

  const handleNextWeek = () => {
    setCurrentDate(prevDate => addDays(prevDate, 7));
    setExpandedId(null);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
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
