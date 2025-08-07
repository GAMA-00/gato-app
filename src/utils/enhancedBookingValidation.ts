import { supabase } from '@/integrations/supabase/client';
import { validateBookingSlot } from './bookingValidation';
import { shouldHaveRecurrenceOn } from './optimizedRecurrenceSystem';

export interface SlotAvailabilityResult {
  isAvailable: boolean;
  reason?: string;
  conflictType?: 'appointment' | 'provider_time_slot' | 'recurrence' | 'database';
  suggestions?: string[];
}

export async function validateSlotAvailabilityForBooking(
  providerId: string,
  listingId: string,
  startTime: Date,
  endTime: Date,
  recurrence: string = 'once'
): Promise<SlotAvailabilityResult> {
  console.log('=== VALIDACIÓN MEJORADA DE DISPONIBILIDAD ===');
  console.log({ providerId, listingId, startTime, endTime, recurrence });

  try {
    // 1. Validar que el slot es válido para la recurrencia seleccionada
    if (recurrence !== 'once') {
      const normalizeRecurrenceType = (rec: string): 'once' | 'weekly' | 'biweekly' | 'triweekly' | 'monthly' => {
        switch (rec?.toLowerCase()) {
          case 'weekly': return 'weekly';
          case 'biweekly': return 'biweekly';
          case 'triweekly': return 'triweekly';
          case 'monthly': return 'monthly';
          default: return 'once';
        }
      };

      const config = {
        type: normalizeRecurrenceType(recurrence),
        startDate: startTime
      };

      const isValidForRecurrence = shouldHaveRecurrenceOn(startTime, config);
      if (!isValidForRecurrence) {
        return {
          isAvailable: false,
          reason: `Este horario no es válido para una cita ${recurrence}. Por favor selecciona un horario diferente.`,
          conflictType: 'recurrence',
          suggestions: ['Selecciona un horario que coincida con el patrón de recurrencia']
        };
      }
    }

    // 2. Validar usando nuestro sistema de validación existente
    const isSlotValid = await validateBookingSlot(providerId, startTime, endTime, recurrence);
    if (!isSlotValid) {
      return {
        isAvailable: false,
        reason: 'Este horario no está disponible',
        conflictType: 'appointment',
        suggestions: ['Selecciona otro horario disponible']
      };
    }

    // 3. Verificar que el slot existe en provider_time_slots y está disponible
    const { data: slotData, error: slotError } = await supabase
      .from('provider_time_slots')
      .select('is_available, is_reserved, recurring_blocked')
      .eq('provider_id', providerId)
      .eq('listing_id', listingId)
      .eq('slot_datetime_start', startTime.toISOString())
      .maybeSingle();

    if (slotError) {
      console.error('Error checking provider_time_slots:', slotError);
    }

    if (slotData && (!slotData.is_available || slotData.is_reserved || slotData.recurring_blocked)) {
      return {
        isAvailable: false,
        reason: slotData.recurring_blocked 
          ? 'Este horario está bloqueado por una cita recurrente' 
          : 'Este horario ya está reservado',
        conflictType: 'provider_time_slot',
        suggestions: ['Selecciona otro horario disponible']
      };
    }

    // 4. Verificar conflictos con citas existentes activas
    const { data: existingAppointments, error: appointmentError } = await supabase
      .from('appointments')
      .select('id, status, client_id, recurrence')
      .eq('provider_id', providerId)
      .eq('start_time', startTime.toISOString())
      .in('status', ['confirmed', 'pending']);

    if (appointmentError) {
      console.error('Error checking existing appointments:', appointmentError);
      return {
        isAvailable: false,
        reason: 'Error verificando disponibilidad',
        conflictType: 'database',
        suggestions: ['Intenta de nuevo en unos momentos']
      };
    }

    if (existingAppointments && existingAppointments.length > 0) {
      return {
        isAvailable: false,
        reason: 'Ya existe una cita para este horario',
        conflictType: 'appointment',
        suggestions: ['Selecciona otro horario disponible']
      };
    }

    console.log('✅ Slot validado correctamente');
    return {
      isAvailable: true
    };

  } catch (error) {
    console.error('Error en validación de slot:', error);
    return {
      isAvailable: false,
      reason: 'Error al validar la disponibilidad',
      conflictType: 'database',
      suggestions: ['Intenta de nuevo en unos momentos']
    };
  }
}

export async function refreshSlotAvailability(
  providerId: string,
  listingId: string,
  date: Date
): Promise<void> {
  console.log('Refreshing slot availability for:', { providerId, listingId, date });
  
  try {
    // Force refresh of provider time slots for this date
    const { error } = await supabase
      .from('provider_time_slots')
      .select('id')
      .eq('provider_id', providerId)
      .eq('listing_id', listingId)
      .eq('slot_date', date.toISOString().split('T')[0])
      .limit(1);

    if (error) {
      console.error('Error refreshing slots:', error);
    }
  } catch (error) {
    console.error('Error in slot refresh:', error);
  }
}