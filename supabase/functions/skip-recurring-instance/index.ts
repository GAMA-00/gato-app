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

    // Step 3: Delete the appointment directly (without marking as cancelled first)
    // This prevents triggers from releasing future recurring slots
    console.log(`🗑️ Deleting appointment ${appointmentId}`);
    
    const { error: deleteError } = await supabaseClient
      .from('appointments')
      .delete()
      .eq('id', appointmentId);

    if (deleteError) {
      console.error('❌ Error deleting appointment:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to skip appointment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Successfully skipped recurring instance');

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