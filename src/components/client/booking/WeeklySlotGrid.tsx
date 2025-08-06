import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWeeklySlots } from '@/hooks/useWeeklySlots';
import SlotCard from '@/components/services/steps/SlotCard';
import { format, addWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface WeeklySlotGridProps {
  providerId: string;
  listingId: string;
  serviceDuration: number;
  selectedSlot?: string;
  onSlotSelect: (slotId: string, date: Date, time: string) => void;
  recurrence?: string;
  requiredSlots?: number;
}

const WeeklySlotGrid = ({
  providerId,
  listingId,
  serviceDuration,
  selectedSlot,
  onSlotSelect,
  recurrence = 'once',
  requiredSlots = 1
}: WeeklySlotGridProps) => {
  const [currentWeek, setCurrentWeek] = useState(0);
  const [selectedSlotId, setSelectedSlotId] = useState<string | undefined>(selectedSlot);

  // Sync local state with prop when it changes
  React.useEffect(() => {
    setSelectedSlotId(selectedSlot);
  }, [selectedSlot]);

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
    listingId,
    serviceDuration,
    recurrence,
    startDate,
    daysAhead: 7
  });

  const handleSlotClick = (slotId: string, date: Date, time: string) => {
    const slot = availableSlotGroups
      .flatMap(group => group.slots)
      .find(s => s.id === slotId);
    
    if (!slot || !slot.isAvailable) return;

    // Always select slot immediately - no async validation that could cause deselection
    setSelectedSlotId(slotId);
    onSlotSelect(slotId, date, time);
    
    console.log(`✅ Slot seleccionado: ${time} en ${date.toLocaleDateString()} (recurrencia: ${recurrence})`);
  };

  const goToPreviousWeek = () => {
    if (currentWeek > 0) {
      setCurrentWeek(prev => prev - 1);
      setSelectedSlotId(undefined);
      // Notify parent that slot selection was cleared
      onSlotSelect('', new Date(), '');
    }
  };

  const goToNextWeek = () => {
    setCurrentWeek(prev => prev + 1);
    setSelectedSlotId(undefined);
    // Notify parent that slot selection was cleared
    onSlotSelect('', new Date(), '');
  };

  const getRecurrenceText = (freq: string) => {
    switch (freq) {
      case 'weekly': return 'semanal';
      case 'biweekly': return 'quincenal';
      case 'triweekly': return 'trisemanal';
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
      <CardHeader className="pb-4 px-4 pt-4 md:px-6">
        <div className="text-center md:flex md:items-center md:justify-between md:text-left">
          <div>
            <CardTitle className="text-lg md:text-xl flex items-center justify-center md:justify-start gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <span className="md:hidden">Seleccione su espacio</span>
              <span className="hidden md:inline">Selecciona tu horario</span>
            </CardTitle>
            <CardDescription className="hidden md:block mt-2">
              Horarios disponibles para servicio {getRecurrenceText(recurrence)}
              {requiredSlots > 1 && (
                <span className="block text-xs text-orange-600 mt-1">
                  ⚡ Debes seleccionar {requiredSlots} horarios (tienes {requiredSlots} servicios)
                </span>
              )}
              {recurrence !== 'once' && (
                <span className="block text-xs text-green-600 mt-1">
                  ✓ Considerando disponibilidad para recurrencia
                </span>
              )}
            </CardDescription>
            <CardDescription className="md:hidden text-center mt-2">
              {stats.availableSlots} horarios disponibles
              {requiredSlots > 1 && (
                <span className="block text-xs text-orange-600 mt-1">
                  Selecciona {requiredSlots} horarios
                </span>
              )}
            </CardDescription>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              {stats.availableSlots} disponibles
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 px-4 md:px-6">
        {/* Week Navigation */}
        <div className="flex items-center justify-between p-4 md:p-3 bg-gray-50 rounded-lg">
          <Button
            variant="outline"
            size="default"
            onClick={goToPreviousWeek}
            disabled={currentWeek === 0}
            className="flex items-center gap-1 min-h-[44px] md:min-h-auto px-4 md:px-3"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          
          <div className="text-center">
            <div className="text-base md:text-sm font-medium">
              {currentWeek === 0 ? 'Esta semana' : `Semana ${currentWeek + 1}`}
            </div>
            <div className="hidden md:block text-xs text-gray-500">
              {format(startDate, 'd MMM', { locale: es })} - {format(addWeeks(startDate, 1), 'd MMM', { locale: es })}
            </div>
          </div>

          <Button
            variant="outline"
            size="default"
            onClick={goToNextWeek}
            className="flex items-center gap-1 min-h-[44px] md:min-h-auto px-4 md:px-3"
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Refresh Button - Desktop only */}
        <div className="hidden md:flex justify-between items-center">
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

        {/* Slots Grid */}
        <div className="space-y-4 md:grid md:grid-cols-2 lg:grid-cols-7 md:gap-4 md:space-y-0">
          {availableSlotGroups.map(group => (
            <div key={format(group.date, 'yyyy-MM-dd')} className="space-y-3">
              {/* Day Header */}
              <div className="text-left border-b border-gray-200 pb-2 mb-3 md:text-center md:border-b-0 md:pb-0 md:mb-0">
                <div className="text-base md:text-sm font-medium text-gray-900">
                  {format(group.date, 'EEEE', { locale: es })}
                </div>
                <div className="text-sm md:text-xs text-gray-500">
                  {group.dayNumber} {group.dayMonth}
                </div>
              </div>

              {/* Day Slots */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 md:flex-col md:overflow-x-visible md:space-y-2 md:max-h-64 md:overflow-y-auto md:pb-0">
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
                      size="sm"
                      variant="client"
                      className="flex-shrink-0 min-w-[80px] md:min-w-auto md:flex-shrink"
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* Loading Indicator */}
        {isValidatingSlot && (
          <div className="text-center py-2">
            <div className="text-base md:text-sm text-gray-600 flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Validando horario...
            </div>
          </div>
        )}

        {/* Last Updated - Desktop only */}
        {lastUpdated && (
          <div className="hidden md:block text-center text-xs text-gray-500">
            Actualizado: {format(lastUpdated, 'HH:mm')}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WeeklySlotGrid;