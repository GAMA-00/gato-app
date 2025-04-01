import React, { useState } from 'react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Appointment, Client, Service } from '@/lib/types';
import { MOCK_SERVICES, MOCK_CLIENTS, SERVICE_CATEGORIES } from '@/lib/data';
import { cn } from '@/lib/utils';

interface CalendarAppointmentProps {
  appointment: Appointment;
  service: Service;
  client: Client;
}

const CalendarAppointment: React.FC<CalendarAppointmentProps> = ({
  appointment,
  service,
  client
}) => {
  const startHour = appointment.startTime.getHours();
  const startMinutes = appointment.startTime.getMinutes();
  const durationMinutes = (appointment.endTime.getTime() - appointment.startTime.getTime()) / (1000 * 60);
  
  const categoryColor = SERVICE_CATEGORIES[service.category].color;
  
  return (
    <div 
      className="absolute left-1 right-1 rounded-md p-2 overflow-hidden text-xs shadow-sm transition-all duration-200 cursor-pointer hover:shadow-md"
      style={{
        top: `${startHour * 60 + startMinutes}px`,
        height: `${durationMinutes}px`,
        backgroundColor: `${categoryColor}20`,
        borderLeft: `3px solid ${categoryColor}`
      }}
    >
      <div className="font-medium truncate" style={{ color: categoryColor }}>
        {service.name}
      </div>
      <div className="truncate text-muted-foreground">
        {client.name}
      </div>
      <div className="truncate text-muted-foreground">
        {format(appointment.startTime, 'h:mm a')} - {format(appointment.endTime, 'h:mm a')}
      </div>
    </div>
  );
};

interface CalendarDayProps {
  date: Date;
  appointments: Appointment[];
  isCurrentMonth: boolean;
}

const CalendarDay: React.FC<CalendarDayProps> = ({
  date,
  appointments,
  isCurrentMonth
}) => {
  const dayAppointments = appointments.filter(appointment => 
    isSameDay(appointment.startTime, date)
  );
  
  const hours = Array.from({ length: 12 }, (_, i) => i + 8);
  
  return (
    <div className="h-[1000px] relative border-r last:border-r-0 calendar-day">
      <div 
        className={cn(
          "sticky top-0 py-2 text-center border-b z-10",
          isToday(date) ? "bg-primary/5" : "bg-white"
        )}
      >
        <div 
          className={cn(
            "text-xs uppercase tracking-wide mb-1",
            !isCurrentMonth && "text-muted-foreground",
          )}
        >
          {format(date, 'EEE')}
        </div>
        <div 
          className={cn(
            "flex items-center justify-center",
            !isCurrentMonth && "text-muted-foreground",
            isToday(date) && "font-bold text-primary"
          )}
        >
          {isToday(date) ? (
            <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              {format(date, 'd')}
            </div>
          ) : (
            format(date, 'd')
          )}
        </div>
      </div>
      
      <div className="relative h-full">
        {hours.map((hour) => (
          <div key={hour} className="border-b h-[60px]">
            <div className="absolute left-1 -mt-2 px-1 text-xs text-muted-foreground select-none bg-white">
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
  
  const startDate = startOfWeek(currentDate, { weekStartsOn: 0 });
  const endDate = endOfWeek(currentDate, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  
  const currentMonth = currentDate.getMonth();
  
  const handlePreviousWeek = () => {
    setCurrentDate(prevDate => addDays(prevDate, -7));
  };
  
  const handleNextWeek = () => {
    setCurrentDate(prevDate => addDays(prevDate, 7));
  };
  
  const handleToday = () => {
    setCurrentDate(new Date());
  };
  
  return (
    <Card className="overflow-hidden border-0 shadow-medium">
      <div className="p-4 flex items-center justify-between border-b bg-white">
        <h2 className="text-xl font-semibold">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleToday}>
            Today
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
              />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default CalendarView;
