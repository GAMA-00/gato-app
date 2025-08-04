import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProviderSlotManagement } from '@/hooks/useProviderSlotManagement';
import { groupSlotsByDate } from '@/utils/weeklySlotUtils';
import { format, addWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
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

  const startDate = addWeeks(new Date(), currentWeek);
  
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
    daysAhead: 7
  });

  // Group slots by date manually
  const slotGroups = useMemo(() => groupSlotsByDate(slots), [slots]);

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
        <div className="text-center md:flex md:items-center md:justify-between md:text-left">
          <div>
            <CardTitle className="text-lg md:text-xl flex items-center justify-center md:justify-start gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="md:hidden">Administrar Horarios</span>
              <span className="hidden md:inline">Administrar Disponibilidad de Horarios</span>
            </CardTitle>
            <CardDescription className="hidden md:block mt-2">
              Estos son los mismos horarios que ven tus clientes. Puedes bloquearlos si tienes otros compromisos.
            </CardDescription>
            <CardDescription className="md:hidden text-center mt-2">
              {availableSlots} disponibles, {blockedSlots} bloqueados
            </CardDescription>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              {availableSlots} disponibles
            </Badge>
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
              <XCircle className="h-3 w-3 mr-1" />
              {blockedSlots} bloqueados
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
            {slotGroups.length} días con horarios • Total: {totalSlots} horarios
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

        {/* Slots Grid - Mostrar TODOS los slots con colores diferentes */}
        <div className="space-y-4 md:grid md:grid-cols-2 lg:grid-cols-7 md:gap-4 md:space-y-0">
          {slotGroups.map(group => (
            <div key={format(group.date, 'yyyy-MM-dd')} className="space-y-3">
              {/* Day Header */}
              <div className="text-left border-b border-gray-200 pb-2 mb-3 md:text-center md:border-b-0 md:pb-0 md:mb-0">
                <div className="text-base md:text-sm font-medium text-gray-900">
                  {format(group.date, 'EEEE', { locale: es })}
                </div>
                <div className="text-sm md:text-xs text-gray-500">
                  {group.dayNumber} {group.dayMonth}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {group.slots.filter(s => s.isAvailable).length} de {group.slots.length} disponibles
                </div>
              </div>

              {/* Day Slots - Mostrar TODOS los slots */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 md:flex-col md:overflow-x-visible md:space-y-2 md:max-h-64 md:overflow-y-auto md:pb-0">
                {group.slots.map(slot => {
                  const isBlocking = blockingSlots.has(slot.id);
                  return (
                    <button
                      key={slot.id}
                      onClick={() => handleSlotToggle(slot.id, slot.date, slot.time)}
                      disabled={isBlocking}
                      className={`
                        flex-shrink-0 min-w-[80px] md:min-w-auto md:flex-shrink
                        px-3 py-2 rounded-lg text-sm font-medium transition-colors
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${slot.isAvailable 
                          ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100' 
                          : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                        }
                        ${isBlocking ? 'animate-pulse' : ''}
                      `}
                    >
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-normal">{slot.displayTime}</span>
                        <span className="text-xs">{slot.period}</span>
                        {slot.isAvailable ? (
                          <CheckCircle className="h-3 w-3 mt-1" />
                        ) : (
                          <XCircle className="h-3 w-3 mt-1" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">¿Cómo funciona?</p>
              <ul className="text-xs space-y-1">
                <li>• <strong>Verde:</strong> Horario disponible para clientes</li>
                <li>• <strong>Rojo:</strong> Horario bloqueado (no visible para clientes)</li>
                <li>• Haz clic en cualquier horario para bloquearlo/desbloquearlo</li>
                <li>• Los cambios se reflejan inmediatamente para nuevas reservas</li>
              </ul>
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