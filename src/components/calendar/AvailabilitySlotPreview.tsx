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
    <Card className="shadow-md">
      <CardHeader className="pb-4 px-4 pt-4 md:px-6">
        <div className="text-center md:flex md:items-center md:justify-between md:text-left">
          <div>
            <CardTitle className="text-lg md:text-xl flex items-center justify-center md:justify-start gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <span className="md:hidden">Vista previa</span>
              <span className="hidden md:inline">Vista previa de horarios</span>
            </CardTitle>
            <CardDescription className="hidden md:block mt-2">
              Horarios generados para los próximos 7 días basados en su disponibilidad configurada.
            </CardDescription>
            <CardDescription className="md:hidden text-center mt-2">
              {stats.enabledSlots} de {stats.totalSlots} horarios activos
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
        {/* Stats Summary - Desktop only */}
        <div className="hidden md:flex justify-between items-center">
          <div className="text-sm text-gray-600">
            <strong>{stats.totalSlots}</strong> horarios generados ({stats.enabledPercentage}% activos)
          </div>
        </div>

        {/* Slots Grid - Mobile optimized with horizontal scroll */}
        <div className="md:grid md:grid-cols-2 lg:grid-cols-7 md:gap-4 md:space-y-0">
          {/* Mobile: Horizontal scroll container for all days */}
          <div className="flex gap-4 overflow-x-auto pb-4 md:hidden">
            {availableDates.map(date => {
              const dateKey = format(date, 'yyyy-MM-dd');
              const daySlots = slotsByDate[dateKey] || [];
              
              return (
                <div key={dateKey} className="flex-shrink-0 w-32 space-y-3">
                  {/* Day Header */}
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-900">
                      {format(date, 'EEE', { locale: es })}
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(date, 'd MMM', { locale: es })}
                    </div>
                  </div>

                  {/* Day Slots - Vertical scroll for each day */}
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {daySlots.length === 0 ? (
                      <div className="text-center text-gray-400 text-xs py-4 bg-gray-50 rounded border border-dashed">
                        Sin horarios
                      </div>
                    ) : (
                      daySlots.map(slot => (
                        <SlotCard
                          key={slot.id}
                          time={slot.displayTime}
                          period={slot.period}
                          isEnabled={slot.isEnabled}
                          isSelected={slot.isEnabled}
                          isAvailable={slot.isEnabled}
                          onClick={() => toggleSlot(slot.id)}
                          size="sm"
                          variant="client"
                          className="w-full"
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop: Grid layout */}
          <div className="hidden md:contents">
            {availableDates.map(date => {
              const dateKey = format(date, 'yyyy-MM-dd');
              const daySlots = slotsByDate[dateKey] || [];
              
              return (
                <div key={dateKey} className="space-y-3">
                  {/* Day Header */}
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-900">
                      {format(date, 'EEEE', { locale: es })}
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(date, 'd MMM', { locale: es })}
                    </div>
                  </div>

                  {/* Day Slots */}
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {daySlots.length === 0 ? (
                      <div className="text-center text-gray-400 text-xs py-4 bg-gray-50 rounded border border-dashed">
                        Sin horarios
                      </div>
                    ) : (
                      daySlots.map(slot => (
                        <SlotCard
                          key={slot.id}
                          time={slot.displayTime}
                          period={slot.period}
                          isEnabled={slot.isEnabled}
                          isSelected={slot.isEnabled}
                          isAvailable={slot.isEnabled}
                          onClick={() => toggleSlot(slot.id)}
                          size="sm"
                          variant="client"
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AvailabilitySlotPreview;