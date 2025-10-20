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

    // Step 1: Identify the specific recurring rule to target
    let targetRuleId = appointment.recurring_rule_id;
    console.log(`🔍 Looking for recurring rule. Direct rule ID: ${targetRuleId}`);

    // If no direct rule ID, find the rule by matching criteria
    if (!targetRuleId) {
      const appointmentStartTime = new Date(appointment.start_time);
      
      if (isNaN(appointmentStartTime.getTime())) {
        console.error(`❌ Invalid start_time format: ${appointment.start_time}`);
        return new Response(
          JSON.stringify({ error: 'Invalid appointment start time' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const costaRicaDate = new Date(appointmentStartTime.toLocaleString("en-US", {timeZone: "America/Costa_Rica"}));
      const dayOfWeek = costaRicaDate.getDay(); // Sunday = 0, Monday = 1, etc.
      const dayOfMonth = costaRicaDate.getDate();
      const timeOfDay = appointmentStartTime.toTimeString().split(' ')[0].substring(0, 5); // HH:MM
      
      console.log(`🕐 Searching for rule with time: ${timeOfDay}, day of week: ${dayOfWeek}, day of month: ${dayOfMonth}`);

      const { data: matchingRules, error: ruleError } = await supabaseClient
        .from('recurring_rules')
        .select('id, day_of_week, day_of_month, recurrence_type')
        .eq('provider_id', appointment.provider_id)
        .eq('client_id', appointment.client_id)
        .eq('listing_id', appointment.listing_id)
        .eq('recurrence_type', appointment.recurrence)
        .eq('start_time', timeOfDay)
        .eq('is_active', true);

      if (ruleError) {
        console.error('❌ Error finding recurring rule:', ruleError);
        return new Response(
          JSON.stringify({ error: 'Failed to find recurring rule' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Filter by day criteria based on recurrence type
      const filteredRules = matchingRules?.filter(rule => {
        if (appointment.recurrence === 'weekly' || appointment.recurrence === 'biweekly') {
          return rule.day_of_week === dayOfWeek;
        } else if (appointment.recurrence === 'monthly') {
          return rule.day_of_month === dayOfMonth;
        }
        return true;
      }) || [];

      if (filteredRules.length === 0) {
        console.log('⚠️ No matching recurring rule found, will use appointment-based cancellation');
      } else {
        targetRuleId = filteredRules[0].id;
        console.log(`📋 Found matching rule: ${targetRuleId}`);
      }
    }

    // Step 2: Cancel future appointments belonging to this specific rule
    let futureAppointments: any[] = [];
    if (targetRuleId) {
      // Cancel by rule ID (most precise)
      const { data: ruleAppointments, error: futureError } = await supabaseClient
        .from('appointments')
        .select('id, start_time')
        .eq('recurring_rule_id', targetRuleId)
        .gte('start_time', new Date().toISOString())
        .neq('status', 'cancelled');

      if (futureError) {
        console.error('❌ Error fetching appointments by rule ID:', futureError);
      } else {
        futureAppointments = ruleAppointments || [];
        console.log(`📅 Found ${futureAppointments.length} future appointments for rule ${targetRuleId}`);
      }
    }

    // Fallback: if no rule ID or no appointments found via rule ID
    if (futureAppointments.length === 0) {
      console.log('🔄 Falling back to pattern-based appointment search');
      
      const appointmentStartTime = new Date(appointment.start_time);
      
      if (isNaN(appointmentStartTime.getTime())) {
        console.error(`❌ Invalid start_time format in fallback: ${appointment.start_time}`);
        return new Response(
          JSON.stringify({ error: 'Invalid appointment start time' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const costaRicaDate = new Date(appointmentStartTime.toLocaleString("en-US", {timeZone: "America/Costa_Rica"}));
      const dayOfWeek = costaRicaDate.getDay();
      const timeOfDay = appointmentStartTime.toTimeString().split(' ')[0].substring(0, 5);
      
      const { data: patternAppointments, error: patternError } = await supabaseClient
        .from('appointments')
        .select('id, start_time')
        .eq('provider_id', appointment.provider_id)
        .eq('client_id', appointment.client_id)
        .eq('listing_id', appointment.listing_id)
        .eq('recurrence', appointment.recurrence)
        .gte('start_time', new Date().toISOString())
        .neq('status', 'cancelled');

      if (patternError) {
        console.error('❌ Error fetching appointments by pattern:', patternError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch appointments' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Filter by exact time and day pattern
      futureAppointments = patternAppointments?.filter(apt => {
        const aptStartTime = new Date(apt.start_time);
        if (isNaN(aptStartTime.getTime())) {
          console.warn(`⚠️ Skipping appointment ${apt.id} with invalid start_time`);
          return false;
        }
        const aptCostaRicaDate = new Date(aptStartTime.toLocaleString("en-US", {timeZone: "America/Costa_Rica"}));
        const aptTimeOfDay = aptStartTime.toTimeString().split(' ')[0].substring(0, 5);
        const aptDayOfWeek = aptCostaRicaDate.getDay();
        
        return aptTimeOfDay === timeOfDay && aptDayOfWeek === dayOfWeek;
      }) || [];

      console.log(`📅 Pattern search found ${futureAppointments.length} matching appointments`);
    }

    // Cancel the found appointments
    if (futureAppointments && futureAppointments.length > 0) {
      const appointmentIds = futureAppointments.map(apt => apt.id);
      
      console.log(`🎯 Cancelling appointments with IDs: ${appointmentIds.join(', ')}`);
      
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

    // Step 3: Deactivate the specific recurring rule
    if (targetRuleId) {
      const { error: rulesError } = await supabaseClient
        .from('recurring_rules')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', targetRuleId);

      if (rulesError) {
        console.log('⚠️ Error deactivating recurring rule:', rulesError);
      } else {
        console.log(`✅ Deactivated recurring rule: ${targetRuleId}`);
      }
    }

    // Step 4: Clean up recurring instances for this specific rule
    if (targetRuleId) {
      const { error: instancesError } = await supabaseClient
        .from('recurring_appointment_instances')
        .delete()
        .in('recurring_rule_id', [targetRuleId])
        .gte('start_time', new Date().toISOString());

      if (instancesError) {
        console.log('⚠️ Error deleting recurring instances:', instancesError);
      } else {
        console.log(`🧹 Deleted recurring instances for rule ${targetRuleId}`);
      }
    }

    // Step 5: Break the recurrence link on appointments from this specific rule
    if (targetRuleId) {
      // Break recurrence by rule ID (most precise)
      const { error: breakRuleError } = await supabaseClient
        .from('appointments')
        .update({
          recurrence: 'none',
          recurring_rule_id: null,
          is_recurring_instance: false,
          recurrence_group_id: null,
          last_modified_at: new Date().toISOString(),
          last_modified_by: appointment.client_id
        })
        .eq('recurring_rule_id', targetRuleId);

      if (breakRuleError) {
        console.log('⚠️ Error breaking recurrence by rule ID:', breakRuleError);
      } else {
        console.log(`🔗 Recurrence removed from all appointments with rule ID ${targetRuleId}`);
      }
    } else {
      // Fallback: break recurrence by pattern matching
      const appointmentStartTime = new Date(appointment.start_time);
      
      if (isNaN(appointmentStartTime.getTime())) {
        console.error(`❌ Invalid start_time format in pattern matching: ${appointment.start_time}`);
        // Continue with the rest of the cleanup even if we can't match by pattern
        return new Response(
          JSON.stringify({ 
            success: true, 
            cancelledCount: futureAppointments?.length || 0,
            message: 'Partial cancellation completed (pattern matching failed)'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const costaRicaDate = new Date(appointmentStartTime.toLocaleString("en-US", {timeZone: "America/Costa_Rica"}));
      const dayOfWeek = costaRicaDate.getDay();
      const timeOfDay = appointmentStartTime.toTimeString().split(' ')[0].substring(0, 5);
      
      const { data: patternAppointments, error: patternFetchError } = await supabaseClient
        .from('appointments')
        .select('id, start_time')
        .eq('provider_id', appointment.provider_id)
        .eq('client_id', appointment.client_id)
        .eq('listing_id', appointment.listing_id)
        .eq('recurrence', appointment.recurrence)
        .neq('recurrence', 'none');

      if (!patternFetchError && patternAppointments) {
        const matchingAppointments = patternAppointments.filter(apt => {
          const aptStartTime = new Date(apt.start_time);
          if (isNaN(aptStartTime.getTime())) {
            console.warn(`⚠️ Skipping appointment ${apt.id} with invalid start_time in pattern break`);
            return false;
          }
          const aptCostaRicaDate = new Date(aptStartTime.toLocaleString("en-US", {timeZone: "America/Costa_Rica"}));
          const aptTimeOfDay = aptStartTime.toTimeString().split(' ')[0].substring(0, 5);
          const aptDayOfWeek = aptCostaRicaDate.getDay();
          
          return aptTimeOfDay === timeOfDay && aptDayOfWeek === dayOfWeek;
        });

        if (matchingAppointments.length > 0) {
          const targetIds = matchingAppointments.map(apt => apt.id);
          console.log(`🎯 Breaking recurrence for pattern-matched appointments: ${targetIds.join(', ')}`);
          
          const { error: breakPatternError } = await supabaseClient
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

          if (breakPatternError) {
            console.log('⚠️ Error breaking recurrence by pattern:', breakPatternError);
          } else {
            console.log(`🔗 Recurrence removed from ${targetIds.length} pattern-matched appointments`);
          }
        }
      }
    }

    // Step 6: Release time slots for the cancelled appointments
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
    }

    // Release all future recurring blocked slots for this specific rule
    if (targetRuleId) {
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
        .eq('recurring_rule_id', targetRuleId)
        .gte('slot_date', new Date().toISOString().split('T')[0]);

      if (recurringSlotError) {
        console.log('⚠️ Error releasing recurring slots by rule ID:', recurringSlotError);
      } else {
        console.log('✅ Released recurring blocked slots for rule');
      }
    }

    console.log('🎉 Successfully cancelled recurring series');

    // Step 7: DELETE cancelled appointments to prevent regeneration
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
        ruleId: targetRuleId,
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