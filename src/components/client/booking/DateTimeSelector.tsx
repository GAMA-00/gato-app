
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useProviderAvailability } from '@/hooks/useProviderAvailability';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  
  const { 
    availableTimeSlots, 
    isLoading, 
    isRefreshing, 
    lastUpdated, 
    refreshAvailability 
  } = useProviderAvailability({
    providerId,
    selectedDate: selectedDate || new Date(),
    serviceDuration,
    recurrence: selectedFrequency
  });

  // Log availability data for debugging
  React.useEffect(() => {
    if (selectedDate) {
      console.log('DateTimeSelector - Provider ID:', providerId);
      console.log('DateTimeSelector - Selected date:', format(selectedDate, 'yyyy-MM-dd'));
      console.log('DateTimeSelector - Service duration:', serviceDuration);
      console.log('DateTimeSelector - Frequency:', selectedFrequency);
      console.log('DateTimeSelector - Available slots:', availableTimeSlots);
      console.log('DateTimeSelector - Is loading:', isLoading);
    }
  }, [availableTimeSlots, selectedDate, providerId, serviceDuration, selectedFrequency, isLoading]);

  // Format time in 12-hour format for display
  const formatTimeTo12Hour = (time24: string): string => {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const getRecurrenceText = (frequency: string) => {
    switch (frequency) {
      case 'weekly': return 'semanal';
      case 'biweekly': return 'quincenal';
      case 'monthly': return 'mensual';
      default: return '';
    }
  };

  const formatLastUpdated = (date: Date | null) => {
    if (!date) return '';
    return format(date, "HH:mm:ss");
  };

  // Clear selected time when date changes or no slots available
  React.useEffect(() => {
    if (selectedTime && availableTimeSlots.length > 0) {
      const isSelectedTimeAvailable = availableTimeSlots.some(slot => slot.time === selectedTime);
      if (!isSelectedTimeAvailable) {
        onTimeChange('');
      }
    }
  }, [availableTimeSlots, selectedTime, onTimeChange]);

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
              {selectedFrequency !== 'once' && (
                <span className="text-sm text-gray-600 block mt-1">
                  Esta será la fecha de inicio de la recurrencia {getRecurrenceText(selectedFrequency)}
                </span>
              )}
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
          
          {/* Recurrence Info Alert */}
          {selectedFrequency !== 'once' && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Al seleccionar una recurrencia {getRecurrenceText(selectedFrequency)}, se creará una reserva automática 
                que se repetirá indefinidamente hasta que sea cancelada por el cliente o proveedor.
              </AlertDescription>
            </Alert>
          )}
          
          {/* Time Selection Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-medium">
                Selecciona la hora
              </Label>
              
              {/* Refresh Button */}
              <div className="flex items-center gap-2">
                {lastUpdated && (
                  <span className="text-xs text-gray-500">
                    Actualizado: {formatLastUpdated(lastUpdated)}
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshAvailability}
                  disabled={isRefreshing || !selectedDate}
                  className="h-8 px-3"
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Actualizando...' : 'Actualizar'}
                </Button>
              </div>
            </div>
            
            {selectedDate ? (
              <div className="space-y-4">
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="text-gray-500 flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Verificando disponibilidad...
                    </div>
                  </div>
                ) : availableTimeSlots.length > 0 ? (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700">
                        Horarios disponibles ({availableTimeSlots.length})
                        {selectedFrequency !== 'once' && (
                          <span className="text-gray-600 ml-1">
                            (considerando recurrencia {getRecurrenceText(selectedFrequency)})
                          </span>
                        )}
                      </span>
                    </div>
                    
                    <Select value={selectedTime} onValueChange={onTimeChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecciona una hora" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {availableTimeSlots.map((slot) => (
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
                          considerando la recurrencia {getRecurrenceText(selectedFrequency)}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-400">
                      {selectedDate && format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
                    </div>
                    <div className="text-xs text-gray-400 mt-2">
                      Todos los horarios están ocupados o bloqueados
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={refreshAvailability}
                      className="mt-3"
                      disabled={isRefreshing}
                    >
                      <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                      Intentar de nuevo
                    </Button>
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
