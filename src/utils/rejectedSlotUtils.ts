import { supabase } from '@/integrations/supabase/client';

export interface RejectedSlotData {
  appointmentId: string;
  providerId: string;
  listingId: string;
  startTime: string;
  endTime: string;
  recurrence?: string;
}

/**
 * Blocks specific time slots when appointments are rejected by providers
 * For individual appointments: blocks only that specific slot
 * For recurring appointments: blocks only the first slot, leaving future slots available
 */
export const blockRejectedSlots = async (rejectedAppointments: RejectedSlotData[]): Promise<void> => {
  if (!rejectedAppointments || rejectedAppointments.length === 0) {
    console.log('No appointments to block slots for');
    return;
  }

  console.log('🚫 Starting slot blocking process for rejected appointments:', rejectedAppointments.length);

  const slotsToBlock: Array<{
    providerId: string;
    listingId: string;
    startTime: string;
    endTime: string;
  }> = [];

  for (const appointment of rejectedAppointments) {
    const isRecurring = appointment.recurrence && 
                       appointment.recurrence !== 'none' && 
                       appointment.recurrence !== 'once';

    if (isRecurring) {
      // For recurring appointments, we only block the first slot
      // The logic here is that we want to block just the specific time that was rejected
      console.log(`🔄 Processing recurring appointment ${appointment.appointmentId} - blocking first slot only`);
      
      slotsToBlock.push({
        providerId: appointment.providerId,
        listingId: appointment.listingId,
        startTime: appointment.startTime,
        endTime: appointment.endTime
      });
    } else {
      // For individual appointments, block the specific slot
      console.log(`📅 Processing individual appointment ${appointment.appointmentId} - blocking specific slot`);
      
      slotsToBlock.push({
        providerId: appointment.providerId,
        listingId: appointment.listingId,
        startTime: appointment.startTime,
        endTime: appointment.endTime
      });
    }
  }

  // Now block all collected slots
  if (slotsToBlock.length === 0) {
    console.log('No slots identified for blocking');
    return;
  }

  console.log(`🔒 Blocking ${slotsToBlock.length} slots...`);

  for (const slot of slotsToBlock) {
    try {
      // Update the specific slot to be unavailable and mark as provider rejected
      const { data, error } = await supabase
        .from('provider_time_slots')
        .update({
          is_available: false,
          slot_type: 'provider_rejected'
        })
        .eq('provider_id', slot.providerId)
        .eq('listing_id', slot.listingId)
        .eq('slot_datetime_start', slot.startTime)
        .eq('slot_datetime_end', slot.endTime)
        .select('id, slot_datetime_start');

      if (error) {
        console.error(`❌ Error blocking slot for provider ${slot.providerId}:`, error);
        continue;
      }

      if (data && data.length > 0) {
        console.log(`✅ Successfully blocked slot ${data[0].id} at ${data[0].slot_datetime_start}`);
      } else {
        console.warn(`⚠️ No matching slot found to block for provider ${slot.providerId} at ${slot.startTime}`);
      }
    } catch (err) {
      console.error(`❌ Exception blocking slot for provider ${slot.providerId}:`, err);
    }
  }

  console.log('🏁 Slot blocking process completed');
};

/**
 * Utility function to extract slot data from appointment objects for blocking
 */
export const extractRejectedSlotData = (appointments: any[]): RejectedSlotData[] => {
  return appointments.map(apt => ({
    appointmentId: apt.id,
    providerId: apt.provider_id,
    listingId: apt.listing_id,
    startTime: apt.start_time,
    endTime: apt.end_time,
    recurrence: apt.recurrence
  }));
};