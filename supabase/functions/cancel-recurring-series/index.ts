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

    // Extract the specific time pattern to identify this exact recurring series
    const appointmentTimeOfDay = new Date(appointment.start_time).toTimeString().split(' ')[0].substring(0, 5); // HH:MM format
    console.log(`🕐 Target recurring series time pattern: ${appointmentTimeOfDay}`);

    // Step 1: Cancel all future appointments in this SPECIFIC recurring series (same time pattern)
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

    // Filter appointments to only those with the SAME TIME PATTERN (same recurring series)
    const specificSeriesAppointments = futureAppointments?.filter(apt => {
      const aptTimeOfDay = new Date(apt.start_time).toTimeString().split(' ')[0].substring(0, 5);
      return aptTimeOfDay === appointmentTimeOfDay;
    }) || [];

    console.log(`📅 Found ${futureAppointments?.length || 0} future appointments, ${specificSeriesAppointments.length} match the specific time pattern`);

    // Cancel only the appointments in this SPECIFIC recurring series
    if (specificSeriesAppointments && specificSeriesAppointments.length > 0) {
      const appointmentIds = specificSeriesAppointments.map(apt => apt.id);
      
      console.log(`🎯 Targeting appointments with IDs: ${appointmentIds.join(', ')}`);
      console.log(`🕐 Current time pattern: ${appointmentTimeOfDay}`);
      
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

    // Step 2: Deactivate only recurring rules that match this SPECIFIC time pattern
    const { data: rulesToDeactivate, error: rulesFetchError } = await supabaseClient
      .from('recurring_rules')
      .select('id, start_time')
      .eq('provider_id', appointment.provider_id)
      .eq('client_id', appointment.client_id)
      .eq('listing_id', appointment.listing_id)
      .eq('start_time', appointmentTimeOfDay)
      .eq('is_active', true);

    if (rulesFetchError) {
      console.log('⚠️ Error fetching recurring rules (may not exist):', rulesFetchError);
    }

    const { error: rulesError } = await supabaseClient
      .from('recurring_rules')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('provider_id', appointment.provider_id)
      .eq('client_id', appointment.client_id)
      .eq('listing_id', appointment.listing_id)
      .eq('start_time', appointmentTimeOfDay)
      .eq('is_active', true);

    if (rulesError) {
      console.log('⚠️ Error deactivating recurring rules (may not exist):', rulesError);
    } else {
      console.log(`✅ Deactivated ${rulesToDeactivate?.length || 0} recurring rule(s)`);
    }

    // Step 3: Clean up recurring rules and instances for this SPECIFIC time pattern
    // Fetch matching recurring rules with the same time pattern
    const { data: matchingRules, error: rulesFetchError2 } = await supabaseClient
      .from('recurring_rules')
      .select('id')
      .eq('provider_id', appointment.provider_id)
      .eq('client_id', appointment.client_id)
      .eq('listing_id', appointment.listing_id)
      .eq('start_time', appointmentTimeOfDay);

    if (rulesFetchError2) {
      console.log('⚠️ Error fetching recurring rules for cleanup:', rulesFetchError2);
    }

    const ruleIds = matchingRules?.map(r => r.id) || [];

    if (ruleIds.length > 0) {
      const { error: instancesError } = await supabaseClient
        .from('recurring_appointment_instances')
        .delete()
        .in('recurring_rule_id', ruleIds)
        .gte('start_time', new Date().toISOString());

      if (instancesError) {
        console.log('⚠️ Error deleting recurring instances (may not exist):', instancesError);
      } else {
        console.log(`🧹 Deleted recurring instances for ${ruleIds.length} rule(s)`);
      }
    }

    // Step 3b: Break the recurrence link ONLY on appointments with the SAME TIME PATTERN
    // First, fetch all appointments that match the pattern to see what we're targeting
    const { data: allMatchingAppointments, error: fetchAllError } = await supabaseClient
      .from('appointments')
      .select('id, start_time, recurrence')
      .eq('provider_id', appointment.provider_id)
      .eq('client_id', appointment.client_id)
      .eq('listing_id', appointment.listing_id)
      .neq('recurrence', 'none');

    if (!fetchAllError && allMatchingAppointments) {
      // Filter to only appointments with the same time pattern
      const sameTimePatternAppointments = allMatchingAppointments.filter(apt => {
        if (apt.recurrence === 'none') return false;
        const aptTimeOfDay = new Date(apt.start_time).toTimeString().split(' ')[0].substring(0, 5);
        return aptTimeOfDay === appointmentTimeOfDay;
      });

      console.log(`🔍 Found ${allMatchingAppointments.length} total recurring appointments, ${sameTimePatternAppointments.length} with matching time pattern`);
      
      if (sameTimePatternAppointments.length > 0) {
        const targetIds = sameTimePatternAppointments.map(apt => apt.id);
        console.log(`🎯 Breaking recurrence for appointments: ${targetIds.join(', ')}`);
        
        const { error: breakSeriesError } = await supabaseClient
          .from('appointments')
          .update({
            recurrence: 'none',
            recurring_rule_id: null,
            is_recurring_instance: false,
            recurrence_group_id: null,
            last_modified_at: new Date().toISOString(),
            last_modified_by: appointment.client_id
          })
          .in('id', targetIds);

        if (breakSeriesError) {
          console.log('⚠️ Error breaking recurrence on specific appointments:', breakSeriesError);
        } else {
          console.log(`🔗 Recurrence removed from ${targetIds.length} appointments with matching time pattern`);
        }
      } else {
        console.log('ℹ️ No appointments found with matching time pattern to break recurrence');
      }
    } else {
      console.log('⚠️ Error fetching appointments for pattern matching:', fetchAllError);
    }

    if (breakSeriesError) {
      console.log('⚠️ Error breaking recurrence on appointments:', breakSeriesError);
    } else {
      console.log('🔗 Recurrence removed from all related appointments');
    }

    // Step 4: Release time slots for the cancelled appointments (specific series only)
    if (specificSeriesAppointments && specificSeriesAppointments.length > 0) {
      for (const apt of specificSeriesAppointments) {
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
        .eq('start_time', appointmentTimeOfDay)
        .gte('slot_date', new Date().toISOString().split('T')[0]);

      if (recurringSlotError) {
        console.log('⚠️ Error releasing recurring slots:', recurringSlotError);
      } else {
        console.log('✅ Released recurring blocked slots');
      }
    }

    console.log('🎉 Successfully cancelled recurring series');

    // Step 5: DELETE cancelled appointments to prevent regeneration (specific series only)
    if (specificSeriesAppointments && specificSeriesAppointments.length > 0) {
      const appointmentIds = specificSeriesAppointments.map(apt => apt.id);
      
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

    // Step 6: Final safety unblock for any residual recurring-blocked slots for this SPECIFIC time pattern
    const { error: finalUnblockError } = await supabaseClient
      .from('provider_time_slots')
      .update({
        is_available: true,
        is_reserved: false,
        recurring_blocked: false,
        blocked_until: null
      })
      .eq('provider_id', appointment.provider_id)
      .eq('listing_id', appointment.listing_id)
      .eq('start_time', appointmentTimeOfDay)
      .eq('recurring_blocked', true)
      .gte('slot_date', new Date().toISOString().split('T')[0]);

    if (finalUnblockError) {
      console.log('⚠️ Final unblock slots step had errors (non-critical):', finalUnblockError);
    } else {
      console.log('🔓 Final unblock ensured for any residual slots');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        cancelledCount: specificSeriesAppointments?.length || 0,
        timePattern: appointmentTimeOfDay,
        message: 'Specific recurring series cancelled successfully'
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