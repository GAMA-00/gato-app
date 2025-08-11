import React, { useState } from 'react';
import { toast } from 'sonner';
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
}

const WeeklySlotGrid = ({
  providerId,
  listingId,
  serviceDuration,
  selectedSlots = [],
  onSlotSelect,
  recurrence = 'once',
  requiredSlots = 1
}: WeeklySlotGridProps) => {
  const [currentWeek, setCurrentWeek] = useState(0);
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>(selectedSlots);
  const { profile } = useUserProfile();

  // Sync local state with prop when it changes
  React.useEffect(() => {
    setSelectedSlotIds(selectedSlots);
  }, [selectedSlots]);

  // Calculate correct week boundaries
  const { startDate: weekStartDate, endDate: weekEndDate } = calculateWeekDateRange(currentWeek);
  
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
    serviceDuration,
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

  const areSlotConsecutive = (slots: any[]): boolean => {
    if (slots.length <= 1) return true;
    
    // Group by date
    const slotsByDate = slots.reduce((acc, slot) => {
      const dateKey = format(slot.date, 'yyyy-MM-dd');
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(slot);
      return acc;
    }, {} as Record<string, any[]>);
    
    // Check if all slots are on the same date
    const dates = Object.keys(slotsByDate);
    if (dates.length !== 1) return false;
    
    // Sort slots by time and check consecutivity
    const sortedSlots = slotsByDate[dates[0]].sort((a, b) => {
      const timeA = parseInt(a.time.split(':')[0]);
      const timeB = parseInt(b.time.split(':')[0]);
      return timeA - timeB;
    });
    
    for (let i = 1; i < sortedSlots.length; i++) {
      const prevHour = parseInt(sortedSlots[i - 1].time.split(':')[0]);
      const currentHour = parseInt(sortedSlots[i].time.split(':')[0]);
      if (currentHour !== prevHour + 1) return false;
    }
    
    return true;
  };

  const handleSlotClick = (slotId: string, date: Date, time: string) => {
    const slot = availableSlotGroups
      .flatMap(group => group.slots)
      .find(s => s.id === slotId);
    
    if (!slot || !slot.isAvailable) return;

    const newSelectedSlots = selectedSlotIds.includes(slotId)
      ? selectedSlotIds.filter(id => id !== slotId)
      : [...selectedSlotIds, slotId];
    
    // Find the actual slot objects
    const allSlots = availableSlotGroups.flatMap(group => group.slots);
    const selectedSlotObjects = allSlots.filter(s => newSelectedSlots.includes(s.id));
    
    // Validate consecutivity
    if (selectedSlotObjects.length > 1 && !areSlotConsecutive(selectedSlotObjects)) {
      toast.error('Los slots deben ser consecutivos del mismo día');
      return;
    }
    
    // Validate max slots
    if (newSelectedSlots.length > requiredSlots) {
      toast.error(`Solo puedes seleccionar ${requiredSlots} slot${requiredSlots > 1 ? 's' : ''}`);
      return;
    }
    
    setSelectedSlotIds(newSelectedSlots);
    
    if (newSelectedSlots.length > 0) {
      // Sort selected slots by time to get the start time
      const sortedSlots = selectedSlotObjects.sort((a, b) => {
        const timeA = parseInt(a.time.split(':')[0]);
        const timeB = parseInt(b.time.split(':')[0]);
        return timeA - timeB;
      });
      
      const startSlot = sortedSlots[0];
      const totalDuration = serviceDuration * newSelectedSlots.length;
      
      onSlotSelect(newSelectedSlots, startSlot.date, startSlot.time, totalDuration);
      console.log(`✅ ${newSelectedSlots.length} slots seleccionados consecutivos, duración total: ${totalDuration} min`);
    } else {
      // No slots selected
      onSlotSelect([], new Date(), '', 0);
    }
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
      <Card className="shadow-md border-yellow-200 bg-yellow-50">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
            <p className="text-yellow-800 font-medium mb-2">
              {contextMessage}
            </p>
            {recurrence !== 'once' && (
              <p className="text-orange-700 text-sm mb-2">
                📅 No hay horarios válidos para recurrencia {getRecurrenceText(recurrence)} en esta semana
              </p>
            )}
            <p className="text-yellow-700 text-sm mb-4">
              {navigationHint}
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
                <div className="mt-2 space-y-1">
                  <span className="block text-xs text-orange-600">
                    ⚡ Debes seleccionar {requiredSlots} horarios consecutivos (tienes {requiredSlots} servicios)
                  </span>
                  {selectedSlotIds.length > 0 && (
                    <span className="block text-xs text-blue-600">
                      📍 {selectedSlotIds.length} de {requiredSlots} slots seleccionados
                      {selectedSlotIds.length === requiredSlots && " ✓ Completo"}
                    </span>
                  )}
                </div>
              )}
              {recurrence !== 'once' && (
                <span className="block text-xs text-green-600 mt-1">
                  ✓ Solo mostrando slots válidos para recurrencia {getRecurrenceText(recurrence)}
                </span>
              )}
            </CardDescription>
            <CardDescription className="md:hidden text-center mt-2">
              {stats.availableSlots} horarios disponibles
              {requiredSlots > 1 && (
                <div className="mt-1 space-y-1">
                  <span className="block text-xs text-orange-600">
                    Selecciona {requiredSlots} consecutivos
                  </span>
                  {selectedSlotIds.length > 0 && (
                    <span className="block text-xs text-blue-600">
                      {selectedSlotIds.length}/{requiredSlots} slots
                    </span>
                  )}
                </div>
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
              {format(weekStartDate, 'd MMM', { locale: es })} - {format(weekEndDate, 'd MMM', { locale: es })}
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

        {hasRecommended && (
          <div className="relative overflow-hidden rounded-md border border-warning/30 bg-warning/5 p-2 md:p-3">
            <span
              aria-hidden
              className="pointer-events-none absolute right-0 top-0 w-0 h-0 border-t-[16px] border-l-[16px] md:border-t-[20px] md:border-l-[20px] border-t-warning border-l-transparent"
            />
            <div className="text-xs md:text-sm font-medium text-warning">Horario recomendado</div>
            <p className="text-xs text-muted-foreground mt-1">
              El proveedor ya se encuentra en el condominio antes o después de estos horarios.
            </p>
            <p className="text-xs text-muted-foreground">
              Reservá estos espacios para ayudar a ordenar su agenda.
            </p>
          </div>
        )}

        {/* Slots Grid */}
        <div className="space-y-4 md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7 md:gap-4 lg:gap-5 xl:gap-6 md:space-y-0">
          {slotGroups.map(group => {
            const availableSlots = group.slots.filter(slot => slot.isAvailable);
            return (
              <div key={format(group.date, 'yyyy-MM-dd')} className="space-y-3">
                {/* Day Header */}
                <div className="text-left border-b border-gray-200 pb-2 mb-3 md:text-center md:border-b-0 md:pb-0 md:mb-0">
                  <div className="text-base md:text-sm font-medium text-gray-900 capitalize">
                    {format(group.date, 'EEEE', { locale: es })}
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