import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { appointmentId } = await req.json();

    if (!appointmentId) {
      return new Response(
        JSON.stringify({ error: 'Appointment ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🚫 Starting cancellation of recurring series for appointment: ${appointmentId}`);

    // Get the appointment details
    const { data: appointment, error: appointmentError } = await supabaseClient
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .single();

    if (appointmentError || !appointment) {
      console.error('❌ Error fetching appointment:', appointmentError);
      return new Response(
        JSON.stringify({ error: 'Appointment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Found appointment: ${appointment.id}, recurrence: ${appointment.recurrence}`);

    // Verify this is a recurring appointment
    if (!appointment.recurrence || appointment.recurrence === 'none') {
      return new Response(
        JSON.stringify({ error: 'This is not a recurring appointment' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Cancel all future appointments in this recurring series
    const { data: futureAppointments, error: futureError } = await supabaseClient
      .from('appointments')
      .select('id, start_time')
      .eq('provider_id', appointment.provider_id)
      .eq('client_id', appointment.client_id)
      .eq('listing_id', appointment.listing_id)
      .eq('recurrence', appointment.recurrence)
      .gte('start_time', new Date().toISOString())
      .neq('status', 'cancelled');

    if (futureError) {
      console.error('❌ Error fetching future appointments:', futureError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch future appointments' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📅 Found ${futureAppointments?.length || 0} future appointments to cancel`);

    // Cancel all future appointments
    if (futureAppointments && futureAppointments.length > 0) {
      const appointmentIds = futureAppointments.map(apt => apt.id);
      
      const { error: cancelError } = await supabaseClient
        .from('appointments')
        .update({ 
          status: 'cancelled',
          last_modified_at: new Date().toISOString(),
          last_modified_by: appointment.client_id,
          cancellation_reason: 'Recurring series cancelled by client'
        })
        .in('id', appointmentIds);

      if (cancelError) {
        console.error('❌ Error cancelling appointments:', cancelError);
        return new Response(
          JSON.stringify({ error: 'Failed to cancel appointments' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`✅ Cancelled ${appointmentIds.length} future appointments`);
    }

    // Step 2: Deactivate any recurring rules that match this pattern
    const { error: rulesError } = await supabaseClient
      .from('recurring_rules')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('provider_id', appointment.provider_id)
      .eq('client_id', appointment.client_id)
      .eq('listing_id', appointment.listing_id)
      .eq('is_active', true);

    if (rulesError) {
      console.log('⚠️ Error deactivating recurring rules (may not exist):', rulesError);
    } else {
      console.log('✅ Deactivated recurring rules');
    }

    // Step 3: Delete any recurring appointment instances
    const { error: instancesError } = await supabaseClient
      .from('recurring_appointment_instances')
      .delete()
      .in('recurring_rule_id', [
        // Get rule IDs that match our criteria
      ]);

    if (instancesError) {
      console.log('⚠️ Error deleting recurring instances (may not exist):', instancesError);
    }

    // Step 4: Release time slots for the cancelled appointments
    if (futureAppointments && futureAppointments.length > 0) {
      for (const apt of futureAppointments) {
        // Release the specific slot
        const { error: slotError } = await supabaseClient
          .from('provider_time_slots')
          .update({
            is_available: true,
            is_reserved: false,
            recurring_blocked: false,
            blocked_until: null
          })
          .eq('provider_id', appointment.provider_id)
          .eq('listing_id', appointment.listing_id)
          .eq('slot_datetime_start', apt.start_time);

        if (slotError) {
          console.log(`⚠️ Error releasing slot for ${apt.start_time}:`, slotError);
        }
      }

      // Also release all future recurring blocked slots with the same time pattern
      const appointmentTime = new Date(appointment.start_time);
      const timeOfDay = appointmentTime.toTimeString().split(' ')[0].substring(0, 5); // HH:MM format

      const { error: recurringSlotError } = await supabaseClient
        .from('provider_time_slots')
        .update({
          is_available: true,
          is_reserved: false,
          recurring_blocked: false,
          blocked_until: null
        })
        .eq('provider_id', appointment.provider_id)
        .eq('listing_id', appointment.listing_id)
        .eq('recurring_blocked', true)
        .eq('start_time', timeOfDay)
        .gte('slot_date', new Date().toISOString().split('T')[0]);

      if (recurringSlotError) {
        console.log('⚠️ Error releasing recurring slots:', recurringSlotError);
      } else {
        console.log('✅ Released recurring blocked slots');
      }
    }

    console.log('🎉 Successfully cancelled recurring series');

    // Step 5: DELETE cancelled appointments to prevent regeneration
    if (futureAppointments && futureAppointments.length > 0) {
      const appointmentIds = futureAppointments.map(apt => apt.id);
      
      console.log(`🗑️ Deleting ${appointmentIds.length} cancelled appointments to prevent regeneration`);
      
      const { error: deleteError } = await supabaseClient
        .from('appointments')
        .delete()
        .in('id', appointmentIds)
        .eq('status', 'cancelled');
      
      if (deleteError) {
        console.log('⚠️ Error deleting cancelled appointments (non-critical):', deleteError);
      } else {
        console.log('✅ Deleted cancelled appointments from database');
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        cancelledCount: futureAppointments?.length || 0,
        message: 'Recurring series cancelled successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Error in cancel-recurring-series function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});