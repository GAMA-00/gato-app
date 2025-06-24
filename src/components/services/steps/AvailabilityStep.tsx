
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import DayAvailabilityEditor from './DayAvailabilityEditor';

const AvailabilityStep = () => {
  const { watch } = useFormContext();
  const availability = watch('availability') || {};

  const daysOfWeek = [
    { key: 'monday', label: 'Lunes' },
    { key: 'tuesday', label: 'Martes' },
    { key: 'wednesday', label: 'Miércoles' },
    { key: 'thursday', label: 'Jueves' },
    { key: 'friday', label: 'Viernes' },
    { key: 'saturday', label: 'Sábado' },
    { key: 'sunday', label: 'Domingo' }
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h2 className="text-2xl font-semibold text-luxury-navy">
          Disponibilidad Semanal
        </h2>
        <p className="text-muted-foreground text-base leading-relaxed">
          Define cuándo estás disponible para brindar tus servicios. Los clientes solo podrán agendar citas en los horarios que configures aquí.
        </p>
      </div>

      <Card className="border-stone-200 shadow-sm">
        <CardHeader className="pb-6">
          <CardTitle className="text-lg">Horarios de Trabajo</CardTitle>
          <CardDescription>
            Activa los días que trabajas y define tus horarios disponibles para cada día.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {daysOfWeek.map((day, index) => (
            <div key={day.key}>
              <DayAvailabilityEditor 
                dayKey={day.key} 
                dayLabel={day.label}
              />
              {index < daysOfWeek.length - 1 && (
                <div className="border-b border-stone-100 mt-6" />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-xs font-bold">i</span>
          </div>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Consejos para configurar tu disponibilidad:</p>
            <ul className="space-y-1 list-disc list-inside text-blue-700">
              <li>Considera tiempo de traslado entre citas</li>
              <li>Deja espacios para descansos</li>
              <li>Puedes agregar múltiples bloques por día si trabajas en horarios divididos</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvailabilityStep;
