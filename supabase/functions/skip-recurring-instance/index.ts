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

    // Verify this is a recurring appointment and it's in the future
    if (!appointment.recurrence || appointment.recurrence === 'none') {
      return new Response(
        JSON.stringify({ error: 'This is not a recurring appointment' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();
    const appointmentTime = new Date(appointment.start_time);
    if (appointmentTime <= now) {
      return new Response(
        JSON.stringify({ error: 'Cannot skip past appointments' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Release the specific time slot for this appointment
    console.log(`🔓 Releasing slot for ${appointment.start_time}`);
    
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
      .eq('slot_datetime_start', appointment.start_time);

    if (slotError) {
      console.log(`⚠️ Error releasing slot (non-critical): ${slotError}`);
    } else {
      console.log(`✅ Released slot for ${appointment.start_time}`);
    }

    // Step 2: Create a recurring exception to prevent regeneration of this specific date
    console.log(`📝 Creating recurring exception for ${appointment.start_time}`);
    
    const exceptionDate = new Date(appointment.start_time).toISOString().split('T')[0]; // YYYY-MM-DD format
    
    const { error: exceptionError } = await supabaseClient
      .from('recurring_exceptions')
      .insert({
        appointment_id: appointmentId,
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

    // Step 4: Create next recurring occurrence to maintain the series
    if (appointment.recurrence && appointment.recurrence !== 'none') {
      console.log(`🔄 Creating next occurrence for ${appointment.recurrence} appointment`);
      
      const originalStart = new Date(appointment.start_time);
      const originalEnd = new Date(appointment.end_time);
      let nextStart = new Date(originalStart);
      let nextEnd = new Date(originalEnd);

      // Calculate next occurrence based on recurrence pattern
      switch (appointment.recurrence) {
        case 'weekly':
          nextStart.setDate(nextStart.getDate() + 7);
          nextEnd.setDate(nextEnd.getDate() + 7);
          break;
        case 'biweekly':
          nextStart.setDate(nextStart.getDate() + 14);
          nextEnd.setDate(nextEnd.getDate() + 14);
          break;
        case 'triweekly':
          nextStart.setDate(nextStart.getDate() + 21);
          nextEnd.setDate(nextEnd.getDate() + 21);
          break;
        case 'monthly':
          nextStart.setMonth(nextStart.getMonth() + 1);
          nextEnd.setMonth(nextEnd.getMonth() + 1);
          break;
      }

      // Create the next appointment in the series
      const { error: nextAppointmentError } = await supabaseClient
        .from('appointments')
        .insert({
          listing_id: appointment.listing_id,
          client_id: appointment.client_id,
          provider_id: appointment.provider_id,
          residencia_id: appointment.residencia_id,
          start_time: nextStart.toISOString(),
          end_time: nextEnd.toISOString(),
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
        console.log(`⚠️ Error creating next occurrence (non-critical): ${nextAppointmentError.message}`);
        // Don't fail the skip operation if we can't create the next occurrence
      } else {
        console.log(`✅ Created next ${appointment.recurrence} occurrence for ${nextStart.toISOString()}`);
      }
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