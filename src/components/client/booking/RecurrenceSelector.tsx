
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Repeat } from 'lucide-react';

interface RecurrenceSelectorProps {
  selectedFrequency: string;
  onFrequencyChange: (frequency: string) => void;
  selectedDays: number[];
  onDayChange: (day: number) => void;
}

const RecurrenceSelector = ({ 
  selectedFrequency, 
  onFrequencyChange, 
  selectedDays, 
  onDayChange 
}: RecurrenceSelectorProps) => {
  
  const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const isRecurringBooking = selectedFrequency && selectedFrequency !== 'once';
  
  return (
    <Card className="shadow-md">
      <CardContent className="pt-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="inline-flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
            <Repeat className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-xl font-semibold">Recurrencia del servicio</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <Label className="text-base font-medium mb-3 block">
              ¿Con qué frecuencia necesitas este servicio?
            </Label>
            <RadioGroup value={selectedFrequency} onValueChange={onFrequencyChange}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="once" id="once" />
                  <Label htmlFor="once" className="cursor-pointer">Una vez</Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="weekly" id="weekly" />
                  <Label htmlFor="weekly" className="cursor-pointer">Semanal</Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="biweekly" id="biweekly" />
                  <Label htmlFor="biweekly" className="cursor-pointer">Quincenal</Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="monthly" id="monthly" />
                  <Label htmlFor="monthly" className="cursor-pointer">Mensual</Label>
                </div>
              </div>
            </RadioGroup>
          </div>
          
          {isRecurringBooking && (
            <div className="space-y-3 p-4 bg-blue-50/50 rounded-xl border border-blue-100 animate-fade-in">
              <Label className="text-base font-medium text-gray-900 block">
                ¿Qué días prefieres? <span className="text-red-500">*</span>
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {dayNames.map((day, index) => (
                  <Button
                    key={day}
                    type="button"
                    variant={selectedDays?.includes(index + 1) ? 'default' : 'outline'}
                    onClick={() => onDayChange(index + 1)}
                    className={`h-10 text-xs font-medium transition-all duration-200 ${
                      selectedDays?.includes(index + 1) 
                        ? 'bg-primary hover:bg-primary/90 text-white shadow-sm' 
                        : 'bg-white hover:bg-gray-50 border-gray-200'
                    }`}
                  >
                    {day}
                  </Button>
                ))}
              </div>
              
              {isRecurringBooking && (!selectedDays || selectedDays.length === 0) && (
                <p className="text-xs text-red-500 text-center animate-pulse">
                  Debes seleccionar al menos un día para continuar
                </p>
              )}
              
              {selectedDays && selectedDays.length > 0 && (
                <div className="p-3 bg-white rounded-lg border border-blue-200 animate-scale-in">
                  <h4 className="font-medium text-blue-900 mb-2 text-center text-sm">
                    📅 Resumen de tu reserva recurrente
                  </h4>
                  <div className="space-y-1.5 text-xs text-blue-800">
                    <div className="flex justify-between">
                      <span>Frecuencia:</span>
                      <span className="font-medium">
                        {selectedFrequency === 'weekly' ? 'Cada semana' :
                         selectedFrequency === 'biweekly' ? 'Cada 2 semanas' :
                         'Cada mes'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Días:</span>
                      <span className="font-medium">
                        {selectedDays.map(day => dayNames[day - 1]).join(', ')}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecurrenceSelector;
