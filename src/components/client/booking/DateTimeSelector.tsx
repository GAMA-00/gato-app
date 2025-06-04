
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useProviderAvailability } from '@/hooks/useProviderAvailability';

interface DateTimeSelectorProps {
  selectedDate: Date | undefined;
  selectedTime: string;
  onDateChange: (date: Date | undefined) => void;
  onTimeChange: (time: string) => void;
  providerId: string;
  serviceDuration: number;
}

const DateTimeSelector = ({ 
  selectedDate, 
  selectedTime,
  onDateChange, 
  onTimeChange,
  providerId,
  serviceDuration
}: DateTimeSelectorProps) => {
  
  const { availableTimeSlots } = useProviderAvailability({
    providerId,
    selectedDate: selectedDate || new Date(),
    serviceDuration
  });

  const availableSlots = availableTimeSlots.filter(slot => slot.available);
  const unavailableSlots = availableTimeSlots.filter(slot => !slot.available);

  return (
    <Card className="shadow-md">
      <CardContent className="pt-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="inline-flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
            <CalendarIcon className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-xl font-semibold">Fecha y hora</h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Calendar */}
          <div>
            <Label className="text-base font-medium mb-3 block">
              Selecciona la fecha
            </Label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={onDateChange}
              disabled={(date) => date < new Date() || date < new Date(Date.now() - 86400000)}
              className="rounded-md border"
              locale={es}
            />
          </div>
          
          {/* Time Selection */}
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
                      </span>
                    </div>
                    <RadioGroup value={selectedTime} onValueChange={onTimeChange}>
                      <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                        {availableSlots.map((slot) => (
                          <div 
                            key={slot.time} 
                            className="flex items-center space-x-2 p-2 border rounded-lg hover:bg-gray-50"
                          >
                            <RadioGroupItem value={slot.time} id={slot.time} />
                            <Label htmlFor={slot.time} className="cursor-pointer text-sm">
                              {slot.time}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-500 mb-2">
                      No hay horarios disponibles para esta fecha
                    </div>
                    <div className="text-sm text-gray-400">
                      {selectedDate && format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
                    </div>
                  </div>
                )}
                
                {unavailableSlots.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-600">
                        Horarios no disponibles
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                      {unavailableSlots.slice(0, 8).map((slot) => (
                        <div 
                          key={slot.time} 
                          className="p-2 border rounded-lg bg-gray-50 opacity-60"
                          title={slot.reason}
                        >
                          <span className="text-sm text-gray-500">{slot.time}</span>
                          <div className="text-xs text-gray-400 mt-1">
                            {slot.reason}
                          </div>
                        </div>
                      ))}
                    </div>
                    {unavailableSlots.length > 8 && (
                      <div className="text-xs text-gray-400 mt-2">
                        Y {unavailableSlots.length - 8} horarios más no disponibles...
                      </div>
                    )}
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
