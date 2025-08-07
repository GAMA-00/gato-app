import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProviderSlotManagement } from '@/hooks/useProviderSlotManagement';
import { groupSlotsByDate } from '@/utils/weeklySlotUtils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getCalendarWeekRange, getCalendarWeekLabel } from '@/utils/calendarWeekUtils';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Shield
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
    
    console.log(`📅 Semana ${currentWeek}: Filtrando slots entre ${format(startDate, 'yyyy-MM-dd')} y ${format(endDate, 'yyyy-MM-dd')}`);
    console.log(`📊 Slots totales: ${slots.length}, Slots en esta semana: ${weekSlots.length}`);
    
    return groupSlotsByDate(weekSlots);
  }, [slots, startDate, endDate, currentWeek]);

  const handleSlotToggle = async (slotId: string, date: Date, time: string) => {
    const slot = slotGroups
      .flatMap(group => group.slots)
      .find(s => s.id === slotId);
    
    if (!slot) return;

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
        description: `${format(date, 'EEEE d MMMM', { locale: es })} a las ${time} ha sido ${action === 'bloquear' ? 'bloqueado' : 'desbloqueado'} exitosamente.`,
        variant: action === 'bloquear' ? 'default' : 'default'
      });

    } catch (error) {
      console.error(`Error al ${action} slot:`, error);
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
  const blockedSlots = totalSlots - availableSlots;

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-4 px-4 pt-4 md:px-6">
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div className="text-center md:text-left">
            <CardTitle className="text-lg md:text-xl flex items-center justify-center md:justify-start gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="md:hidden">Gestionar horarios</span>
              <span className="hidden md:inline">Administrar Disponibilidad de Horarios</span>
            </CardTitle>
            <CardDescription className="mt-2 text-sm">
              <span className="md:hidden">Toca para bloquear/desbloquear horarios</span>
              <span className="hidden md:inline">Estos son los mismos horarios que ven tus clientes. Puedes bloquearlos si tienes otros compromisos.</span>
            </CardDescription>
          </div>
          
          {/* Stats badges - Móvil: compactos, Desktop: detallados */}
          <div className="flex items-center justify-center gap-2 md:gap-3">
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 px-3 py-1">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-medium">{availableSlots}</span>
                <span className="hidden md:inline text-xs">disponibles</span>
              </div>
            </Badge>
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 px-3 py-1">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-xs font-medium">{blockedSlots}</span>
                <span className="hidden md:inline text-xs">bloqueados</span>
              </div>
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 px-4 md:px-6">
        {/* Week Navigation - Mejorado para móvil */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
          <Button
            variant="outline"
            size="default"
            onClick={goToPreviousWeek}
            disabled={currentWeek === 0}
            className="flex items-center gap-2 min-h-[48px] px-4 rounded-xl border-2 disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Anterior</span>
          </Button>
          
          <div className="text-center px-2">
            <div className="text-base font-semibold text-gray-900">
              {getCalendarWeekLabel(currentWeek)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {format(startDate, 'd MMM', { locale: es })} - {format(endDate, 'd MMM', { locale: es })}
            </div>
          </div>

          <Button
            variant="outline"
            size="default"
            onClick={goToNextWeek}
            className="flex items-center gap-2 min-h-[48px] px-4 rounded-xl border-2"
          >
            <span className="hidden sm:inline">Siguiente</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Stats and Refresh - Desktop only */}
        <div className="hidden md:flex justify-between items-center py-2 px-1">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>{slotGroups.length} días con horarios</span>
            <span>•</span>
            <span>Total: {totalSlots} horarios</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshSlots}
            disabled={isLoading}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>

        {/* Slots Grid - Optimizado para móvil con scrolls horizontales independientes */}
        <div className="space-y-6 md:grid md:grid-cols-2 lg:grid-cols-7 md:gap-4 md:space-y-0">
          {slotGroups.map(group => (
            <div key={format(group.date, 'yyyy-MM-dd')} className="space-y-3">
              {/* Day Header - Mejorado para móvil */}
              <div className="flex items-center justify-between md:block md:text-center">
                <div className="flex flex-col">
                  <div className="text-base md:text-sm font-semibold text-gray-900">
                    {format(group.date, 'EEEE', { locale: es })}
                  </div>
                  <div className="text-sm md:text-xs text-gray-500">
                    {group.dayNumber} {group.dayMonth}
                  </div>
                </div>
                <div className="text-right md:text-center md:mt-1">
                  <div className="text-xs text-gray-600 font-medium">
                    {group.slots.filter(s => s.isAvailable).length} de {group.slots.length}
                  </div>
                  <div className="text-xs text-gray-500">
                    disponibles
                  </div>
                </div>
              </div>

              {/* Day Slots - Lista horizontal con scroll independiente */}
              <div className="relative">
                <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-gray-300 md:flex-col md:overflow-x-visible md:space-y-2 md:max-h-64 md:overflow-y-auto md:pb-0">
                  {group.slots.map(slot => {
                    const isBlocking = blockingSlots.has(slot.id);
                    return (
                      <button
                        key={slot.id}
                        onClick={() => handleSlotToggle(slot.id, slot.date, slot.time)}
                        disabled={isBlocking}
                        className={cn(
                          'flex-shrink-0 flex flex-col items-center justify-center gap-1',
                          'w-20 h-16 rounded-xl text-sm font-medium transition-all duration-200',
                          'border-2 shadow-sm',
                          'disabled:opacity-50 disabled:cursor-not-allowed',
                          slot.isAvailable 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:shadow-md hover:scale-105 active:scale-95' 
                            : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:shadow-md hover:scale-105 active:scale-95',
                          isBlocking ? 'animate-pulse' : '',
                          'md:w-auto md:h-auto md:flex-shrink md:px-3 md:py-2 md:rounded-lg md:hover:scale-100'
                        )}
                      >
                        <span className="text-base font-bold leading-none">{slot.displayTime}</span>
                        <span className="text-xs opacity-75 leading-none">{slot.period}</span>
                        {slot.isAvailable ? (
                          <div className="w-3 h-3 rounded-full bg-emerald-500 md:hidden" />
                        ) : (
                          <div className="w-3 h-3 rounded-full bg-red-500 md:hidden" />
                        )}
                      </button>
                    );
                  })}
                </div>
                
                {/* Scroll indicator shadow - Solo móvil */}
                <div className="absolute right-0 top-0 bottom-3 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none md:hidden" />
              </div>
            </div>
          ))}
        </div>

        {/* Instructions - Rediseñado para móvil */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-2">¿Cómo gestionar tus horarios?</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-emerald-500" />
                  <span>Disponible para clientes</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-red-500" />
                  <span>Bloqueado (no visible)</span>
                </div>
              </div>
              <p className="mt-2 text-xs opacity-90">
                Toca cualquier horario para bloquearlo o desbloquearlo instantáneamente
              </p>
            </div>
          </div>
        </div>

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

export default ProviderSlotBlockingGrid;