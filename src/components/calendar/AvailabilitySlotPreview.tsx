import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSlotGeneration } from '@/hooks/useSlotGeneration';
import SlotCard from '../services/steps/SlotCard';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCircle, XCircle, Calendar, Clock } from 'lucide-react';

interface AvailabilitySlotPreviewProps {
  availability: any;
  serviceDuration?: number;
}

const AvailabilitySlotPreview: React.FC<AvailabilitySlotPreviewProps> = ({ 
  availability, 
  serviceDuration = 60 
}) => {
  const {
    slotsByDate,
    availableDates,
    stats,
    toggleSlot,
    enableAllSlots,
    disableAllSlots
  } = useSlotGeneration({
    availability,
    serviceDuration,
    daysAhead: 7
  });

  // Don't show if no availability is configured
  const hasAvailability = Object.values(availability).some((day: any) => day?.enabled);
  
  if (!hasAvailability) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="pt-6">
          <div className="text-center text-yellow-700">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              Configure su disponibilidad arriba para ver los horarios generados
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
      <CardHeader className="pb-3 px-3 pt-3 md:px-6 md:pb-4 md:pt-4">
        <div className="text-center md:flex md:items-center md:justify-between md:text-left">
          <div>
            <CardTitle className="text-base md:text-xl flex items-center justify-center md:justify-start gap-2">
              <Calendar className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              <span className="md:hidden">Vista previa</span>
              <span className="hidden md:inline">Vista Previa de Horarios</span>
            </CardTitle>
            <CardDescription className="hidden md:block mt-2">
              Horarios generados para los próximos 7 días basados en su disponibilidad configurada.
            </CardDescription>
            <CardDescription className="md:hidden text-center mt-1 text-xs">
              {stats.enabledSlots} activos de {stats.totalSlots} horarios
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
      
      <CardContent className="space-y-3 px-3 md:space-y-4 md:px-6">
        {/* Quick Actions */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between p-3 md:p-3 bg-gray-50 rounded-lg">
          <div className="text-xs md:text-sm text-gray-600 text-center md:text-left">
            <strong>{stats.totalSlots}</strong> horarios generados
            <span className="block md:inline md:ml-2">({stats.enabledPercentage}% activos)</span>
          </div>
          <div className="flex gap-2 justify-center md:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={enableAllSlots}
              className="text-green-700 border-green-200 hover:bg-green-50 h-8 md:h-9 text-xs md:text-sm px-3 md:px-3"
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              <span className="md:hidden">Todos</span>
              <span className="hidden md:inline">Activar todos</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={disableAllSlots}
              className="text-red-700 border-red-200 hover:bg-red-50 h-8 md:h-9 text-xs md:text-sm px-3 md:px-3"
            >
              <XCircle className="h-3 w-3 mr-1" />
              <span className="md:hidden">Ninguno</span>
              <span className="hidden md:inline">Desactivar todos</span>
            </Button>
          </div>
        </div>

        {/* Slots Grid - Mobile First */}
        <div className="space-y-3 md:grid md:grid-cols-2 lg:grid-cols-7 md:gap-3 md:space-y-0">
          {availableDates.map(date => {
            const dateKey = format(date, 'yyyy-MM-dd');
            const daySlots = slotsByDate[dateKey] || [];
            
            return (
              <div key={dateKey} className="space-y-2 md:space-y-3">
                {/* Day Header */}
                <div className="text-left border-b border-gray-200 pb-1 mb-2 md:text-center md:border-b-0 md:pb-0 md:mb-0">
                  <div className="text-sm md:text-sm font-medium text-gray-900">
                    {format(date, 'EEEE', { locale: es })}
                  </div>
                  <div className="text-xs md:text-xs text-gray-500">
                    {format(date, 'd MMM', { locale: es })}
                  </div>
                </div>

                {/* Day Slots */}
                <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 md:flex-col md:overflow-x-visible md:space-y-1.5 md:max-h-64 md:overflow-y-auto md:pb-0 md:gap-0">
                  {daySlots.length === 0 ? (
                    <div className="text-center text-gray-400 text-xs py-3 flex-1 flex items-center justify-center bg-gray-50 rounded border border-dashed min-w-[70px] md:min-w-auto">
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
                        className="flex-shrink-0 min-w-[70px] text-xs md:min-w-auto md:flex-shrink md:text-sm"
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

export default AvailabilitySlotPreview;