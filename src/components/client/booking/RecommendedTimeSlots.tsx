
import { useState } from 'react';
import { format, addDays, isSameDay, setHours, setMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Clock, Calendar as CalendarIcon } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface TimeSlot {
  startTime: Date;
  endTime: Date;
  isRecommended: boolean;
}

interface RecommendedTimeSlotsProps {
  serviceDuration: number; // in minutes
  onSelectTimeSlot: (slot: TimeSlot) => void;
  selectedTimeSlot: TimeSlot | null;
  providerAppointments: any[]; // This would be the provider's current appointments
}

const RecommendedTimeSlots = ({
  serviceDuration,
  onSelectTimeSlot,
  selectedTimeSlot,
  providerAppointments = []
}: RecommendedTimeSlotsProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  // Generate time slots for the selected date
  const generateTimeSlots = (date: Date): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const startHour = 8; // 8 AM
    const endHour = 18; // 6 PM
    
    // Convert appointments for selected date to time ranges
    const dateAppointments = providerAppointments.filter(app => 
      isSameDay(new Date(app.startTime || app.start_time), date)
    );
    
    // Sort appointments by time
    const sortedAppointments = [...dateAppointments].sort((a, b) => 
      new Date(a.startTime || a.start_time).getTime() - new Date(b.startTime || b.start_time).getTime()
    );
    
    // Generate all possible time slots for the day
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const startTime = setMinutes(setHours(new Date(date), hour), minute);
        const endTime = new Date(startTime.getTime() + serviceDuration * 60000);
        
        // Check if this time slot overlaps with any existing appointment
        const isAvailable = !sortedAppointments.some(app => {
          const appStart = new Date(app.startTime || app.start_time);
          const appEnd = new Date(app.endTime || app.end_time);
          return (
            (startTime >= appStart && startTime < appEnd) ||
            (endTime > appStart && endTime <= appEnd) ||
            (startTime <= appStart && endTime >= appEnd)
          );
        });
        
        if (isAvailable) {
          // Determine if this slot is recommended (adjacent to existing appointment)
          let isRecommended = false;
          
          sortedAppointments.forEach(app => {
            const appStart = new Date(app.startTime || app.start_time);
            const appEnd = new Date(app.endTime || app.end_time);
            
            // If slot starts right after an appointment ends or ends right before an appointment starts
            if (
              (Math.abs(startTime.getTime() - appEnd.getTime()) < 5 * 60000) ||
              (Math.abs(appStart.getTime() - endTime.getTime()) < 5 * 60000)
            ) {
              isRecommended = true;
            }
          });
          
          slots.push({
            startTime,
            endTime,
            isRecommended
          });
        }
      }
    }
    
    // If no recommended slots, mark the earliest available slot as recommended
    if (slots.length > 0 && !slots.some(slot => slot.isRecommended)) {
      slots[0].isRecommended = true;
    }
    
    return slots;
  };
  
  const timeSlots = generateTimeSlots(selectedDate);
  
  // Group time slots by hour for better UI organization
  const timeSlotsByHour: { [hour: string]: TimeSlot[] } = {};
  
  timeSlots.forEach(slot => {
    const hourKey = format(slot.startTime, 'HH:mm');
    if (!timeSlotsByHour[hourKey]) {
      timeSlotsByHour[hourKey] = [];
    }
    timeSlotsByHour[hourKey].push(slot);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Seleccionar Fecha y Hora</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Date selector */}
          <div className="flex items-center space-x-2">
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? (
                    format(selectedDate, "PPP", { locale: es })
                  ) : (
                    <span>Seleccionar fecha</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date || new Date());
                    setCalendarOpen(false);
                  }}
                  initialFocus
                  disabled={(date) => date < new Date()}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          
          {/* Time slots */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Horarios disponibles:</h3>
            {Object.keys(timeSlotsByHour).length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(timeSlotsByHour).map(([hour, slots]) => (
                  slots.map((slot, index) => (
                    <Button
                      key={`${hour}-${index}`}
                      variant={selectedTimeSlot && isSameDay(selectedTimeSlot.startTime, slot.startTime) && 
                        selectedTimeSlot.startTime.getTime() === slot.startTime.getTime() ? "default" : "outline"}
                      className={cn(
                        "w-full justify-center py-2 px-2 text-sm", 
                        slot.isRecommended && "border-green-500 bg-green-50 hover:bg-green-100"
                      )}
                      onClick={() => onSelectTimeSlot(slot)}
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      <span className="whitespace-nowrap">{format(slot.startTime, 'HH:mm')}</span>
                      {slot.isRecommended && (
                        <span className="ml-1 text-xs text-green-600 font-medium">(recomendado)</span>
                      )}
                    </Button>
                  ))
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No hay horarios disponibles para esta fecha</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecommendedTimeSlots;
