import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProviderSlotManagement } from '@/hooks/useProviderSlotManagement';
import { groupSlotsByDate } from '@/utils/weeklySlotUtils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatDateES, formatTo12Hour, cn } from '@/lib/utils';
import { getCalendarWeekRange } from '@/utils/calendarWeekUtils';
import { ChevronLeft, ChevronRight, RefreshCw, AlertCircle, Repeat2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface AvailabilityManageTabProps {
  providerId: string;
  listingId: string;
  serviceDuration: number;
}

interface SlotOverride {
  desiredIsAvailable: boolean;
  startedAt: number;
  dbConfirmed: boolean;
}

const generateSlotKey = (date: string, time: string, providerId: string, listingId: string): string => {
  const normalizedTime = time.includes(':') ? time.split(':').slice(0, 2).join(':') : time;
  return `${date}|${normalizedTime}|${providerId}|${listingId}`;
};

export const AvailabilityManageTab: React.FC<AvailabilityManageTabProps> = ({
  providerId,
  listingId,
  serviceDuration
}) => {
  const [currentWeek, setCurrentWeek] = useState(0);
  const [blockingSlots, setBlockingSlots] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<Map<string, SlotOverride>>(new Map());
  const { toast } = useToast();

  const { startDate, endDate } = getCalendarWeekRange(currentWeek);
  const daysInWeek = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  const {
    slots,
    isLoading,
    refreshSlots
  } = useProviderSlotManagement({
    providerId,
    listingId,
    serviceDuration,
    startDate,
    daysAhead: daysInWeek
  });

  const normalizeTime = (time: string): string => {
    const parts = time.split(':');
    const hours = parts[0]?.padStart(2, '0') || '00';
    const minutes = parts[1]?.padStart(2, '0') || '00';
    const seconds = parts[2]?.padStart(2, '0') || '00';
    return `${hours}:${minutes}:${seconds}`;
  };

  const displaySlots = useMemo(() => {
    if (overrides.size === 0) return slots;

    return slots.map(slot => {
      const slotDateStr = format(slot.date, 'yyyy-MM-dd');
      const slotKey = generateSlotKey(slotDateStr, slot.time, providerId, listingId);
      const override = overrides.get(slotKey);
      
      if (override) {
        return {
          ...slot,
          isAvailable: override.desiredIsAvailable,
          slotType: override.desiredIsAvailable ? 'generated' : 'manually_blocked'
        };
      }
      return slot;
    });
  }, [slots, overrides, providerId, listingId]);

  useEffect(() => {
    if (overrides.size === 0) return;

    const confirmedKeys: string[] = [];
    
    slots.forEach(slot => {
      const slotDateStr = format(slot.date, 'yyyy-MM-dd');
      const slotKey = generateSlotKey(slotDateStr, slot.time, providerId, listingId);
      const override = overrides.get(slotKey);
      
      if (override && override.dbConfirmed && slot.isAvailable === override.desiredIsAvailable) {
        confirmedKeys.push(slotKey);
      }
    });

    if (confirmedKeys.length > 0) {
      setOverrides(prev => {
        const next = new Map(prev);
        confirmedKeys.forEach(key => next.delete(key));
        return next;
      });
    }
  }, [slots, overrides, providerId, listingId]);

  useEffect(() => {
    if (overrides.size === 0) return;
    
    const timeoutId = setTimeout(() => {
      const now = Date.now();
      const staleKeys: string[] = [];
      
      overrides.forEach((value, key) => {
        if (now - value.startedAt > 10000) {
          staleKeys.push(key);
        }
      });
      
      if (staleKeys.length > 0) {
        setOverrides(prev => {
          const next = new Map(prev);
          staleKeys.forEach(key => next.delete(key));
          return next;
        });
        refreshSlots();
      }
    }, 10000);
    
    return () => clearTimeout(timeoutId);
  }, [overrides, refreshSlots]);

  const slotGroups = useMemo(() => {
    const weekSlots = displaySlots.filter(slot => {
      return slot.date >= startDate && slot.date <= endDate;
    });
    return groupSlotsByDate(weekSlots);
  }, [displaySlots, startDate, endDate]);

  const handleSlotToggle = useCallback(async (slotId: string, date: Date, time: string) => {
    const slot = slotGroups.flatMap(group => group.slots).find(s => s.id === slotId);
    if (!slot) return;

    // PROTECCIÓN: No permitir desactivar slots de planes recurrentes (frontend + backend validation)
    const isRecurringBlocked = slot.conflictReason === 'Bloqueado por cita recurrente' || 
                               (slot as any).recurringBlocked === true;
    
    if (isRecurringBlocked) {
      toast({
        title: 'Horario protegido',
        description: 'Este horario está bloqueado por un plan recurrente activo y no puede ser modificado.',
        variant: 'destructive'
      });
      return;
    }

    const isCurrentlyAvailable = slot.isAvailable;
    const desiredIsAvailable = !isCurrentlyAvailable;
    const action = isCurrentlyAvailable ? 'bloquear' : 'desbloquear';
    
    const slotDateStr = format(date, 'yyyy-MM-dd');
    const slotKey = generateSlotKey(slotDateStr, time, providerId, listingId);
    
    setOverrides(prev => {
      const next = new Map(prev);
      next.set(slotKey, { desiredIsAvailable, startedAt: Date.now(), dbConfirmed: false });
      return next;
    });
    
    setBlockingSlots(prev => new Set(prev).add(slotId));

    try {
      const normalizedTime = normalizeTime(time);
      
      const { data: existingSlot, error: fetchError } = await supabase
        .from('provider_time_slots')
        .select('*')
        .eq('provider_id', providerId)
        .eq('listing_id', listingId)
        .eq('slot_date', slotDateStr)
        .or(`start_time.eq.${normalizedTime},start_time.eq.${time}`)
        .maybeSingle();

      if (fetchError) throw fetchError;

      let dbSuccess = false;

      if (existingSlot) {
        const { data: updatedData, error: updateError } = await supabase
          .from('provider_time_slots')
          .update({ 
            is_available: desiredIsAvailable,
            is_reserved: !desiredIsAvailable,
            slot_type: desiredIsAvailable ? 'generated' : 'manually_blocked'
          })
          .eq('id', existingSlot.id)
          .select('id, is_available')
          .single();

        if (updateError) throw updateError;
        if (updatedData && updatedData.is_available === desiredIsAvailable) {
          dbSuccess = true;
        }
      } else if (isCurrentlyAvailable) {
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
          .select('id, is_available')
          .single();

        if (insertError) throw insertError;
        if (insertedData && insertedData.is_available === false) {
          dbSuccess = true;
        }
      } else {
        dbSuccess = true;
      }

      if (dbSuccess) {
        setOverrides(prev => {
          const next = new Map(prev);
          const existing = next.get(slotKey);
          if (existing) {
            next.set(slotKey, { ...existing, dbConfirmed: true });
          }
          return next;
        });
      }

      toast({
        title: `Horario ${action === 'bloquear' ? 'bloqueado' : 'desbloqueado'}`,
        description: `${formatDateES(date, 'EEEE d MMMM', { locale: es })} a las ${formatTo12Hour(time)}`,
        variant: 'default'
      });

    } catch (error) {
      setOverrides(prev => {
        const next = new Map(prev);
        next.delete(slotKey);
        return next;
      });
      
      logger.error(`Error al ${action} slot:`, error);
      toast({
        title: 'Error',
        description: `No se pudo ${action} el horario.`,
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

  const goToPreviousWeek = () => currentWeek > 0 && setCurrentWeek(prev => prev - 1);
  const goToNextWeek = () => setCurrentWeek(prev => prev + 1);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin text-primary" />
        <p className="text-muted-foreground">Cargando horarios...</p>
      </div>
    );
  }

  const totalSlots = slotGroups.reduce((acc, group) => acc + group.slots.length, 0);
  const availableSlots = slotGroups.reduce((acc, group) => 
    acc + group.slots.filter(slot => slot.isAvailable).length, 0);
  const blockedSlots = slotGroups.reduce((acc, group) => 
    acc + group.slots.filter(slot => !slot.isAvailable && slot.conflictReason !== 'Bloqueado por cita recurrente').length, 0);
  const recurringSlots = slotGroups.reduce((acc, group) => 
    acc + group.slots.filter(slot => slot.conflictReason === 'Bloqueado por cita recurrente').length, 0);

  if (slotGroups.length === 0) {
    return (
      <Card className="shadow-sm border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-amber-600" />
            <p className="text-amber-800 font-medium mb-2">
              No hay horarios configurados para esta semana
            </p>
            <p className="text-amber-700 text-sm mb-4">
              Configure su disponibilidad en la pestaña "Configurar"
            </p>
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" onClick={goToPreviousWeek} disabled={currentWeek === 0}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
              <Button variant="outline" size="sm" onClick={goToNextWeek}>
                Siguiente <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={goToPreviousWeek} disabled={currentWeek === 0}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="text-center">
          <div className="font-semibold text-foreground">
            {currentWeek === 0 ? 'Semana actual' : `Semana ${currentWeek + 1}`}
          </div>
          <div className="text-sm text-muted-foreground">
            {formatDateES(startDate, 'd MMM', { locale: es })} – {formatDateES(endDate, 'd MMM', { locale: es })}
          </div>
        </div>
        
        <Button variant="outline" size="sm" onClick={goToNextWeek}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-emerald-500" />
          <span className="text-xs text-muted-foreground">Disponibles ({availableSlots})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span className="text-xs text-muted-foreground">Bloqueados ({blockedSlots})</span>
        </div>
        {recurringSlots > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-amber-500" />
            <span className="text-xs text-muted-foreground">Recurrentes ({recurringSlots})</span>
          </div>
        )}
      </div>

      {/* Sync indicator */}
      {overrides.size > 0 && (
        <div className="flex justify-center">
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            {overrides.size} sincronizando...
          </Badge>
        </div>
      )}

      {/* Day Cards with Slot Grid */}
      <div className="space-y-3">
        {slotGroups.map((group, groupIndex) => {
          const dateStr = format(group.date, 'yyyy-MM-dd');
          return (
            <Card key={`day-${dateStr}-${groupIndex}`} className="shadow-sm">
              <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-medium capitalize text-foreground">
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
                        key={`slot-${slot.id}-${slotIndex}`}
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
                        title={slot.conflictReason || (slot.isAvailable ? 'Click para bloquear' : 'Click para habilitar')}
                      >
                        {formatTo12Hour(slot.time)}
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
  );
};
