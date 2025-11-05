
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface RecurrenceSelectorProps {
  selectedFrequency: string;
  onFrequencyChange: (frequency: string) => void;
}

const RecurrenceSelector = ({ 
  selectedFrequency, 
  onFrequencyChange
}: RecurrenceSelectorProps) => {
  
  return (
    <Card className="shadow-md relative">
      <img src="/lovable-uploads/704b128d-3f43-44a6-8032-901982fc0484.png" alt="Frecuencia" className="absolute top-4 left-4 h-12 w-12 z-10" />
      <CardContent className="pt-6">
        <div className="mb-4 pl-16">
          <h2 className="text-xl font-semibold">Frecuencia del servicio</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <Label className="text-base font-medium mb-3 block">
              Reserve su campo fijo
            </Label>
            <RadioGroup value={selectedFrequency} onValueChange={onFrequencyChange}>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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
                  <RadioGroupItem value="triweekly" id="triweekly" />
                  <Label htmlFor="triweekly" className="cursor-pointer">Cada 3 semanas</Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="monthly" id="monthly" />
                  <Label htmlFor="monthly" className="cursor-pointer">Mensual</Label>
                </div>
              </div>
            </RadioGroup>
          </div>
          
          {/* Reminder message */}
          <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-sm text-primary font-medium text-center">
              📅 Le enviaremos recordatorios cuando se aproxime la próxima fecha
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecurrenceSelector;
