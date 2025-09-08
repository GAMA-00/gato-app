
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DayAvailabilityEditor from './DayAvailabilityEditor';

const AvailabilityStep = () => {
  const { control, watch } = useFormContext();
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
    <div className="space-y-6 sm:space-y-8 px-2 sm:px-0">
      <div className="space-y-3">
        <h2 className="text-xl sm:text-2xl font-semibold text-luxury-navy">
          Disponibilidad Semanal
        </h2>
        <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
          Define cuándo estás disponible para brindar tus servicios. Los clientes solo podrán agendar citas en los horarios que configures aquí.
        </p>
      </div>

      <Card className="border-stone-200 shadow-sm">
        <CardHeader className="pb-4 sm:pb-6 px-4 sm:px-6">
          <CardTitle className="text-base sm:text-lg">Antelación para reservar</CardTitle>
          <CardDescription className="text-sm">
            Define cuántas horas de antelación mínima se requiere para reservar tu servicio.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-6">
          <FormField
            control={control}
            name="slotPreferences.minNoticeHours"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-stone-900">
                  Horas de antelación mínima
                </FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(Number(value))} 
                  value={String(field.value || 0)}
                >
                  <FormControl>
                    <SelectTrigger className="text-sm border-stone-300 focus:border-primary">
                      <SelectValue placeholder="Selecciona las horas de antelación" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="0">Sin antelación</SelectItem>
                    <SelectItem value="2">2 horas</SelectItem>
                    <SelectItem value="4">4 horas</SelectItem>
                    <SelectItem value="8">8 horas</SelectItem>
                    <SelectItem value="12">12 horas</SelectItem>
                    <SelectItem value="24">24 horas (1 día)</SelectItem>
                    <SelectItem value="48">48 horas (2 días)</SelectItem>
                    <SelectItem value="72">72 horas (3 días)</SelectItem>
                    <SelectItem value="168">168 horas (1 semana)</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription className="text-xs text-stone-600">
                  Los clientes no podrán reservar con menos antelación que la especificada.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card className="border-stone-200 shadow-sm">
        <CardHeader className="pb-4 sm:pb-6 px-4 sm:px-6">
          <CardTitle className="text-base sm:text-lg">Horarios de Trabajo</CardTitle>
          <CardDescription className="text-sm">
            Activa los días que trabajas y define tus horarios disponibles para cada día.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 px-2 sm:px-6">
          {daysOfWeek.map((day, index) => (
            <div key={day.key}>
              <DayAvailabilityEditor 
                dayKey={day.key} 
                dayLabel={day.label}
              />
              {index < daysOfWeek.length - 1 && (
                <div className="border-b border-stone-100 mt-4 sm:mt-6" />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mx-2 sm:mx-0">
        <div className="flex items-start space-x-3">
          <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-xs font-bold">i</span>
          </div>
          <div className="text-xs sm:text-sm text-blue-800">
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
