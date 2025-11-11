import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProviderSlotManagement } from '@/hooks/useProviderSlotManagement';
import { groupSlotsByDate } from '@/utils/weeklySlotUtils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatDateES } from '@/lib/utils';
import { getCalendarWeekRange, getCalendarWeekLabel } from '@/utils/calendarWeekUtils';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Shield,
  RotateCcw,
  Repeat2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { logger } from '@/utils/logger';

interface ProviderSlotBlockingGridProps {
  providerId: string;
  listingId: string;
  serviceDuration: number;
}

const ProviderSlotBlockingGrid = ({
  providerId,
  listingId,
  serviceDuration
}: ProviderSlotBlockingGridProps) => {
  const [currentWeek, setCurrentWeek] = useState(0);
  const [blockingSlots, setBlockingSlots] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Usar semanas calendario reales (lunes a domingo)
  const { startDate, endDate } = getCalendarWeekRange(currentWeek);
  const daysInWeek = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  const {
    slots,
    isLoading,
    lastUpdated,
    refreshSlots
  } = useProviderSlotManagement({
    providerId,
    listingId,
    serviceDuration,
    startDate,
    daysAhead: daysInWeek
  });

  // Group slots by date y filtrar solo los slots de ESTA semana específica
  const slotGroups = useMemo(() => {
    // Filtrar slots que estén exactamente dentro del rango de esta semana
    const weekSlots = slots.filter(slot => {
      const slotDate = slot.date;
      return slotDate >= startDate && slotDate <= endDate;
    });
    
    logger.debug('Semana slots filtering', { 
      week: currentWeek, 
      start: format(startDate, 'yyyy-MM-dd'), 
      end: format(endDate, 'yyyy-MM-dd'),
      totalSlots: slots.length,
      weekSlots: weekSlots.length
    });
    
    return groupSlotsByDate(weekSlots);
  }, [slots, startDate, endDate, currentWeek]);

  const handleSlotToggle = async (slotId: string, date: Date, time: string) => {
    const slot = slotGroups
      .flatMap(group => group.slots)
      .find(s => s.id === slotId);
    
    if (!slot) return;

    // Prevenir edición de slots recurrentes
    if (slot.conflictReason === 'Bloqueado por cita recurrente') {
      toast({
        title: 'Horario protegido',
        description: 'Este horario está bloqueado por un plan recurrente y no puede modificarse manualmente.',
        variant: 'destructive'
      });
      return;
    }

    const isCurrentlyAvailable = slot.isAvailable;
    const action = isCurrentlyAvailable ? 'bloquear' : 'desbloquear';
    
    setBlockingSlots(prev => new Set(prev).add(slotId));

    try {
      // Buscar el slot en la base de datos para actualizarlo
      const slotDateStr = format(date, 'yyyy-MM-dd');
      
      // Primero verificar si el slot existe en la DB
      const { data: existingSlot, error: fetchError } = await supabase
        .from('provider_time_slots')
        .select('*')
        .eq('provider_id', providerId)
        .eq('listing_id', listingId)
        .eq('slot_date', slotDateStr)
        .eq('start_time', time)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      if (existingSlot) {
        // Actualizar slot existente
        const { error: updateError } = await supabase
          .from('provider_time_slots')
          .update({ 
            is_available: !isCurrentlyAvailable,
            // Si lo estamos bloqueando, marcarlo como reservado manualmente
            is_reserved: isCurrentlyAvailable,
            slot_type: isCurrentlyAvailable ? 'manually_blocked' : 'generated'
          })
          .eq('id', existingSlot.id);

        if (updateError) throw updateError;
      } else {
        // Crear nuevo slot bloqueado si no existe
        if (isCurrentlyAvailable) {
          const endTime = new Date(date);
          const [hours, minutes] = time.split(':').map(Number);
          endTime.setHours(hours, minutes);
          endTime.setMinutes(endTime.getMinutes() + serviceDuration);

          const slotStart = new Date(date);
          slotStart.setHours(hours, minutes);

          const { error: insertError } = await supabase
            .from('provider_time_slots')
            .insert({
              provider_id: providerId,
              listing_id: listingId,
              slot_date: slotDateStr,
              start_time: time,
              end_time: format(endTime, 'HH:mm'),
              slot_datetime_start: slotStart.toISOString(),
              slot_datetime_end: endTime.toISOString(),
              is_available: false,
              is_reserved: true,
              slot_type: 'manually_blocked'
            });

          if (insertError) throw insertError;
        }
      }

      // Actualizar la UI local y refrescar
      await refreshSlots();
      
      toast({
        title: `Horario ${action === 'bloquear' ? 'bloqueado' : 'desbloqueado'}`,
        description: `${formatDateES(date, 'EEEE d MMMM', { locale: es })} a las ${time} ha sido ${action === 'bloquear' ? 'bloqueado' : 'desbloqueado'} exitosamente.`,
        variant: action === 'bloquear' ? 'default' : 'default'
      });

    } catch (error) {
      logger.error(`Error al ${action} slot:`, { error, slotId, action });
      toast({
        title: 'Error',
        description: `No se pudo ${action} el horario. Intenta nuevamente.`,
        variant: 'destructive'
      });
    } finally {
      setBlockingSlots(prev => {
        const newSet = new Set(prev);
        newSet.delete(slotId);
        return newSet;
      });
    }
  };

  const goToPreviousWeek = () => {
    if (currentWeek > 0) {
      setCurrentWeek(prev => prev - 1);
    }
  };

  const goToNextWeek = () => {
    setCurrentWeek(prev => prev + 1);
  };

  const handleSave = () => {
    toast({
      title: 'Configuración guardada',
      description: 'Los cambios en tus horarios han sido guardados exitosamente.',
      variant: 'default'
    });
  };

  if (isLoading) {
    return (
      <Card className="shadow-md">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin text-primary" />
            <p className="text-gray-500">Cargando horarios...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (slotGroups.length === 0) {
    return (
      <Card className="shadow-md border-yellow-200 bg-yellow-50">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
            <p className="text-yellow-800 font-medium mb-2">
              No hay horarios configurados para esta semana
            </p>
            <p className="text-yellow-700 text-sm mb-4">
              Configure su disponibilidad primero en la pestaña "Configurar Disponibilidad"
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

  const totalSlots = slotGroups.reduce((acc, group) => acc + group.slots.length, 0);
  const availableSlots = slotGroups.reduce((acc, group) => 
    acc + group.slots.filter(slot => slot.isAvailable).length, 0);
  const blockedSlots = slotGroups.reduce((acc, group) => 
    acc + group.slots.filter(slot => !slot.isAvailable && slot.conflictReason !== 'Bloqueado por cita recurrente').length, 0);
  const recurringSlots = slotGroups.reduce((acc, group) => 
    acc + group.slots.filter(slot => slot.conflictReason === 'Bloqueado por cita recurrente').length, 0);

  return (
    <div className="w-full space-y-3">
      {/* Mobile Layout */}
      <div className="md:hidden">
        {/* Week display above navigation */}
        <div className="text-center mb-3">
          <div className="font-semibold text-gray-900 text-lg">{currentWeek === 0 ? 'Semana actual' : `Semana ${currentWeek + 1}`}</div>
          <div className="text-gray-600 text-sm">
            {formatDateES(startDate, 'd MMM', { locale: es })} – {formatDateES(endDate, 'd MMM', { locale: es })}
          </div>
        </div>
        
        {/* Week navigation */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <Button
            variant="outline"
            onClick={goToPreviousWeek}
            disabled={currentWeek === 0}
            className="px-3 py-2 text-sm"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          
          <Button
            variant="outline"
            onClick={goToNextWeek}
            className="px-3 py-2 text-sm"
          >
            Siguiente
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        
        {/* Stats badges - Smaller and compact */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="text-center">
            <div className="text-xs text-gray-600 mb-1">Disponibles</div>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-sm font-semibold">{availableSlots}</span>
              </div>
            </Badge>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-600 mb-1">Bloqueados</div>
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-sm font-semibold">{blockedSlots}</span>
              </div>
            </Badge>
          </div>
          {recurringSlots > 0 && (
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">Recurrentes</div>
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 px-3 py-2">
                <div className="flex items-center gap-2">
                  <Repeat2 className="w-3 h-3 text-amber-600" />
                  <span className="text-sm font-semibold">{recurringSlots}</span>
                </div>
              </Badge>
            </div>
          )}
        </div>

        {/* Mobile Slots Grid */}
        <div className="space-y-3 px-1 pb-4">
          {slotGroups.map(group => (
            <div key={format(group.date, 'yyyy-MM-dd')} className="bg-white rounded-lg border shadow-sm p-3">
              {/* Day Header */}
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
                <div className="flex flex-col">
                  <div className="text-sm font-medium text-gray-900">
                    {formatDateES(group.date, 'EEEE', { locale: es })}
                  </div>
                  <div className="text-xs text-gray-500">
                    {group.dayNumber} {group.dayMonth}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-600 font-medium">
                    {group.slots.filter(s => s.isAvailable).length} de {group.slots.length}
                  </div>
                  <div className="text-xs text-gray-500">
                    disponibles
                  </div>
                </div>
              </div>

              {/* Day Slots */}
              <div className="relative">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 snap-x snap-mandatory">
                  {group.slots.map(slot => {
                    const isBlocking = blockingSlots.has(slot.id);
                    const isRecurring = slot.conflictReason === 'Bloqueado por cita recurrente';
                    return (
                      <button
                        key={slot.id}
                        onClick={() => handleSlotToggle(slot.id, slot.date, slot.time)}
                        disabled={isBlocking || isRecurring}
                        className={cn(
                          'flex-shrink-0 flex flex-col items-center justify-center gap-1',
                          'w-16 h-12 rounded-lg text-xs font-medium transition-all duration-200',
                          'border-2 shadow-sm touch-manipulation snap-center relative',
                          'disabled:opacity-50 disabled:cursor-not-allowed',
                          slot.isAvailable 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:shadow-md active:scale-95' 
                            : isRecurring
                              ? 'bg-gradient-to-br from-amber-50 to-yellow-50 text-amber-800 border-amber-300 shadow-amber-100/50 cursor-not-allowed'
                              : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:shadow-md active:scale-95',
                          isBlocking && !isRecurring ? 'animate-pulse' : ''
                        )}
                        title={isRecurring ? 'Horario bloqueado por plan recurrente' : undefined}
                      >
                        <span className="text-xs font-bold leading-none">{slot.displayTime}</span>
                        <span className="text-xs opacity-75 leading-none">{slot.period}</span>
                        <div className={cn(
                          'w-2 h-2 rounded-full',
                          slot.isAvailable 
                            ? 'bg-emerald-500' 
                            : isRecurring 
                              ? 'bg-amber-500' 
                              : 'bg-red-500'
                        )} />
                        {isRecurring && (
                          <div className="absolute -top-1 -right-1">
                            <div className="bg-amber-400 rounded-full p-0.5 shadow-sm">
                              <Repeat2 className="w-2 h-2 text-amber-800" />
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                
                {/* Scroll indicator shadows */}
                <div className="absolute left-0 top-0 bottom-2 w-4 bg-gradient-to-r from-white to-transparent pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-2 w-4 bg-gradient-to-l from-white to-transparent pointer-events-none" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block">
        {/* Week display above navigation */}
        <div className="text-center mb-3">
          <div className="font-semibold text-gray-900 text-xl">{currentWeek === 0 ? 'Semana actual' : `Semana ${currentWeek + 1}`}</div>
          <div className="text-gray-600 text-sm">
            {formatDateES(startDate, 'd MMM', { locale: es })} – {formatDateES(endDate, 'd MMM', { locale: es })}
          </div>
        </div>
        
        {/* Week navigation */}
        <div className="flex items-center justify-center gap-6 mb-4">
          <Button
            variant="outline"
            onClick={goToPreviousWeek}
            disabled={currentWeek === 0}
            className="px-4 py-2 text-sm"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Anterior
          </Button>
          
          <Button
            variant="outline"
            onClick={goToNextWeek}
            className="px-4 py-2 text-sm"
          >
            Siguiente
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
        
        {/* Stats badges - Smaller and compact */}
        <div className="flex items-center justify-center gap-6 mb-4">
          <div className="text-center">
            <div className="text-xs text-gray-600 mb-1">Disponibles</div>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 px-4 py-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-lg font-semibold">{availableSlots}</span>
              </div>
            </Badge>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-600 mb-1">Bloqueados</div>
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 px-4 py-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-lg font-semibold">{blockedSlots}</span>
              </div>
            </Badge>
          </div>
          {recurringSlots > 0 && (
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">Recurrentes</div>
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 px-4 py-2">
                <div className="flex items-center gap-2">
                  <Repeat2 className="w-4 h-4 text-amber-600" />
                  <span className="text-lg font-semibold">{recurringSlots}</span>
                </div>
              </Badge>
            </div>
          )}
        </div>

        {/* Stats and Refresh */}
        <div className="flex justify-between items-center py-2 px-1 mb-3">
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <span>{slotGroups.length} días con horarios</span>
            <span>•</span>
            <span>Total: {totalSlots} horarios</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshSlots}
            disabled={isLoading}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-xs"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>

        {/* Desktop Slots Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-7 gap-3">
          {slotGroups.map(group => (
            <div key={format(group.date, 'yyyy-MM-dd')} className="space-y-2">
              {/* Day Header */}
              <div className="text-center">
                <div className="text-xs font-medium text-gray-900">
                  {formatDateES(group.date, 'EEEE', { locale: es })}
                </div>
                <div className="text-xs text-gray-500">
                  {group.dayNumber} {group.dayMonth}
                </div>
                <div className="text-xs text-gray-600 font-medium mt-1">
                  {group.slots.filter(s => s.isAvailable).length} de {group.slots.length} disponibles
                </div>
              </div>

              {/* Day Slots */}
              <div className="space-y-1 max-h-56 overflow-y-auto">
                {group.slots.map(slot => {
                  const isBlocking = blockingSlots.has(slot.id);
                  const isRecurring = slot.conflictReason === 'Bloqueado por cita recurrente';
                  return (
                    <button
                      key={slot.id}
                      onClick={() => handleSlotToggle(slot.id, slot.date, slot.time)}
                      disabled={isBlocking || isRecurring}
                      className={cn(
                        'w-full flex flex-col items-center justify-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-200 border-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed relative',
                        slot.isAvailable 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:shadow-md' 
                          : isRecurring
                            ? 'bg-gradient-to-br from-amber-50 to-yellow-50 text-amber-800 border-amber-300 shadow-amber-100/50 cursor-not-allowed'
                            : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:shadow-md',
                        isBlocking && !isRecurring ? 'animate-pulse' : ''
                      )}
                      title={isRecurring ? 'Horario bloqueado por plan recurrente' : undefined}
                    >
                      <span className="font-semibold text-xs">{slot.displayTime}</span>
                      <span className="text-xs opacity-75">{slot.period}</span>
                      {isRecurring && (
                        <div className="absolute -top-0.5 -right-0.5">
                          <div className="bg-amber-400 rounded-full p-0.5 shadow-sm">
                            <Repeat2 className="w-2 h-2 text-amber-800" />
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Instructions - Mobile */}
      <div className="md:hidden mt-3 mx-1">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-800">
              <p className="font-medium mb-2">¿Cómo gestionar tus horarios?</p>
               <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded bg-emerald-500" />
                  <span>Verde: Disponible para clientes</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded bg-red-500" />
                  <span>Rojo: Bloqueado (no visible)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded bg-amber-500 relative">
                    <Repeat2 className="w-1.5 h-1.5 text-amber-800 absolute inset-0 m-auto" />
                  </div>
                  <span>Amarillo: Plan recurrente (protegido)</span>
                </div>
              </div>
              <p className="mt-2 text-xs opacity-90">
                Toca cualquier horario para bloquearlo o desbloquearlo
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions - Desktop */}
      <div className="hidden md:block">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 mt-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-800">
              <p className="font-medium mb-2">¿Cómo gestionar tus horarios?</p>
               <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded bg-emerald-500" />
                  <span>Disponible para clientes</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded bg-red-500" />
                  <span>Bloqueado (no visible)</span>
                </div>
                <div className="flex items-center gap-2 col-span-2">
                  <div className="w-2 h-2 rounded bg-amber-500 relative flex items-center justify-center">
                    <Repeat2 className="w-1.5 h-1.5 text-amber-800" />
                  </div>
                  <span>Plan recurrente (protegido)</span>
                </div>
              </div>
              <p className="mt-2 text-xs opacity-90">
                Haz clic en cualquier horario para bloquearlo o desbloquearlo instantáneamente
              </p>
            </div>
          </div>
        </div>
        
        {lastUpdated && (
          <div className="text-center text-xs text-gray-500 mt-2">
            Actualizado: {format(lastUpdated, 'HH:mm')}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProviderSlotBlockingGrid;