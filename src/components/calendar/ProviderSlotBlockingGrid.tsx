import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProviderSlotManagement } from '@/hooks/useProviderSlotManagement';
import { groupSlotsByDate } from '@/utils/weeklySlotUtils';
import { WeeklySlot } from '@/lib/weeklySlotTypes';
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

// Override type for deterministic overlay system
interface SlotOverride {
  desiredIsAvailable: boolean;
  startedAt: number;
  dbConfirmed: boolean; // True when DB write succeeded
}

// Generate stable slot key (not dependent on DB id which may change)
const generateSlotKey = (date: string, time: string, providerId: string, listingId: string): string => {
  const normalizedTime = time.includes(':') ? time.split(':').slice(0, 2).join(':') : time;
  return `${date}|${normalizedTime}|${providerId}|${listingId}`;
};

const ProviderSlotBlockingGrid = ({
  providerId,
  listingId,
  serviceDuration
}: ProviderSlotBlockingGridProps) => {
  const [currentWeek, setCurrentWeek] = useState(0);
  const [blockingSlots, setBlockingSlots] = useState<Set<string>>(new Set());
  
  // NEW: Deterministic overlay system - overrides NEVER get overwritten by stale server data
  const [overrides, setOverrides] = useState<Map<string, SlotOverride>>(new Map());
  
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

  // Helper para normalizar tiempo a formato HH:mm:ss
  const normalizeTime = (time: string): string => {
    const parts = time.split(':');
    const hours = parts[0]?.padStart(2, '0') || '00';
    const minutes = parts[1]?.padStart(2, '0') || '00';
    const seconds = parts[2]?.padStart(2, '0') || '00';
    return `${hours}:${minutes}:${seconds}`;
  };

  // DERIVED STATE: Merge server slots with local overrides
  // Overrides take precedence until server confirms the change
  const displaySlots = useMemo(() => {
    if (overrides.size === 0) {
      return slots;
    }

    return slots.map(slot => {
      const slotDateStr = format(slot.date, 'yyyy-MM-dd');
      const slotKey = generateSlotKey(slotDateStr, slot.time, providerId, listingId);
      const override = overrides.get(slotKey);
      
      if (override) {
        // Apply override - this ensures UI stays consistent
        return {
          ...slot,
          isAvailable: override.desiredIsAvailable,
          slotType: override.desiredIsAvailable ? 'generated' : 'manually_blocked'
        };
      }
      return slot;
    });
  }, [slots, overrides, providerId, listingId]);

  // RECONCILIATION: When server snapshot changes, check if overrides can be cleared
  useEffect(() => {
    if (overrides.size === 0) return;

    const confirmedKeys: string[] = [];
    
    slots.forEach(slot => {
      const slotDateStr = format(slot.date, 'yyyy-MM-dd');
      const slotKey = generateSlotKey(slotDateStr, slot.time, providerId, listingId);
      const override = overrides.get(slotKey);
      
      if (override && override.dbConfirmed) {
        // Check if server now reflects our desired state
        if (slot.isAvailable === override.desiredIsAvailable) {
          confirmedKeys.push(slotKey);
          logger.debug('✅ Override confirmado por servidor:', { slotKey, isAvailable: slot.isAvailable });
        }
      }
    });

    if (confirmedKeys.length > 0) {
      setOverrides(prev => {
        const next = new Map(prev);
        confirmedKeys.forEach(key => next.delete(key));
        logger.debug('🧹 Overrides limpiados:', { count: confirmedKeys.length, remaining: next.size });
        return next;
      });
    }
  }, [slots, overrides, providerId, listingId]);

  // TIMEOUT: Clear stale overrides after 10s and force refresh
  useEffect(() => {
    if (overrides.size === 0) return;
    
    const timeoutId = setTimeout(() => {
      const now = Date.now();
      const staleKeys: string[] = [];
      
      overrides.forEach((value, key) => {
        // 10 second timeout for unconfirmed overrides
        if (now - value.startedAt > 10000) {
          staleKeys.push(key);
        }
      });
      
      if (staleKeys.length > 0) {
        logger.warn('⏰ Overrides sin confirmar (timeout 10s):', { staleKeys });
        
        // Check if any were DB confirmed but server just hasn't refreshed
        const unconfirmedStale = staleKeys.filter(key => {
          const override = overrides.get(key);
          return override && !override.dbConfirmed;
        });
        
        if (unconfirmedStale.length > 0) {
          toast({
            title: 'Advertencia',
            description: 'Algunos cambios no se confirmaron. Recargando...',
            variant: 'destructive'
          });
        }
        
        setOverrides(prev => {
          const next = new Map(prev);
          staleKeys.forEach(key => next.delete(key));
          return next;
        });
        
        // Force refresh to sync with server
        refreshSlots();
      }
    }, 10000);
    
    return () => clearTimeout(timeoutId);
  }, [overrides, refreshSlots, toast]);

  // Group slots by date using displaySlots (with overrides applied)
  const slotGroups = useMemo(() => {
    // Filtrar slots que estén exactamente dentro del rango de esta semana
    const weekSlots = displaySlots.filter(slot => {
      const slotDate = slot.date;
      return slotDate >= startDate && slotDate <= endDate;
    });
    
    logger.debug('Semana slots filtering', { 
      week: currentWeek, 
      start: format(startDate, 'yyyy-MM-dd'), 
      end: format(endDate, 'yyyy-MM-dd'),
      totalSlots: displaySlots.length,
      weekSlots: weekSlots.length,
      activeOverrides: overrides.size
    });
    
    return groupSlotsByDate(weekSlots);
  }, [displaySlots, startDate, endDate, currentWeek, overrides.size]);

  const handleSlotToggle = useCallback(async (slotId: string, date: Date, time: string) => {
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
    const desiredIsAvailable = !isCurrentlyAvailable;
    const action = isCurrentlyAvailable ? 'bloquear' : 'desbloquear';
    
    // Generate stable key for this slot
    const slotDateStr = format(date, 'yyyy-MM-dd');
    const slotKey = generateSlotKey(slotDateStr, time, providerId, listingId);
    
    logger.debug('🔄 handleSlotToggle iniciado:', { slotKey, currentState: isCurrentlyAvailable, desiredState: desiredIsAvailable });
    
    // ✅ SET OVERRIDE IMMEDIATELY (optimistic UI)
    setOverrides(prev => {
      const next = new Map(prev);
      next.set(slotKey, {
        desiredIsAvailable,
        startedAt: Date.now(),
        dbConfirmed: false
      });
      return next;
    });
    
    setBlockingSlots(prev => new Set(prev).add(slotId));

    try {
      // Normalizar tiempo para consistencia en DB
      const normalizedTime = normalizeTime(time);
      
      // Primero verificar si el slot existe en la DB (buscar ambos formatos por compatibilidad)
      const { data: existingSlot, error: fetchError } = await supabase
        .from('provider_time_slots')
        .select('*')
        .eq('provider_id', providerId)
        .eq('listing_id', listingId)
        .eq('slot_date', slotDateStr)
        .or(`start_time.eq.${normalizedTime},start_time.eq.${time}`)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      let dbSuccess = false;

      if (existingSlot) {
        // Actualizar slot existente
        const { data: updatedData, error: updateError } = await supabase
          .from('provider_time_slots')
          .update({ 
            is_available: desiredIsAvailable,
            is_reserved: !desiredIsAvailable,
            slot_type: desiredIsAvailable ? 'generated' : 'manually_blocked'
          })
          .eq('id', existingSlot.id)
          .select('id, is_available, is_reserved, slot_type')
          .single();

        if (updateError) throw updateError;
        
        // Verify DB returned expected state
        if (updatedData && updatedData.is_available === desiredIsAvailable) {
          dbSuccess = true;
          logger.debug('✅ DB UPDATE confirmado:', { id: existingSlot.id, is_available: updatedData.is_available });
        } else {
          throw new Error(`DB no reflejó el cambio esperado. Esperado=${desiredIsAvailable}, Recibido=${updatedData?.is_available}`);
        }
      } else {
        // Crear nuevo slot bloqueado si no existe (solo para bloquear)
        if (isCurrentlyAvailable) {
          const endTimeDate = new Date(date);
          const [hours, minutes] = time.split(':').map(Number);
          endTimeDate.setHours(hours, minutes);
          endTimeDate.setMinutes(endTimeDate.getMinutes() + serviceDuration);

          const slotStart = new Date(date);
          slotStart.setHours(hours, minutes);
          
          const normalizedEndTime = normalizeTime(format(endTimeDate, 'HH:mm'));

          const { data: insertedData, error: insertError } = await supabase
            .from('provider_time_slots')
            .insert({
              provider_id: providerId,
              listing_id: listingId,
              slot_date: slotDateStr,
              start_time: normalizedTime,
              end_time: normalizedEndTime,
              slot_datetime_start: slotStart.toISOString(),
              slot_datetime_end: endTimeDate.toISOString(),
              is_available: false,
              is_reserved: true,
              slot_type: 'manually_blocked'
            })
            .select('id, is_available, is_reserved, slot_type')
            .single();

          if (insertError) throw insertError;
          
          if (insertedData && insertedData.is_available === false) {
            dbSuccess = true;
            logger.debug('✅ DB INSERT confirmado:', { id: insertedData.id, is_available: insertedData.is_available });
          } else {
            throw new Error(`DB no guardó el bloqueo correctamente. is_available=${insertedData?.is_available}`);
          }
        } else {
          // Trying to unblock a slot that doesn't exist in DB - this shouldn't happen normally
          logger.warn('⚠️ Intentando desbloquear slot que no existe en DB:', { slotKey });
          dbSuccess = true; // Consider it a success since the desired state (available) is the default
        }
      }

      // ✅ MARK OVERRIDE AS DB CONFIRMED (but don't remove it yet!)
      // The reconciliation effect will remove it when server snapshot matches
      if (dbSuccess) {
        setOverrides(prev => {
          const next = new Map(prev);
          const existing = next.get(slotKey);
          if (existing) {
            next.set(slotKey, { ...existing, dbConfirmed: true });
          }
          return next;
        });
        
        logger.debug('📝 Override marcado como confirmado en DB:', { slotKey });
      }

      toast({
        title: `Horario ${action === 'bloquear' ? 'bloqueado' : 'desbloqueado'}`,
        description: `${formatDateES(date, 'EEEE d MMMM', { locale: es })} a las ${time} ha sido ${action === 'bloquear' ? 'bloqueado' : 'desbloqueado'} exitosamente.`,
        variant: 'default'
      });

    } catch (error) {
      // ❌ ROLLBACK: Remove override on error
      setOverrides(prev => {
        const next = new Map(prev);
        next.delete(slotKey);
        return next;
      });
      
      logger.error(`❌ Error al ${action} slot:`, { error, slotKey, action });
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
  }, [slotGroups, providerId, listingId, serviceDuration, toast]);

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

  // Calculate stats from displaySlots (with overrides applied)
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
                  <Repeat2 className="h-3 w-3" />
                  <span className="text-sm font-semibold">{recurringSlots}</span>
                </div>
              </Badge>
            </div>
          )}
        </div>
        
        {/* Pending indicator */}
        {overrides.size > 0 && (
          <div className="flex justify-center mb-3">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1">
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              {overrides.size} cambio(s) sincronizando...
            </Badge>
          </div>
        )}

        {/* Slot Grid - Mobile */}
        <div className="space-y-4">
          {slotGroups.map((group, groupIndex) => {
            const dateStr = format(group.date, 'yyyy-MM-dd');
            return (
              <Card key={`mobile-${dateStr}-${groupIndex}`} className="shadow-sm">
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-medium capitalize">
                        {formatDateES(group.date, 'EEEE', { locale: es })}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {formatDateES(group.date, 'd MMMM', { locale: es })}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {group.slots.filter(s => s.isAvailable).length}/{group.slots.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="py-2 px-3">
                  <div className="grid grid-cols-4 gap-1.5">
                    {group.slots.map((slot, slotIndex) => {
                      const slotKey = generateSlotKey(dateStr, slot.time, providerId, listingId);
                      const hasOverride = overrides.has(slotKey);
                      const isRecurring = slot.conflictReason === 'Bloqueado por cita recurrente';
                      const isBlocking = blockingSlots.has(slot.id);
                      
                      return (
                        <button
                          key={`mobile-slot-${slot.id}-${slotIndex}`}
                          onClick={() => handleSlotToggle(slot.id, group.date, slot.time)}
                          disabled={isBlocking || isRecurring}
                          className={cn(
                            "p-1.5 rounded text-xs font-medium transition-all duration-200",
                            "focus:outline-none focus:ring-2 focus:ring-offset-1",
                            slot.isAvailable
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 focus:ring-emerald-500"
                              : isRecurring
                              ? "bg-amber-100 text-amber-800 cursor-not-allowed"
                              : "bg-red-100 text-red-800 hover:bg-red-200 focus:ring-red-500",
                            isBlocking && "opacity-50 cursor-wait",
                            hasOverride && "ring-2 ring-blue-400 ring-offset-1"
                          )}
                          title={slot.conflictReason || (slot.isAvailable ? 'Disponible - Click para bloquear' : 'Bloqueado - Click para habilitar')}
                        >
                          {slot.time}
                          {isRecurring && <Repeat2 className="h-2 w-2 inline ml-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block">
        {/* Header with navigation and stats */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousWeek}
              disabled={currentWeek === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            
            <div className="text-center">
              <div className="font-semibold text-gray-900">
                {currentWeek === 0 ? 'Semana actual' : `Semana ${currentWeek + 1}`}
              </div>
              <div className="text-sm text-gray-600">
                {formatDateES(startDate, 'd MMM', { locale: es })} – {formatDateES(endDate, 'd MMM', { locale: es })}
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextWeek}
            >
              Siguiente
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          <div className="flex items-center gap-3">
            {overrides.size > 0 && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                {overrides.size} sincronizando
              </Badge>
            )}
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
              {availableSlots} disponibles
            </Badge>
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
              <div className="w-2 h-2 rounded-full bg-red-500 mr-2" />
              {blockedSlots} bloqueados
            </Badge>
            {recurringSlots > 0 && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                <Repeat2 className="h-3 w-3 mr-2" />
                {recurringSlots} recurrentes
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshSlots}
              className="text-gray-500"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Desktop Grid */}
        <div className="grid grid-cols-7 gap-3">
          {slotGroups.map((group, groupIndex) => {
            const dateStr = format(group.date, 'yyyy-MM-dd');
            return (
              <Card key={`desktop-${dateStr}-${groupIndex}`} className="shadow-sm">
                <CardHeader className="py-2 px-3">
                  <div className="text-center">
                    <CardTitle className="text-xs font-medium capitalize">
                      {formatDateES(group.date, 'EEE', { locale: es })}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {formatDateES(group.date, 'd MMM', { locale: es })}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="py-2 px-2">
                  <div className="space-y-1">
                    {group.slots.map((slot, slotIndex) => {
                      const slotKey = generateSlotKey(dateStr, slot.time, providerId, listingId);
                      const hasOverride = overrides.has(slotKey);
                      const isRecurring = slot.conflictReason === 'Bloqueado por cita recurrente';
                      const isBlocking = blockingSlots.has(slot.id);
                      
                      return (
                        <button
                          key={`desktop-slot-${slot.id}-${slotIndex}`}
                          onClick={() => handleSlotToggle(slot.id, group.date, slot.time)}
                          disabled={isBlocking || isRecurring}
                          className={cn(
                            "w-full p-1.5 rounded text-xs font-medium transition-all duration-200",
                            "focus:outline-none focus:ring-2 focus:ring-offset-1",
                            slot.isAvailable
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 focus:ring-emerald-500"
                              : isRecurring
                              ? "bg-amber-100 text-amber-800 cursor-not-allowed"
                              : "bg-red-100 text-red-800 hover:bg-red-200 focus:ring-red-500",
                            isBlocking && "opacity-50 cursor-wait",
                            hasOverride && "ring-2 ring-blue-400 ring-offset-1"
                          )}
                          title={slot.conflictReason || (slot.isAvailable ? 'Disponible - Click para bloquear' : 'Bloqueado - Click para habilitar')}
                        >
                          <span className="flex items-center justify-center gap-1">
                            {slot.time}
                            {isRecurring && <Repeat2 className="h-2.5 w-2.5" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Instructions */}
      <div className="text-center text-xs text-gray-500 mt-4 space-y-1">
        <p>
          <span className="inline-block w-3 h-3 rounded bg-emerald-200 mr-1 align-middle" />
          Verde = Disponible (click para bloquear)
        </p>
        <p>
          <span className="inline-block w-3 h-3 rounded bg-red-200 mr-1 align-middle" />
          Rojo = Bloqueado (click para habilitar)
        </p>
        {recurringSlots > 0 && (
          <p>
            <span className="inline-block w-3 h-3 rounded bg-amber-200 mr-1 align-middle" />
            Ámbar = Reservado por cita recurrente (no editable)
          </p>
        )}
      </div>
    </div>
  );
};

export default ProviderSlotBlockingGrid;
