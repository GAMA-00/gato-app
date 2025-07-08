import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWeeklySlots } from '@/hooks/useWeeklySlots';
import { useIsMobile } from '@/hooks/use-mobile';
import SlotCard from '@/components/services/steps/SlotCard';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Calendar, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { addWeeks } from 'date-fns';

interface WeeklySlotGridProps {
  providerId: string;
  serviceDuration: number;
  selectedSlot?: string;
  onSlotSelect: (slotId: string, date: Date, time: string) => void;
  recurrence?: string;
}

const WeeklySlotGrid = ({
  providerId,
  serviceDuration,
  selectedSlot,
  onSlotSelect,
  recurrence = 'once'
}: WeeklySlotGridProps) => {
  const [currentWeek, setCurrentWeek] = useState(0);
  const [selectedSlotId, setSelectedSlotId] = useState<string | undefined>(selectedSlot);
  const isMobile = useIsMobile();

  const startDate = addWeeks(new Date(), currentWeek);
  
  const {
    availableSlotGroups,
    stats,
    isLoading,
    isValidatingSlot,
    lastUpdated,
    validateSlot,
    refreshSlots
  } = useWeeklySlots({
    providerId,
    serviceDuration,
    recurrence,
    startDate,
    daysAhead: 7
  });

  const handleSlotClick = async (slotId: string, date: Date, time: string) => {
    const slot = availableSlotGroups
      .flatMap(group => group.slots)
      .find(s => s.id === slotId);
    
    if (!slot || !slot.isAvailable) return;

    // OPTIMISTIC UPDATE: Show selection immediately for better UX
    setSelectedSlotId(slotId);
    onSlotSelect(slotId, date, time);

    // Validate in background without blocking UI
    try {
      const isValid = await validateSlot(slot);
      
      if (!isValid) {
        // Revert selection if validation fails
        setSelectedSlotId(undefined);
        // Note: Toast error is already shown by validateSlot function
      }
    } catch (error) {
      // Revert selection on any error
      setSelectedSlotId(undefined);
      console.error('Error validating slot:', error);
    }
  };

  const goToPreviousWeek = () => {
    if (currentWeek > 0) {
      setCurrentWeek(prev => prev - 1);
      setSelectedSlotId(undefined);
    }
  };

  const goToNextWeek = () => {
    setCurrentWeek(prev => prev + 1);
    setSelectedSlotId(undefined);
  };

  const getRecurrenceText = (freq: string) => {
    switch (freq) {
      case 'weekly': return 'semanal';
      case 'biweekly': return 'quincenal';
      case 'monthly': return 'mensual';
      default: return 'una vez';
    }
  };

  if (isLoading) {
    return (
      <Card className="shadow-md">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin text-primary" />
            <p className="text-gray-500">Cargando horarios disponibles...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (availableSlotGroups.length === 0) {
    return (
      <Card className="shadow-md border-yellow-200 bg-yellow-50">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
            <p className="text-yellow-800 font-medium mb-2">
              No hay horarios disponibles esta semana
            </p>
            <p className="text-yellow-700 text-sm mb-4">
              {currentWeek === 0 ? 'Intenta la próxima semana' : 'Intenta otra semana'}
            </p>
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousWeek}
                disabled={currentWeek === 0}
                className="text-yellow-700 border-yellow-300"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Semana anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextWeek}
                className="text-yellow-700 border-yellow-300"
              >
                Próxima semana
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md">
      <CardHeader className={`pb-4 ${isMobile ? 'px-4 pt-4' : ''}`}>
        <div className={`${isMobile ? 'text-center' : 'flex items-center justify-between'}`}>
          <div>
            <CardTitle className={`${isMobile ? 'text-lg' : 'text-xl'} flex items-center ${isMobile ? 'justify-center' : ''} gap-2`}>
              <Calendar className="h-5 w-5 text-primary" />
              {isMobile ? 'Seleccione su espacio' : 'Selecciona tu horario'}
            </CardTitle>
            {!isMobile && (
              <CardDescription>
                Horarios disponibles para servicio {getRecurrenceText(recurrence)}
                {recurrence !== 'once' && (
                  <span className="block text-xs text-green-600 mt-1">
                    ✓ Considerando disponibilidad para recurrencia
                  </span>
                )}
              </CardDescription>
            )}
            {isMobile && (
              <CardDescription className="text-center mt-2">
                {stats.availableSlots} campos disponibles por semana
              </CardDescription>
            )}
          </div>
          {!isMobile && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                {stats.availableSlots} disponibles
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className={`space-y-4 ${isMobile ? 'px-4' : ''}`}>
        {/* Week Navigation */}
        <div className={`flex items-center justify-between ${isMobile ? 'p-4' : 'p-3'} bg-gray-50 rounded-lg`}>
          <Button
            variant="outline"
            size={isMobile ? "default" : "sm"}
            onClick={goToPreviousWeek}
            disabled={currentWeek === 0}
            className={`flex items-center gap-1 ${isMobile ? 'min-h-[44px] px-4' : ''}`}
          >
            <ChevronLeft className="h-4 w-4" />
            {isMobile ? 'Anterior' : 'Anterior'}
          </Button>
          
          <div className="text-center">
            <div className={`${isMobile ? 'text-base' : 'text-sm'} font-medium`}>
              {currentWeek === 0 ? 'Esta semana' : `Semana ${currentWeek + 1}`}
            </div>
            {!isMobile && (
              <div className="text-xs text-gray-500">
                {format(startDate, 'd MMM', { locale: es })} - {format(addWeeks(startDate, 1), 'd MMM', { locale: es })}
              </div>
            )}
          </div>

          <Button
            variant="outline"
            size={isMobile ? "default" : "sm"}
            onClick={goToNextWeek}
            className={`flex items-center gap-1 ${isMobile ? 'min-h-[44px] px-4' : ''}`}
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Refresh Button - Hide on mobile */}
        {!isMobile && (
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {stats.daysWithAvailableSlots} días con horarios disponibles
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshSlots}
              disabled={isLoading}
              className="flex items-center gap-1"
            >
              <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        )}

        {/* Slots Grid */}
        <div className={`${isMobile ? 'space-y-4' : 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4'}`}>
          {availableSlotGroups.map(group => (
            <div key={format(group.date, 'yyyy-MM-dd')} className={`${isMobile ? 'space-y-3' : 'space-y-3'}`}>
              {/* Day Header */}
              <div className={`${isMobile ? 'text-left border-b border-gray-200 pb-2 mb-3' : 'text-center'}`}>
                <div className={`${isMobile ? 'text-base' : 'text-sm'} font-medium text-gray-900`}>
                  {format(group.date, 'EEEE', { locale: es })}
                </div>
                <div className={`${isMobile ? 'text-sm' : 'text-xs'} text-gray-500`}>
                  {group.dayNumber} {group.dayMonth}
                </div>
              </div>

              {/* Day Slots - Horizontal scroll for mobile */}
              <div className={`${isMobile ? 'flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300' : 'space-y-2 max-h-64 overflow-y-auto'}`}>
                {group.slots
                  .filter(slot => slot.isAvailable)
                  .map(slot => (
                    <SlotCard
                      key={slot.id}
                      time={slot.displayTime}
                      period={slot.period}
                      isEnabled={slot.isAvailable}
                      isSelected={selectedSlotId === slot.id}
                      isAvailable={slot.isAvailable}
                      onClick={() => handleSlotClick(slot.id, slot.date, slot.time)}
                      size={isMobile ? "sm" : "sm"}
                      variant="client"
                      className={isMobile ? 'flex-shrink-0 min-w-[80px]' : ''}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* Loading Indicator */}
        {isValidatingSlot && (
          <div className="text-center py-2">
            <div className={`${isMobile ? 'text-base' : 'text-sm'} text-gray-600 flex items-center justify-center gap-2`}>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Validando horario...
            </div>
          </div>
        )}

        {/* Last Updated - Hide on mobile */}
        {lastUpdated && !isMobile && (
          <div className="text-center text-xs text-gray-500">
            Actualizado: {format(lastUpdated, 'HH:mm')}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WeeklySlotGrid;