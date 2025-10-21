import React, { useState } from 'react';
import calendarIcon from '@/assets/calendar-icon.png';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWeeklySlots } from '@/hooks/useWeeklySlots';
import SlotCard from '@/components/services/steps/SlotCard';
import { format, addWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatDateES } from '@/lib/utils';
import { 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { 
  isCurrentWeek, 
  getWeekContextMessage, 
  getNavigationHint,
  calculateWeekDateRange,
  getWeekLabel
} from '@/utils/temporalSlotFiltering';
import { useUserProfile } from '@/hooks/useUserProfile';

interface WeeklySlotGridProps {
  providerId: string;
  listingId: string;
  serviceDuration: number;
  selectedSlots?: string[];
  onSlotSelect: (slots: string[], startDate: Date, startTime: string, totalDuration: number) => void;
  recurrence?: string;
  requiredSlots?: number;
  slotSize?: number; // Tamaño del slot configurado para el servicio
  totalServiceDuration?: number; // Duración total de todos los servicios seleccionados
}

const WeeklySlotGrid = ({
  providerId,
  listingId,
  serviceDuration,
  selectedSlots = [],
  onSlotSelect,
  recurrence = 'once',
  requiredSlots = 1,
  slotSize = 60, // Default to 60 minutes if not provided
  totalServiceDuration
}: WeeklySlotGridProps) => {
  const [currentWeek, setCurrentWeek] = useState(0);
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>(selectedSlots);
  const { profile } = useUserProfile();

  // Sync local state with prop when it changes
  React.useEffect(() => {
    setSelectedSlotIds(selectedSlots);
  }, [selectedSlots]);

  // Calculate required slots based on new slot system
  const actualTotalDuration = totalServiceDuration || (serviceDuration * requiredSlots);
  const calculatedRequiredSlots = Math.ceil(actualTotalDuration / slotSize);
  const slotsNeeded = Math.max(calculatedRequiredSlots, 1);

  console.log('🎯 Slot calculation:', {
    totalServiceDuration,
    serviceDuration,
    requiredSlots,
    slotSize,
    actualTotalDuration,
    calculatedRequiredSlots,
    slotsNeeded
  });

  // Calculate correct week boundaries
  const { startDate: weekStartDate, endDate: weekEndDate } = calculateWeekDateRange(currentWeek);
  
  console.log('🏠 Cliente Residencia ID:', profile?.residencia_id);

  const {
    slotGroups,
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
    serviceDuration: slotSize, // Use slotSize instead of serviceDuration for grid generation
    recurrence,
    startDate: weekStartDate,
    daysAhead: 7,
    weekIndex: currentWeek,
    clientResidenciaId: profile?.residencia_id
  });

  const hasRecommended = React.useMemo(() =>
    availableSlotGroups.some(g => g.slots.some(s => s.isAvailable && s.isRecommended)),
    [availableSlotGroups]
  );

  const handleSlotClick = (slotId: string, date: Date, time: string) => {
    const slot = availableSlotGroups
      .flatMap(group => group.slots)
      .find(s => s.id === slotId);
    
    if (!slot || !slot.isAvailable) return;

    // Helper to parse time string to minutes since midnight
    const timeToMinutes = (timeStr: string): number => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + (minutes || 0);
    };

    // Automatically calculate and reserve consecutive slots with REAL time contiguity validation
    const allSlots = availableSlotGroups.flatMap(group => group.slots);
    const sameDateSlots = allSlots.filter(s => 
      format(s.date, 'yyyy-MM-dd') === format(slot.date, 'yyyy-MM-dd') && s.isAvailable
    ).sort((a, b) => a.time.localeCompare(b.time));
    
    const startIndex = sameDateSlots.findIndex(s => s.id === slotId);
    if (startIndex === -1) return;
    
    // Validate consecutive slots with REAL time contiguity (no gaps allowed)
    const consecutiveSlotIds: string[] = [];
    let isContiguous = true;
    
    for (let i = 0; i < slotsNeeded; i++) {
      const currentSlot = sameDateSlots[startIndex + i];
      
      if (!currentSlot || !currentSlot.isAvailable) {
        isContiguous = false;
        console.log(`❌ Slot ${i} no disponible en posición ${startIndex + i}`);
        break;
      }
      
      // Validate time contiguity: each slot must start exactly slotSize minutes after previous
      if (i > 0) {
        const prevSlot = sameDateSlots[startIndex + i - 1];
        const prevTime = timeToMinutes(prevSlot.time);
        const currentTime = timeToMinutes(currentSlot.time);
        const expectedTime = prevTime + slotSize;
        
        if (currentTime !== expectedTime) {
          isContiguous = false;
          console.log(`❌ Gap detectado entre ${prevSlot.time} y ${currentSlot.time} (esperado: ${Math.floor(expectedTime/60)}:${String(expectedTime%60).padStart(2,'0')})`);
          toast.error(`Hay un hueco entre ${prevSlot.time} y ${currentSlot.time}. Selecciona un horario con ${slotsNeeded} slots consecutivos sin interrupciones.`);
          break;
        }
      }
      
      consecutiveSlotIds.push(currentSlot.id);
    }
    
    // Check if we have enough consecutive slots WITHOUT GAPS
    if (!isContiguous || consecutiveSlotIds.length < slotsNeeded) {
      toast.error(`No hay suficientes slots consecutivos disponibles. Se necesitan ${slotsNeeded} slots consecutivos (sin huecos) para ${actualTotalDuration} minutos.`);
      return;
    }
    
    setSelectedSlotIds(consecutiveSlotIds);
    
    const totalDurationReserved = slotSize * consecutiveSlotIds.length;
    const endSlot = sameDateSlots[startIndex + slotsNeeded - 1];
    const endTime = timeToMinutes(endSlot.time) + slotSize;
    const endHour = Math.floor(endTime / 60);
    const endMin = endTime % 60;
    
    onSlotSelect(consecutiveSlotIds, slot.date, slot.time, totalDurationReserved);
    
    console.log(`✅ Reservados ${consecutiveSlotIds.length} slots CONTIGUOS (${slot.time}-${endHour}:${String(endMin).padStart(2,'0')}) = ${totalDurationReserved} min`);
    toast.success(`Horario reservado: ${slot.time} - ${endHour}:${String(endMin).padStart(2,'0')} (${slotsNeeded} slots consecutivos)`);
  };

  const goToPreviousWeek = () => {
    if (currentWeek > 0) {
      setCurrentWeek(prev => prev - 1);
      setSelectedSlotIds([]);
      // Notify parent that slot selection was cleared
      onSlotSelect([], new Date(), '', 0);
    }
  };

  const goToNextWeek = () => {
    setCurrentWeek(prev => prev + 1);
    setSelectedSlotIds([]);
    // Notify parent that slot selection was cleared
    onSlotSelect([], new Date(), '', 0);
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
    const contextMessage = getWeekContextMessage(currentWeek, false, 0);
    const navigationHint = getNavigationHint(currentWeek, false);
    
    return (
      <Card className="shadow-md border-blue-200 bg-blue-50/30">
        <CardContent className="pt-6">
          <div className="text-center py-8 px-4">
            <AlertCircle className="h-10 w-10 mx-auto mb-4 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {contextMessage}
            </h3>
            <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
              {navigationHint}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousWeek}
                disabled={currentWeek === 0}
                className="w-full sm:w-auto min-h-[40px] border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Semana anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextWeek}
                className="w-full sm:w-auto min-h-[40px] border-blue-300 hover:bg-blue-50 transition-colors"
              >
                Próxima semana
                <ChevronRight className="h-4 w-4 ml-2" />
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
        <div className="flex items-center gap-3">
          <img src={calendarIcon} alt="Calendar" className="h-12 w-12 flex-shrink-0" />
          <div className="flex-1">
            <CardTitle className="text-lg md:text-xl">
              Selecciona la hora de inicio
            </CardTitle>
            {slotsNeeded > 1 && (
              <CardDescription className="mt-2">
                <span className="block text-xs text-muted-foreground">
                  💡 Se reservarán automáticamente {slotsNeeded} slots consecutivos ({actualTotalDuration} min)
                </span>
                {selectedSlotIds.length > 0 && (
                  <span className="block text-xs text-green-600 mt-1">
                    ✅ Horario confirmado: {slotsNeeded} slots reservados
                  </span>
                )}
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 px-4 md:px-6">
        {/* Week Navigation */}
        <div className="flex items-center justify-between p-4 md:p-3 bg-gray-50 rounded-lg">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousWeek}
            disabled={currentWeek === 0}
            className="flex items-center gap-1 min-h-[36px] md:min-h-auto px-3 md:px-3 text-sm"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          
          <div className="text-center">
            <div className="text-base md:text-sm font-medium">
              {isCurrentWeek(currentWeek) ? 'Esta semana' : `Semana ${currentWeek + 1}`}
            </div>
            <div className="hidden md:block text-xs text-gray-500">
              {formatDateES(weekStartDate, 'd MMM', { locale: es })} - {formatDateES(weekEndDate, 'd MMM', { locale: es })}
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={goToNextWeek}
            className="flex items-center gap-1 min-h-[36px] md:min-h-auto px-3 md:px-3 text-sm"
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Refresh Button - Desktop only */}
        <div className="hidden md:flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {getWeekContextMessage(currentWeek, stats.daysWithAvailableSlots > 0, stats.availableSlots)}
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

        <div className="relative overflow-hidden rounded-md border border-warning/30 bg-warning/5 p-2 md:p-3">
          {hasRecommended && (
            <span
              aria-hidden
              className="pointer-events-none absolute right-0 top-0 w-0 h-0 border-t-[16px] border-l-[16px] md:border-t-[20px] md:border-l-[20px] border-t-warning border-l-transparent"
            />
          )}
          <div className="text-xs md:text-sm font-medium text-warning">
            {hasRecommended ? 'Horario recomendado' : 'Horarios disponibles'}
          </div>
          {hasRecommended ? (
            <>
              <p className="text-xs text-muted-foreground mt-1">
                El proveedor ya se encuentra en el condominio antes o después de estos horarios.
              </p>
              <p className="text-xs text-muted-foreground">
                Reservá estos espacios para ayudar a ordenar su agenda.
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">
              Selecciona el horario que mejor te convenga.
            </p>
          )}
        </div>

        {/* Slots Grid */}
        <div className="space-y-4 md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7 md:gap-4 lg:gap-5 xl:gap-6 md:space-y-0">
          {slotGroups.map(group => {
            const availableSlots = group.slots.filter(slot => slot.isAvailable);
            return (
              <div key={format(group.date, 'yyyy-MM-dd')} className="space-y-3">
                {/* Day Header */}
                <div className="text-left border-b border-gray-200 pb-2 mb-3 md:text-center md:border-b-0 md:pb-0 md:mb-0">
                  <div className="text-base md:text-sm font-medium text-gray-900 capitalize">
                    {formatDateES(group.date, 'EEEE', { locale: es })}
                  </div>
                  <div className="text-sm md:text-xs text-gray-500">
                    {group.dayNumber} {group.dayMonth}
                  </div>
                </div>

                {/* Day Slots */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 md:flex-col md:overflow-x-visible md:max-h-64 lg:max-h-72 xl:max-h-80 md:overflow-y-auto md:space-y-2 lg:space-y-3 md:pb-0 md:pr-1">
                  {availableSlots.length > 0 ? (
                    availableSlots.map(slot => (
                      <SlotCard
                        key={slot.id}
                        time={slot.displayTime}
                        period={slot.period}
                        isEnabled={slot.isAvailable}
                        isSelected={selectedSlotIds.includes(slot.id)}
                        isAvailable={slot.isAvailable}
                        recommended={slot.isRecommended}
                        onClick={() => handleSlotClick(slot.id, slot.date, slot.time)}
                        size="sm"
                        variant="client"
                        className="flex-shrink-0 min-w-[80px] md:min-w-0 md:w-full md:h-14 md:text-sm lg:h-16 lg:text-base"
                      />
                    ))
                  ) : (
                    <div className="text-xs text-gray-400 italic text-center md:text-left py-2">
                      No disponible
                    </div>
                  )}
                </div>
              </div>
            );
          })}
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