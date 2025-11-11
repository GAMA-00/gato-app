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

    console.log(`⏭️ Skipping recurring instance: ${appointmentId}`);

    // Extract real appointment ID if this is a virtual ID (format: virtual-{uuid}-{datetime})
    let realAppointmentId = appointmentId;
    let virtualDateTime: Date | null = null;
    
    if (appointmentId.startsWith('virtual-')) {
      const parts = appointmentId.split('-');
      // virtual-{uuid parts joined with dashes}-{datetime}
      // UUID has 5 parts when split by '-', so we take elements 1-5
      if (parts.length >= 6) {
        realAppointmentId = parts.slice(1, 6).join('-');
        // Extract the datetime from the last part
        const dateTimePart = parts.slice(6).join('-');
        virtualDateTime = new Date(dateTimePart);
        console.log(`📋 Extracted real appointment ID: ${realAppointmentId}, target date: ${virtualDateTime.toISOString()}`);
      }
    }

    // Try to get the appointment details using multiple strategies
    let appointment: any = null;

    // 1) By exact ID (base appointment)
    {
      const { data, error } = await supabaseClient
        .from('appointments')
        .select('*')
        .eq('id', realAppointmentId)
        .single();
      if (!error && data) {
        appointment = data;
        console.log(`📋 Found appointment by id: ${realAppointmentId}`);
      } else {
        console.warn('⚠️ Not found by id, trying recurrence_group_id (base)...');
      }
    }

    // 2) By recurrence_group_id and is_recurring_instance=false (true base)
    if (!appointment) {
      const { data: baseByGroup, error: baseByGroupError } = await supabaseClient
        .from('appointments')
        .select('*')
        .eq('recurrence_group_id', realAppointmentId)
        .eq('is_recurring_instance', false)
        .limit(1)
        .maybeSingle();
      if (!baseByGroupError && baseByGroup) {
        appointment = baseByGroup;
        console.log(`📋 Found base by recurrence_group_id: ${realAppointmentId}`);
      } else {
        console.warn('⚠️ Base not found by group, trying any member in the group...');
      }
    }

    // 3) Any appointment in the group (fallback)
    if (!appointment) {
      const { data: anyInGroup, error: anyInGroupError } = await supabaseClient
        .from('appointments')
        .select('*')
        .eq('recurrence_group_id', realAppointmentId)
        .limit(1)
        .maybeSingle();
      if (!anyInGroupError && anyInGroup) {
        appointment = anyInGroup;
        console.log(`📋 Found a group member for: ${realAppointmentId}`);
      }
    }

    if (!appointment) {
      console.error('❌ Appointment not found after all strategies');
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

    const now = new Date();
    const originalStart = new Date(appointment.start_time);
    const originalEnd = new Date(appointment.end_time);
    const durationMs = originalEnd.getTime() - originalStart.getTime();

    console.log(`📅 Original appointment start: ${originalStart.toISOString()}`);

    // Calculate the next future occurrence (targetStart) to skip
    // If we have a virtual datetime, use that as the target
    let targetStart = virtualDateTime || new Date(originalStart);
    
    // Helper function to add interval based on recurrence type
    const addInterval = (date: Date): Date => {
      const newDate = new Date(date);
      switch (appointment.recurrence) {
        case 'weekly':
          newDate.setDate(newDate.getDate() + 7);
          break;
        case 'biweekly':
          newDate.setDate(newDate.getDate() + 14);
          break;
        case 'triweekly':
          newDate.setDate(newDate.getDate() + 21);
          break;
        case 'monthly':
          newDate.setMonth(newDate.getMonth() + 1);
          break;
      }
      return newDate;
    };

    // If base appointment is in the past and we don't have a virtual datetime, advance to the next future occurrence
    if (!virtualDateTime) {
      while (targetStart <= now) {
        targetStart = addInterval(targetStart);
      }
    }

    console.log(`🎯 Target occurrence to skip: ${targetStart.toISOString()}`);

    // Calculate the following occurrence (the one after the skipped one)
    const followingStart = addInterval(targetStart);
    const followingEnd = new Date(followingStart.getTime() + durationMs);

    console.log(`➡️ Following occurrence (new next): ${followingStart.toISOString()}`);

    // Step 1: Release the specific time slot for the target occurrence
    console.log(`🔓 Releasing slot for ${targetStart.toISOString()}`);
    
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
      .eq('slot_datetime_start', targetStart.toISOString());

    if (slotError) {
      console.log(`⚠️ Error releasing slot (non-critical): ${slotError.message}`);
    } else {
      console.log(`✅ Released slot for ${targetStart.toISOString()}`);
    }

    // Step 2: Create a recurring exception to prevent regeneration of the target date
    console.log(`📝 Creating recurring exception for ${targetStart.toISOString()}`);
    
    const exceptionDate = targetStart.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    const { error: exceptionError } = await supabaseClient
      .from('recurring_exceptions')
      .insert({
        appointment_id: realAppointmentId,
        exception_date: exceptionDate,
        action_type: 'skip',
        notes: 'Instance skipped by client'
      })
      .select()
      .single();

    if (exceptionError) {
      console.log(`⚠️ Error creating recurring exception (may already exist): ${exceptionError}`);
      // Not critical - appointment deletion will still work
    } else {
      console.log(`✅ Created recurring exception for ${exceptionDate}`);
    }

    // Step 3: Mark appointment as 'cancelled' instead of deleting it
    // This preserves the recurring pattern while skipping this specific instance
    console.log(`⏭️ Marking appointment ${appointmentId} as cancelled (skipped)`);
    
    const { error: updateError } = await supabaseClient
      .from('appointments')
      .update({
        status: 'cancelled',
        notes: `${appointment.notes || ''}\n[SKIPPED BY CLIENT]`.trim(),
        last_modified_by: appointment.client_id,
        last_modified_at: new Date().toISOString()
      })
      .eq('id', appointmentId);

    if (updateError) {
      console.error('❌ Error updating appointment to cancelled (skipped):', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to skip appointment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 4: Create the following occurrence (after the skipped one) to maintain the series
    console.log(`🔄 Creating following occurrence for ${appointment.recurrence} appointment`);
    
    const { error: nextAppointmentError } = await supabaseClient
      .from('appointments')
      .insert({
        listing_id: appointment.listing_id,
        client_id: appointment.client_id,
        provider_id: appointment.provider_id,
        residencia_id: appointment.residencia_id,
        start_time: followingStart.toISOString(),
        end_time: followingEnd.toISOString(),
        status: 'confirmed',
        recurrence: appointment.recurrence,
        notes: appointment.notes,
        client_name: appointment.client_name,
        client_phone: appointment.client_phone,
        client_email: appointment.client_email,
        client_address: appointment.client_address,
        external_booking: appointment.external_booking || false,
        is_recurring_instance: true,
        recurrence_group_id: appointment.recurrence_group_id
      });

    if (nextAppointmentError) {
      console.log(`⚠️ Error creating following occurrence (non-critical): ${nextAppointmentError.message}`);
      // Don't fail the skip operation if we can't create the next occurrence
    } else {
      console.log(`✅ Created following ${appointment.recurrence} occurrence for ${followingStart.toISOString()}`);
    }

    console.log('✅ Successfully skipped recurring instance and created next occurrence');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Recurring instance skipped successfully',
        skippedDate: exceptionDate
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Error in skip-recurring-instance function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});