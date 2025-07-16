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
      <CardHeader className="pb-2 px-4 pt-3 md:px-6 md:pb-3 md:pt-4">
        <div className="flex items-center justify-center gap-2 text-center">
          <Calendar className="h-4 w-4 text-primary" />
          <div className="text-sm text-gray-600">
            <span className="font-medium">{stats.enabledSlots}</span> de <span className="font-medium">{stats.totalSlots}</span> horarios activos
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="px-4 md:px-6">
        {/* Slots Grid - Mobile Optimized */}
        <div className="space-y-4 md:grid md:grid-cols-2 lg:grid-cols-7 md:gap-4 md:space-y-0">
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
                <div className="flex gap-2 overflow-x-auto pb-2 md:flex-col md:overflow-x-visible md:space-y-2 md:max-h-64 md:overflow-y-auto md:pb-0 md:gap-0">
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
                        className="flex-shrink-0 min-w-[80px] h-10 text-xs md:min-w-auto md:flex-shrink md:text-sm md:h-auto"
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