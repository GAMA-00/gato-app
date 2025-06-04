
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useProviderAvailability } from '@/hooks/useProviderAvailability';

interface DateTimeSelectorProps {
  selectedDate: Date | undefined;
  selectedTime: string | undefined;
  onDateChange: (date: Date | undefined) => void;
  onTimeChange: (time: string) => void;
  providerId: string;
  serviceDuration: number;
  selectedFrequency?: string;
}

const DateTimeSelector = ({ 
  selectedDate, 
  selectedTime,
  onDateChange, 
  onTimeChange,
  providerId,
  serviceDuration,
  selectedFrequency = 'once'
}: DateTimeSelectorProps) => {
  
  const { availableTimeSlots } = useProviderAvailability({
    providerId,
    selectedDate: selectedDate || new Date(),
    serviceDuration,
    recurrence: selectedFrequency
  });

  const availableSlots = availableTimeSlots.filter(slot => slot.available);

  // Format time in 12-hour format for display
  const formatTimeTo12Hour = (time24: string): string => {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <Card className="shadow-md">
      <CardContent className="pt-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="inline-flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
            <CalendarIcon className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-xl font-semibold">Fecha y hora</h2>
        </div>
        
        <div className="space-y-6">
          {/* Calendar Section */}
          <div>
            <Label className="text-base font-medium mb-3 block">
              Selecciona la fecha
            </Label>
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={onDateChange}
                disabled={(date) => date < new Date() || date < new Date(Date.now() - 86400000)}
                className="rounded-md border w-fit"
                locale={es}
              />
            </div>
          </div>
          
          {/* Time Selection Section */}
          <div>
            <Label className="text-base font-medium mb-3 block">
              Selecciona la hora
            </Label>
            {selectedDate ? (
              <div className="space-y-4">
                {availableSlots.length > 0 ? (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700">
                        Horarios disponibles
                        {selectedFrequency !== 'once' && (
                          <span className="text-gray-600 ml-1">
                            (considerando recurrencia {
                              selectedFrequency === 'weekly' ? 'semanal' :
                              selectedFrequency === 'biweekly' ? 'quincenal' : 
                              selectedFrequency === 'monthly' ? 'mensual' : selectedFrequency
                            })
                          </span>
                        )}
                      </span>
                    </div>
                    
                    <Select value={selectedTime} onValueChange={onTimeChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecciona una hora" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {availableSlots.map((slot) => (
                          <SelectItem key={slot.time} value={slot.time}>
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3 text-green-600" />
                              <span>{formatTimeTo12Hour(slot.time)}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-500 mb-2">
                      No hay horarios disponibles para esta fecha
                      {selectedFrequency !== 'once' && (
                        <span className="block text-sm text-gray-400 mt-1">
                          considerando la recurrencia {
                            selectedFrequency === 'weekly' ? 'semanal' :
                            selectedFrequency === 'biweekly' ? 'quincenal' : 
                            selectedFrequency === 'monthly' ? 'mensual' : selectedFrequency
                          }
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-400">
                      {selectedDate && format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Primero selecciona una fecha
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DateTimeSelector;
