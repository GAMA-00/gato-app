
import React, { useState, useEffect } from 'react';
import { format, addDays, isSameDay, addHours } from 'date-fns';
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
  providerId?: string; // Provider ID to check availability
}

const DateTimeSelector = ({
  selectedDate,
  onDateChange,
  selectedTime,
  onTimeChange,
  providerId
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

  // Fetch available times for the selected date
  useEffect(() => {
    const fetchAvailableTimes = async () => {
      if (!selectedDate || !providerId) {
        setAvailableTimes([]);
        return;
      }

      setIsLoading(true);
      try {
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

        // Fetch booked appointments for the provider on the selected date
        const { data: bookedAppointments, error } = await supabase
          .from('appointments')
          .select('start_time, end_time')
          .eq('provider_id', providerId)
          .gte('start_time', startOfDay.toISOString())
          .lte('start_time', endOfDay.toISOString())
          .in('status', ['pending', 'confirmed']);

        if (error) {
          console.error('Error fetching booked appointments:', error);
          toast({
            title: "Error",
            description: "No pudimos obtener los horarios disponibles",
            variant: "destructive"
          });
          return;
        }

        // Generate all possible time slots (hourly from 8 AM to 7 PM)
        const allTimeSlots = [];
        for (let hour = 8; hour <= 19; hour++) {
          allTimeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
        }

        // Filter out booked time slots
        const bookedTimes = new Set();
        bookedAppointments?.forEach(appointment => {
          const appointmentStart = new Date(appointment.start_time);
          const appointmentEnd = new Date(appointment.end_time);
          
          // Mark all hours that are covered by this appointment
          let currentHour = new Date(appointmentStart);
          currentHour.setMinutes(0, 0, 0);
          
          while (currentHour < appointmentEnd) {
            const timeString = `${currentHour.getHours().toString().padStart(2, '0')}:00`;
            bookedTimes.add(timeString);
            currentHour.setHours(currentHour.getHours() + 1);
          }
        });

        // Get available times (not booked)
        let available = allTimeSlots.filter(time => !bookedTimes.has(time));
        
        // If today is selected, filter out past times plus an hour buffer
        const now = new Date();
        if (isSameDay(selectedDate, now)) {
          // Calculate minimum hour (current hour + 1)
          const minTimeHour = now.getHours() + 1;
          
          // Filter times to only include those at least an hour from now
          available = available.filter(time => {
            const timeHour = parseInt(time.split(':')[0], 10);
            return timeHour >= minTimeHour;
          });
        }
        
        // Convert to 12-hour format for display
        const formattedAvailableTimes = available.map(formatTo12Hour);
        
        setAvailableTimes(formattedAvailableTimes);
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
  }, [selectedDate, providerId]);

  // Handle time selection with format conversion
  const handleTimeChange = (time12Hour: string) => {
    onTimeChange(formatTo24Hour(time12Hour));
  };

  // Display the selected time in 12-hour format
  const displayTime = selectedTime ? formatTo12Hour(selectedTime) : undefined;

  // Create a message for today's time slots
  const getTimeSlotsMessage = () => {
    if (!selectedDate) return "";
    
    const now = new Date();
    if (isSameDay(selectedDate, now) && availableTimes.length === 0) {
      return "No quedan horarios disponibles para hoy. Por favor selecciona otro día.";
    }
    
    return availableTimes.length === 0 ? "No hay horarios disponibles para esta fecha" : "";
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Fecha y hora</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Selector */}
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">Fecha</label>
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
                  onTimeChange(undefined); // Reset time when date changes
                }}
                disabled={(date) => date < new Date() && !isSameDay(date, new Date()) || date > addDays(new Date(), 30)}
                initialFocus
                locale={es}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Time Selector */}
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">Hora</label>
          {isLoading ? (
            <Skeleton className="h-10 w-full" />
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
        </div>
      </CardContent>
    </Card>
  );
};

export default DateTimeSelector;
