
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { format, addDays, isSameDay, addWeeks, addMonths, getDay } from 'date-fns';
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
  recurrence?: string;
}

const DateTimeSelector = ({
  selectedDate,
  onDateChange,
  selectedTime,
  onTimeChange,
  providerId,
  recurrence = 'once'
}: DateTimeSelectorProps) => {
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Function to convert 24-hour format to 12-hour format with AM/PM
  const formatTo12Hour = useCallback((time24: string): string => {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  }, []);

  // Function to convert 12-hour format back to 24-hour format for internal use
  const formatTo24Hour = useCallback((time12: string): string => {
    const [timePart, period] = time12.split(' ');
    let [hours, minutes] = timePart.split(':').map(Number);
    
    if (period === 'PM' && hours < 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }, []);

  // Function to get future dates based on recurrence and selected date
  const getFutureDates = useCallback((startDate: Date, recurrenceType: string, periods: number = 8) => {
    const futureDates: Date[] = [];
    
    for (let i = 0; i < periods; i++) {
      let futureDate = new Date(startDate);
      
      switch (recurrenceType) {
        case 'weekly':
          futureDate = addWeeks(startDate, i);
          break;
        case 'biweekly':
          futureDate = addWeeks(startDate, i * 2);
          break;
        case 'monthly':
          futureDate = addMonths(startDate, i);
          break;
        default: // 'once'
          if (i === 0) futureDates.push(startDate);
          break;
      }
      
      if (recurrenceType !== 'once') {
        futureDates.push(futureDate);
      }
    }
    
    return futureDates;
  }, []);

  // Check availability for recurring bookings
  const checkRecurringAvailability = useCallback(async (date: Date, providerId: string, recurrenceType: string) => {
    if (!date || !providerId) return [];
    
    setIsLoading(true);
    
    try {
      // Get future dates based on recurrence
      const futureDates = getFutureDates(date, recurrenceType);
      
      if (futureDates.length === 0) return [];
      
      // Query appointments for all future dates
      const startDate = new Date(Math.min(...futureDates.map(d => d.getTime())));
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(Math.max(...futureDates.map(d => d.getTime())));
      endDate.setHours(23, 59, 59, 999);
      
      console.log(`Checking availability for ${recurrenceType} recurrence:`, {
        dates: futureDates.map(d => format(d, 'yyyy-MM-dd')),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      
      const { data: conflicts, error } = await supabase
        .from('appointments')
        .select('start_time, end_time')
        .eq('provider_id', providerId)
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString())
        .in('status', ['pending', 'confirmed']);
        
      if (error) {
        console.error('Error checking availability:', error);
        return [];
      }
      
      // Generate all possible time slots (8 AM to 8 PM)
      const allTimeSlots = [];
      for (let hour = 8; hour <= 19; hour++) {
        allTimeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
      }
      
      // Filter out past times if today is selected
      let availableTimeSlots = allTimeSlots;
      const now = new Date();
      if (isSameDay(date, now)) {
        const minTimeHour = now.getHours() + 1;
        availableTimeSlots = allTimeSlots.filter(time => {
          const timeHour = parseInt(time.split(':')[0], 10);
          return timeHour >= minTimeHour;
        });
      }
      
      // For recurring appointments, check if each time slot is available on ALL future dates
      const availableTimes = availableTimeSlots.filter(timeSlot => {
        const [hours, minutes] = timeSlot.split(':').map(Number);
        
        // Check if this time slot is available on ALL future dates
        return futureDates.every(checkDate => {
          const slotStart = new Date(checkDate);
          slotStart.setHours(hours, minutes, 0, 0);
          
          const slotEnd = new Date(slotStart);
          slotEnd.setHours(hours + 1, minutes, 0, 0);
          
          // Check if there's no conflict on this specific date
          return !conflicts?.some(conflict => {
            const conflictStart = new Date(conflict.start_time);
            const conflictEnd = new Date(conflict.end_time);
            
            // Only consider conflicts on the same date
            if (!isSameDay(conflictStart, checkDate)) return false;
            
            // Check for overlap
            return (
              (slotStart >= conflictStart && slotStart < conflictEnd) ||
              (slotEnd > conflictStart && slotEnd <= conflictEnd) ||
              (slotStart <= conflictStart && slotEnd >= conflictEnd)
            );
          });
        });
      });
      
      console.log(`Found ${availableTimes.length} available slots for ${recurrenceType}:`, availableTimes);
      return availableTimes;
      
    } catch (error) {
      console.error('Error checking recurring availability:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [getFutureDates]);

  // Fetch available times when date, provider, or recurrence changes
  useEffect(() => {
    if (!selectedDate || !providerId) {
      setAvailableTimes([]);
      return;
    }

    const fetchTimes = async () => {
      const availableSlots = await checkRecurringAvailability(selectedDate, providerId, recurrence);
      const formattedTimes = availableSlots.map(formatTo12Hour);
      setAvailableTimes(formattedTimes);
    };

    // Debounce the API call
    const timeoutId = setTimeout(fetchTimes, 300);
    return () => clearTimeout(timeoutId);
  }, [selectedDate, providerId, recurrence, checkRecurringAvailability, formatTo12Hour]);

  // Handle time selection with format conversion
  const handleTimeChange = useCallback((time12Hour: string) => {
    onTimeChange(formatTo24Hour(time12Hour));
  }, [formatTo24Hour, onTimeChange]);

  // Display the selected time in 12-hour format
  const displayTime = useMemo(() => 
    selectedTime ? formatTo12Hour(selectedTime) : undefined,
    [selectedTime, formatTo12Hour]
  );

  // Get message for time slots availability
  const getTimeSlotsMessage = useCallback(() => {
    if (!selectedDate) return "";
    
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
  }, [selectedDate, recurrence, availableTimes.length]);

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
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? (
                  format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })
                ) : (
                  <span>Seleccionar fecha</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={date => {
                  onDateChange(date);
                  onTimeChange(''); // Reset time when date changes
                }}
                disabled={(date) => {
                  if (date < new Date() && !isSameDay(date, new Date())) return true;
                  if (date > addDays(new Date(), 30)) return true;
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
        {isRecurringBooking && (
          <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Reserva recurrente:</strong> Este horario se reservará automáticamente 
              {recurrence === 'weekly' ? ' cada semana' : 
               recurrence === 'biweekly' ? ' cada 2 semanas' : 
               ' cada mes'} en el mismo día de la semana.
            </p>
          </div>
        )}

        {/* Time Selector */}
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">Hora</label>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <p className="text-xs text-muted-foreground">
                Verificando disponibilidad {isRecurringBooking ? 'recurrente' : ''}...
              </p>
            </div>
          ) : (
            <Select 
              value={displayTime} 
              onValueChange={handleTimeChange}
              disabled={!selectedDate || availableTimes.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={
                  !selectedDate ? "Primero selecciona una fecha" :
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
          
          {isRecurringBooking && availableTimes.length > 0 && (
            <p className="text-xs text-green-600 mt-1">
              ✓ Horarios verificados para disponibilidad recurrente
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DateTimeSelector;
