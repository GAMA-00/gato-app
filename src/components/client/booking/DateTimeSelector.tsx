
import React, { useState, useEffect } from 'react';
import { format, addDays, isSameDay, addHours, addWeeks, addMonths, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CalendarIcon, Clock } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';

interface DateTimeSelectorProps {
  selectedDate: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  selectedTime: string | undefined;
  onTimeChange: (time: string) => void;
  providerId?: string;
  recurrence?: string; // 'once', 'weekly', 'biweekly', 'monthly'
  selectedDays?: number[]; // Days of the week (1-7, Monday-Sunday)
}

const DateTimeSelector = ({
  selectedDate,
  onDateChange,
  selectedTime,
  onTimeChange,
  providerId,
  recurrence = 'once',
  selectedDays = []
}: DateTimeSelectorProps) => {
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Function to convert 24-hour format to 12-hour format with AM/PM
  const formatTo12Hour = (time24: string): string => {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Function to convert 12-hour format back to 24-hour format for internal use
  const formatTo24Hour = (time12: string): string => {
    const [timePart, period] = time12.split(' ');
    let [hours, minutes] = timePart.split(':').map(Number);
    
    if (period === 'PM' && hours < 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  // Function to check if a time slot is available for recurring appointments
  const checkRecurringAvailability = async (date: Date, timeSlot: string, providerId: string) => {
    const [hours, minutes] = timeSlot.split(':').map(Number);
    
    // Calculate the number of future appointments to check based on recurrence
    const checkPeriods = 12; // Check 12 periods ahead
    const futureDates: Date[] = [];
    
    for (let i = 0; i < checkPeriods; i++) {
      let futureDate = new Date(date);
      
      switch (recurrence) {
        case 'weekly':
          futureDate = addWeeks(date, i);
          break;
        case 'biweekly':
          futureDate = addWeeks(date, i * 2);
          break;
        case 'monthly':
          futureDate = addMonths(date, i);
          break;
        default:
          return true; // For 'once', no need to check future dates
      }
      
      // For weekly/biweekly, check if it matches selected days
      if ((recurrence === 'weekly' || recurrence === 'biweekly') && selectedDays.length > 0) {
        const dayOfWeek = getDay(futureDate);
        const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek; // Convert Sunday from 0 to 7
        if (!selectedDays.includes(adjustedDay)) {
          continue; // Skip dates that don't match selected days
        }
      }
      
      futureDates.push(futureDate);
    }
    
    // Check availability for all future dates
    for (const checkDate of futureDates) {
      const startOfDay = new Date(checkDate);
      startOfDay.setHours(hours, minutes, 0, 0);
      
      const endOfDay = new Date(checkDate);
      endOfDay.setHours(hours + 1, minutes, 0, 0); // Assuming 1-hour slots
      
      const { data: conflicts, error } = await supabase
        .from('appointments')
        .select('id')
        .eq('provider_id', providerId)
        .gte('start_time', startOfDay.toISOString())
        .lt('start_time', endOfDay.toISOString())
        .in('status', ['pending', 'confirmed']);
        
      if (error) {
        console.error('Error checking recurring availability:', error);
        return false;
      }
      
      if (conflicts && conflicts.length > 0) {
        console.log(`Conflict found on ${format(checkDate, 'yyyy-MM-dd')} at ${timeSlot}`);
        return false; // Found a conflict, this time slot is not available
      }
    }
    
    return true; // All future dates are available
  };

  // Fetch available times for the selected date
  useEffect(() => {
    const fetchAvailableTimes = async () => {
      if (!selectedDate || !providerId) {
        setAvailableTimes([]);
        return;
      }

      // For recurring appointments, require recurrence selection first
      if (recurrence !== 'once' && selectedDays.length === 0) {
        setAvailableTimes([]);
        return;
      }

      setIsLoading(true);
      try {
        // Generate all possible time slots (hourly from 8 AM to 7 PM)
        const allTimeSlots = [];
        for (let hour = 8; hour <= 19; hour++) {
          allTimeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
        }

        // Filter out past times if today is selected
        let availableTimeSlots = allTimeSlots;
        const now = new Date();
        if (isSameDay(selectedDate, now)) {
          const minTimeHour = now.getHours() + 1;
          availableTimeSlots = allTimeSlots.filter(time => {
            const timeHour = parseInt(time.split(':')[0], 10);
            return timeHour >= minTimeHour;
          });
        }

        // Check availability for each time slot
        const availableRecurringTimes = [];
        
        for (const timeSlot of availableTimeSlots) {
          const isAvailable = await checkRecurringAvailability(selectedDate, timeSlot, providerId);
          if (isAvailable) {
            availableRecurringTimes.push(timeSlot);
          }
        }
        
        // Convert to 12-hour format for display
        const formattedAvailableTimes = availableRecurringTimes.map(formatTo12Hour);
        
        setAvailableTimes(formattedAvailableTimes);
        
        console.log(`Found ${formattedAvailableTimes.length} available recurring time slots for ${recurrence}`);
        
      } catch (error) {
        console.error('Error processing time slots:', error);
        toast({
          title: "Error",
          description: "Ocurrió un error al procesar los horarios",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvailableTimes();
  }, [selectedDate, providerId, recurrence, selectedDays]);

  // Handle time selection with format conversion
  const handleTimeChange = (time12Hour: string) => {
    onTimeChange(formatTo24Hour(time12Hour));
  };

  // Display the selected time in 12-hour format
  const displayTime = selectedTime ? formatTo12Hour(selectedTime) : undefined;

  // Create a message for time slots availability
  const getTimeSlotsMessage = () => {
    if (!selectedDate) return "";
    
    if (recurrence !== 'once' && selectedDays.length === 0) {
      return "Primero selecciona los días de la semana para la recurrencia";
    }
    
    const now = new Date();
    if (isSameDay(selectedDate, now) && availableTimes.length === 0) {
      return "No quedan horarios disponibles para hoy con la recurrencia seleccionada.";
    }
    
    if (availableTimes.length === 0) {
      return recurrence === 'once' 
        ? "No hay horarios disponibles para esta fecha"
        : "No hay horarios que estén libres de forma continua para la recurrencia seleccionada";
    }
    
    return "";
  };

  const isRecurringBooking = recurrence !== 'once';

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">
          Fecha y hora
          {isRecurringBooking && (
            <span className="text-sm font-normal text-muted-foreground ml-2">
              (Reserva {recurrence === 'weekly' ? 'semanal' : recurrence === 'biweekly' ? 'quincenal' : 'mensual'})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Selector */}
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">
            {isRecurringBooking ? 'Fecha de inicio' : 'Fecha'}
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
                disabled={isRecurringBooking && selectedDays.length === 0}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? (
                  format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })
                ) : (
                  <span>
                    {isRecurringBooking && selectedDays.length === 0 
                      ? "Primero selecciona los días de la semana" 
                      : "Seleccionar fecha"}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={date => {
                  onDateChange(date);
                  onTimeChange(undefined); // Reset time when date changes
                }}
                disabled={(date) => {
                  if (date < new Date() && !isSameDay(date, new Date())) return true;
                  if (date > addDays(new Date(), 30)) return true;
                  
                  // For recurring bookings, only allow dates that match selected days
                  if (isRecurringBooking && selectedDays.length > 0) {
                    const dayOfWeek = getDay(date);
                    const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek;
                    return !selectedDays.includes(adjustedDay);
                  }
                  
                  return false;
                }}
                initialFocus
                locale={es}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Recurring booking info */}
        {isRecurringBooking && selectedDays.length > 0 && (
          <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Reserva recurrente:</strong> Este horario se reservará automáticamente 
              {recurrence === 'weekly' ? ' cada semana' : 
               recurrence === 'biweekly' ? ' cada 2 semanas' : 
               ' cada mes'} en los días seleccionados.
            </p>
          </div>
        )}

        {/* Time Selector */}
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">Hora</label>
          {isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Select 
              value={displayTime} 
              onValueChange={handleTimeChange}
              disabled={!selectedDate || availableTimes.length === 0 || (isRecurringBooking && selectedDays.length === 0)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={
                  !selectedDate ? "Primero selecciona una fecha" :
                  isRecurringBooking && selectedDays.length === 0 ? "Primero selecciona los días de la semana" :
                  availableTimes.length === 0 ? "No hay horarios disponibles" :
                  "Seleccionar hora"
                }>
                  {displayTime && (
                    <div className="flex items-center">
                      <Clock className="mr-2 h-4 w-4" />
                      {displayTime}
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {availableTimes.length === 0 && selectedDate ? (
                  <div className="p-2 text-center text-sm text-muted-foreground">
                    {getTimeSlotsMessage()}
                  </div>
                ) : (
                  availableTimes.map((time) => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DateTimeSelector;
