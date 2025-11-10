import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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
    const { appointment_id } = await req.json();

    if (!appointment_id) {
      throw new Error('appointment_id is required');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch appointment details with related data
    const { data: apt, error } = await supabase
      .from('appointments')
      .select(
        `
        *,
        client:users!appointments_client_id_fkey(name, email),
        provider:users!appointments_provider_id_fkey(name),
        listing:listings!appointments_listing_id_fkey(
          service_type:service_types!listings_service_type_id_fkey(name)
        )
      `
      )
      .eq('id', appointment_id)
      .single();

    if (error || !apt) {
      console.error('Appointment fetch error:', error);
      throw new Error('Appointment not found');
    }

    // Format date and time in Costa Rica timezone
    const date = new Intl.DateTimeFormat('es-CR', {
      timeZone: 'America/Costa_Rica',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(apt.start_time));

    const time = new Intl.DateTimeFormat('es-CR', {
      timeZone: 'America/Costa_Rica',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(apt.start_time));

    // Send email via Resend
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Gato <noreply@gato-app.com>',
        to: ['garofalovm@gmail.com'],
        subject: `Nueva cita creada – ${apt.listing?.service_type?.name || 'Servicio'}`,
        html: `
          <h2>Nueva cita creada en Gato</h2>
          <p><strong>Cliente:</strong> ${apt.client?.name || 'N/A'}</p>
          <p><strong>Proveedor:</strong> ${apt.provider?.name || 'N/A'}</p>
          <p><strong>Servicio:</strong> ${apt.listing?.service_type?.name || 'N/A'}</p>
          <p><strong>Fecha:</strong> ${date}</p>
          <p><strong>Hora:</strong> ${time}</p>
          <p><strong>ID de cita:</strong> ${apt.id}</p>
        `,
      }),
    });

    if (!emailRes.ok) {
      const errorText = await emailRes.text();
      console.error('Resend API error:', errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    const emailData = await emailRes.json();
    console.log('Email sent successfully:', emailData);

    // Log email in database
    await supabase.from('email_logs').insert({
      appointment_id,
      email_type: 'appointment_created',
      recipient: 'garofalovm@gmail.com',
      status: 'sent',
      sent_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ success: true, emailData }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error('Error in send-appointment-email:', error);
    
    // Try to log failed email attempt
    if (error.appointment_id) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await supabase.from('email_logs').insert({
          appointment_id: error.appointment_id,
          email_type: 'appointment_created',
          recipient: 'garofalovm@gmail.com',
          status: 'failed',
          error_message: error.message,
        });
      } catch (logError) {
        console.error('Failed to log error:', logError);
      }
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});
