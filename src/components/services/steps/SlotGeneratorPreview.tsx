import React, { useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFormContext } from 'react-hook-form';
import { useSlotGeneration } from '@/hooks/useSlotGeneration';
import SlotCard from './SlotCard';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatDateES } from '@/lib/utils';
import { CheckCircle, XCircle, RotateCcw, Calendar, Clock } from 'lucide-react';

const SlotGeneratorPreview = () => {
  const { watch, setValue } = useFormContext();
  const availability = watch('availability') || {};
  const serviceVariants = watch('serviceVariants') || [];
  const slotPreferences = watch('slotPreferences') || {};
  
  // Get the duration from the first service variant
  const serviceDuration = serviceVariants[0]?.duration || 60;
  
  // Handle slot preferences changes with useCallback to prevent re-renders
  const handleSlotPreferencesChange = useCallback((preferences: Record<string, boolean>) => {
    // Use setTimeout to avoid setState during render
    setTimeout(() => {
      setValue('slotPreferences', preferences, { shouldDirty: true });
    }, 0);
  }, [setValue]);
  
  const {
    slotsByDate,
    availableDates,
    stats,
    toggleSlot,
    enableAllSlots,
    disableAllSlots
  } = useSlotGeneration({
    availability,
    serviceDuration: Number(serviceDuration),
    daysAhead: 7
  }, handleSlotPreferencesChange, slotPreferences);

  // Don't show if no availability is configured
  const hasAvailability = Object.values(availability).some((day: any) => day?.enabled);
  
  if (!hasAvailability) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="pt-6">
          <div className="text-center text-yellow-700">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              Configura tu disponibilidad en el paso anterior para ver los horarios generados
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (availableDates.length === 0) {
    return (
      <Card className="border-gray-200">
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              No se encontraron horarios disponibles con la configuración actual
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-stone-200 shadow-sm">
      <CardHeader className="pb-4 px-4 pt-4 md:px-6">
        <div className="text-center md:flex md:items-center md:justify-between md:text-left">
          <div>
            <CardTitle className="text-lg md:text-xl flex items-center justify-center md:justify-start gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <span className="md:hidden">Vista previa</span>
              <span className="hidden md:inline">Vista Previa de Horarios</span>
            </CardTitle>
            <CardDescription className="hidden md:block mt-2">
              <strong>Configuración Permanente:</strong> Los horarios que actives (verde) o desactives (rojo) 
              se aplicarán de forma recurrente a todas las semanas futuras. Por ejemplo, si bloqueas 
              los lunes a las 9:00 AM, esa hora quedará permanentemente bloqueada todos los lunes.
            </CardDescription>
            <CardDescription className="md:hidden text-center mt-2">
              <strong>Configuración permanente:</strong> {stats.enabledSlots} activos de {stats.totalSlots} horarios
            </CardDescription>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              {stats.enabledSlots} activos
            </Badge>
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
              <XCircle className="h-3 w-3 mr-1" />
              {stats.disabledSlots} inactivos
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 px-4 md:px-6">
        {/* Quick Actions */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between p-4 md:p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600 text-center md:text-left">
            <strong>{stats.totalSlots}</strong> horarios generados
            <span className="block md:inline md:ml-2">({stats.enabledPercentage}% activos)</span>
          </div>
          <div className="flex gap-2 justify-center md:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={enableAllSlots}
              className="text-green-700 border-green-200 hover:bg-green-50 min-h-[44px] md:min-h-auto px-4 md:px-3"
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              <span className="md:hidden">Todos</span>
              <span className="hidden md:inline">Activar todos</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={disableAllSlots}
              className="text-red-700 border-red-200 hover:bg-red-50 min-h-[44px] md:min-h-auto px-4 md:px-3"
            >
              <XCircle className="h-3 w-3 mr-1" />
              <span className="md:hidden">Ninguno</span>
              <span className="hidden md:inline">Desactivar todos</span>
            </Button>
          </div>
        </div>

        {/* Slots Grid - Responsive */}
        <div className="space-y-4 md:grid md:grid-cols-2 lg:grid-cols-7 md:gap-4 md:space-y-0">
          {availableDates.map(date => {
            const dateKey = format(date, 'yyyy-MM-dd');
            const daySlots = slotsByDate[dateKey] || [];
            
            return (
              <div key={dateKey} className="space-y-3">
                {/* Day Header */}
                <div className="text-left border-b border-gray-200 pb-2 mb-3 md:text-center md:border-b-0 md:pb-0 md:mb-0">
                  <div className="text-base md:text-sm font-medium text-gray-900">
                    {formatDateES(date, 'EEEE', { locale: es })}
                  </div>
                  <div className="text-sm md:text-xs text-gray-500">
                    {formatDateES(date, 'd MMM', { locale: es })}
                  </div>
                </div>

                {/* Day Slots */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 md:flex-col md:overflow-x-visible md:space-y-2 md:max-h-64 md:overflow-y-auto md:pb-0">
                  {daySlots.length === 0 ? (
                    <div className="text-center text-gray-400 text-xs py-4 flex-1 flex items-center justify-center bg-gray-50 rounded border border-dashed min-w-[80px] md:min-w-auto">
                      Sin horarios
                    </div>
                  ) : (
                    daySlots.map(slot => (
                      <SlotCard
                        key={slot.id}
                        time={slot.displayTime}
                        period={slot.period}
                        isEnabled={slot.isEnabled}
                        onClick={() => toggleSlot(slot.id)}
                        size="sm"
                        variant="provider"
                        className="flex-shrink-0 min-w-[80px] md:min-w-auto md:flex-shrink"
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </CardContent>
    </Card>
  );
};

export default SlotGeneratorPreview;