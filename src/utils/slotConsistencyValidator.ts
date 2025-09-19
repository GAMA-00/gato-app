import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

/**
 * Validates and fixes inconsistencies in slot data for a provider
 * This function can be called periodically to ensure data consistency
 */
export const validateAndFixSlotConsistency = async (
  providerId: string, 
  listingId: string,
  dateRange?: { start: Date; end: Date }
) => {
  console.log('🔍 Iniciando validación de consistencia de slots');
  
  try {
    // Default to current week if no date range provided
    const startDate = dateRange?.start || new Date();
    const endDate = dateRange?.end || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    // Get all slots in the date range
    const { data: slots, error: slotsError } = await supabase
      .from('provider_time_slots')
      .select('*')
      .eq('provider_id', providerId)
      .eq('listing_id', listingId)
      .gte('slot_date', format(startDate, 'yyyy-MM-dd'))
      .lte('slot_date', format(endDate, 'yyyy-MM-dd'));

    if (slotsError) throw slotsError;

    // Get all confirmed appointments in the same range
    const { data: appointments, error: apptError } = await supabase
      .from('appointments')
      .select('*')
      .eq('provider_id', providerId)
      .eq('listing_id', listingId)
      .in('status', ['confirmed'])
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString());

    if (apptError) throw apptError;

    let fixedCount = 0;
    const inconsistencies: any[] = [];

    for (const slot of slots || []) {
      const slotStart = new Date(slot.slot_datetime_start);
      const slotEnd = new Date(slot.slot_datetime_end);

      // Check if there's a confirmed appointment overlapping this slot
      const hasConfirmedConflict = (appointments || []).some(apt => {
        const aptStart = new Date(apt.start_time);
        const aptEnd = new Date(apt.end_time);
        return slotStart < aptEnd && slotEnd > aptStart;
      });

      // Determine what the slot status should be
      let shouldBeAvailable = true;
      let shouldBeReason = '';

      if (hasConfirmedConflict) {
        const conflictingApt = (appointments || []).find(apt => {
          const aptStart = new Date(apt.start_time);
          const aptEnd = new Date(apt.end_time);
          return slotStart < aptEnd && slotEnd > aptStart;
        });
        
        shouldBeAvailable = false;
        shouldBeReason = conflictingApt?.recurrence && conflictingApt.recurrence !== 'none' 
          ? 'recurring_blocked' 
          : 'occupied';
      } else if (slot.slot_type === 'manually_blocked') {
        shouldBeAvailable = false;
        shouldBeReason = 'manually_blocked';
      }

      // Check for inconsistency
      if (slot.is_available !== shouldBeAvailable) {
        inconsistencies.push({
          slotId: slot.id,
          datetime: slot.slot_datetime_start,
          currentAvailable: slot.is_available,
          shouldBeAvailable,
          reason: shouldBeReason
        });

        // Fix the inconsistency
        const updateData: any = {
          is_available: shouldBeAvailable,
          is_reserved: !shouldBeAvailable && shouldBeReason !== 'manually_blocked',
          recurring_blocked: shouldBeReason === 'recurring_blocked'
        };

        if (shouldBeReason === 'manually_blocked') {
          updateData.slot_type = 'manually_blocked';
        }

        const { error: updateError } = await supabase
          .from('provider_time_slots')
          .update(updateData)
          .eq('id', slot.id);

        if (updateError) {
          console.error('❌ Error fixing slot consistency:', updateError);
        } else {
          fixedCount++;
        }
      }
    }

    console.log(`✅ Validación completada. Inconsistencias encontradas: ${inconsistencies.length}, Corregidas: ${fixedCount}`);
    
    return {
      inconsistencies,
      fixedCount,
      totalSlots: slots?.length || 0
    };

  } catch (error) {
    console.error('❌ Error en validación de consistencia:', error);
    return {
      inconsistencies: [],
      fixedCount: 0,
      totalSlots: 0,
      error
    };
  }
};

/**
 * Quick consistency check without fixing - useful for monitoring
 */
export const checkSlotConsistency = async (
  providerId: string,
  listingId: string,
  dateRange?: { start: Date; end: Date }
) => {
  const startDate = dateRange?.start || new Date();
  const endDate = dateRange?.end || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  
  try {
    const { data: slots } = await supabase
      .from('provider_time_slots')
      .select('id, is_available, recurring_blocked, slot_type, slot_datetime_start')
      .eq('provider_id', providerId)
      .eq('listing_id', listingId)
      .gte('slot_date', format(startDate, 'yyyy-MM-dd'))
      .lte('slot_date', format(endDate, 'yyyy-MM-dd'));

    const { data: appointments } = await supabase
      .from('appointments')
      .select('start_time, end_time, status, recurrence')
      .eq('provider_id', providerId)
      .eq('listing_id', listingId)
      .in('status', ['confirmed'])
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString());

    const potentialIssues = (slots || []).filter(slot => {
      const slotStart = new Date(slot.slot_datetime_start);
      const hasConflict = (appointments || []).some(apt => {
        const aptStart = new Date(apt.start_time);
        const aptEnd = new Date(apt.end_time);
        return slotStart >= aptStart && slotStart < aptEnd;
      });

      // Slot should be blocked if there's a conflict, available if there's not
      return (hasConflict && slot.is_available) || (!hasConflict && !slot.is_available && slot.slot_type !== 'manually_blocked');
    });

    return {
      totalSlots: slots?.length || 0,
      potentialIssues: potentialIssues.length,
      isConsistent: potentialIssues.length === 0
    };

  } catch (error) {
    console.error('Error checking consistency:', error);
    return { totalSlots: 0, potentialIssues: 0, isConsistent: false, error };
  }
};