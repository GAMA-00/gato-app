
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
  selectedDays?: number[];
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

  // Memoize the selected days to prevent unnecessary recreations
  const memoizedSelectedDays = useMemo(() => selectedDays, [selectedDays.join(',')]);

  // Optimized function to check recurring availability using batch queries
  const checkRecurringAvailabilityBatch = useCallback(async (date: Date, providerId: string) => {
    if (recurrence === 'once') {
      // For one-time bookings, only check the selected date
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      const { data: conflicts, error } = await supabase
        .from('appointments')
        .select('start_time, end_time')
        .eq('provider_id', providerId)
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString())
        .in('status', ['pending', 'confirmed']);
        
      if (error) {
        console.error('Error checking one-time availability:', error);
        return [];
      }
      
      // Generate available time slots for the day
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
      
      // Filter out conflicting times
      const availableTimes = availableTimeSlots.filter(timeSlot => {
        const [hours, minutes] = timeSlot.split(':').map(Number);
        const slotStart = new Date(date);
        slotStart.setHours(hours, minutes, 0, 0);
        
        const slotEnd = new Date(slotStart);
        slotEnd.setHours(hours + 1, minutes, 0, 0);
        
        return !conflicts?.some(conflict => {
          const conflictStart = new Date(conflict.start_time);
          const conflictEnd = new Date(conflict.end_time);
          
          return (
            (slotStart >= conflictStart && slotStart < conflictEnd) ||
            (slotEnd > conflictStart && slotEnd <= conflictEnd) ||
            (slotStart <= conflictStart && slotEnd >= conflictEnd)
          );
        });
      });
      
      return availableTimes;
    }

    // For recurring bookings, check future dates in batch
    const checkPeriods = 8; // Reduced from 12 to 8 for better performance
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
      }
      
      // For weekly/biweekly, check if it matches selected days
      if ((recurrence === 'weekly' || recurrence === 'biweekly') && memoizedSelectedDays.length > 0) {
        const dayOfWeek = getDay(futureDate);
        const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek;
        if (!memoizedSelectedDays.includes(adjustedDay)) {
          continue;
        }
      }
      
      futureDates.push(futureDate);
    }
    
    if (futureDates.length === 0) return [];
    
    // Batch query all future dates at once
    const startDate = new Date(Math.min(...futureDates.map(d => d.getTime())));
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(Math.max(...futureDates.map(d => d.getTime())));
    endDate.setHours(23, 59, 59, 999);
    
    const { data: allConflicts, error } = await supabase
      .from('appointments')
      .select('start_time, end_time')
      .eq('provider_id', providerId)
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString())
      .in('status', ['pending', 'confirmed']);
      
    if (error) {
      console.error('Error checking recurring availability:', error);
      return [];
    }
    
    // Generate all possible time slots
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
    
    // Check each time slot against all future dates
    const availableTimes = availableTimeSlots.filter(timeSlot => {
      const [hours, minutes] = timeSlot.split(':').map(Number);
      
      // Check if this time slot is available on ALL future dates
      return futureDates.every(checkDate => {
        const slotStart = new Date(checkDate);
        slotStart.setHours(hours, minutes, 0, 0);
        
        const slotEnd = new Date(slotStart);
        slotEnd.setHours(hours + 1, minutes, 0, 0);
        
        return !allConflicts?.some(conflict => {
          const conflictStart = new Date(conflict.start_time);
          const conflictEnd = new Date(conflict.end_time);
          
          // Check if there's overlap between slot and conflict on this date
          const sameDay = isSameDay(conflictStart, checkDate);
          if (!sameDay) return false;
          
          return (
            (slotStart >= conflictStart && slotStart < conflictEnd) ||
            (slotEnd > conflictStart && slotEnd <= conflictEnd) ||
            (slotStart <= conflictStart && slotEnd >= conflictEnd)
          );
        });
      });
    });
    
    return availableTimes;
  }, [recurrence, memoizedSelectedDays]);

  // Create a stable fetch function that won't cause infinite loops
  const fetchAvailableTimes = useCallback(
    async (date: Date, providerId: string) => {
      // Early return if already loading to prevent concurrent requests
      if (isLoading) return;
      
      setIsLoading(true);
      try {
        const availableSlots = await checkRecurringAvailabilityBatch(date, providerId);
        const formattedAvailableTimes = availableSlots.map(formatTo12Hour);
        setAvailableTimes(formattedAvailableTimes);
        
        console.log(`Found ${formattedAvailableTimes.length} available time slots for ${recurrence}`);
      } catch (error) {
        console.error('Error processing time slots:', error);
        toast({
          title: "Error",
          description: "Ocurrió un error al procesar los horarios",
          variant: "destructive"
        });
        setAvailableTimes([]);
      } finally {
        setIsLoading(false);
      }
    },
    [checkRecurringAvailabilityBatch, formatTo12Hour, recurrence, isLoading]
  );

  // Use a ref to track the last processed request to avoid duplicate calls
  const lastRequestRef = React.useRef<string>('');

  // Fetch available times for the selected date with improved dependency management
  useEffect(() => {
    if (!selectedDate || !providerId) {
      setAvailableTimes([]);
      return;
    }

    // For recurring appointments, require recurrence selection first
    if (recurrence !== 'once' && memoizedSelectedDays.length === 0) {
      setAvailableTimes([]);
      return;
    }

    // Create a unique request identifier to prevent duplicate calls
    const requestId = `${selectedDate.getTime()}-${providerId}-${recurrence}-${memoizedSelectedDays.join(',')}`;
    
    // Skip if this is the same request as the last one
    if (lastRequestRef.current === requestId) {
      return;
    }
    
    lastRequestRef.current = requestId;

    // Use a timeout to debounce the API call
    const timeoutId = setTimeout(() => {
      fetchAvailableTimes(selectedDate, providerId);
    }, 300);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [selectedDate, providerId, recurrence, memoizedSelectedDays, fetchAvailableTimes]);

  // Handle time selection with format conversion
  const handleTimeChange = useCallback((time12Hour: string) => {
    onTimeChange(formatTo24Hour(time12Hour));
  }, [formatTo24Hour, onTimeChange]);

  // Display the selected time in 12-hour format
  const displayTime = useMemo(() => 
    selectedTime ? formatTo12Hour(selectedTime) : undefined,
    [selectedTime, formatTo12Hour]
  );

  // Create a message for time slots availability
  const getTimeSlotsMessage = useCallback(() => {
    if (!selectedDate) return "";
    
    if (recurrence !== 'once' && memoizedSelectedDays.length === 0) {
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
  }, [selectedDate, recurrence, memoizedSelectedDays, availableTimes.length]);

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
                disabled={isRecurringBooking && memoizedSelectedDays.length === 0}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? (
                  format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })
                ) : (
                  <span>
                    {isRecurringBooking && memoizedSelectedDays.length === 0 
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
                  onTimeChange(''); // Reset time when date changes
                }}
                disabled={(date) => {
                  if (date < new Date() && !isSameDay(date, new Date())) return true;
                  if (date > addDays(new Date(), 30)) return true;
                  
                  // For recurring bookings, only allow dates that match selected days
                  if (isRecurringBooking && memoizedSelectedDays.length > 0) {
                    const dayOfWeek = getDay(date);
                    const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek;
                    return !memoizedSelectedDays.includes(adjustedDay);
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
        {isRecurringBooking && memoizedSelectedDays.length > 0 && (
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
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <p className="text-xs text-muted-foreground">Verificando disponibilidad...</p>
            </div>
          ) : (
            <Select 
              value={displayTime} 
              onValueChange={handleTimeChange}
              disabled={!selectedDate || availableTimes.length === 0 || (isRecurringBooking && memoizedSelectedDays.length === 0)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={
                  !selectedDate ? "Primero selecciona una fecha" :
                  isRecurringBooking && memoizedSelectedDays.length === 0 ? "Primero selecciona los días de la semana" :
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
