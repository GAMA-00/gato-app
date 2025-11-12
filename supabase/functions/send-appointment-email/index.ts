import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to format phone for display (removes +506 prefix)
const formatPhoneForDisplay = (phone: string | null | undefined): string => {
  if (!phone) return '';
  if (phone.startsWith('+506')) return phone.slice(4);
  if (/^\d{8}$/.test(phone)) return phone;
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 8) return digits.slice(-8);
  return phone;
};

// Helper to build location string for email (simplified format)
const buildLocationString = (apt: any, clientData: any): string => {
  // External booking - use client_address only
  if (apt.external_booking || apt.is_external) {
    return apt.client_address || 'Ubicación externa';
  }
  
  // Internal booking - build as "Condominium, Casa X" (no residencia in email)
  const condominium = clientData?.condominium_text || clientData?.condominium_name || '—';
  const houseNumber = clientData?.house_number || '—';
  
  return `${condominium}, Casa ${houseNumber}`;
};

// Map recurrence to Spanish
const recurrenceMap: Record<string, string> = {
  'none': 'Sin recurrencia',
  'weekly': 'Semanal',
  'biweekly': 'Quincenal',
  'monthly': 'Mensual',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let appointmentIdForLog: string | null = null;
  try {
    const { appointment_id } = await req.json();
    appointmentIdForLog = appointment_id;
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
        client:users!appointments_client_id_fkey(
          name, 
          email, 
          phone,
          residencia_id,
          condominium_name,
          condominium_text,
          house_number,
          residencias(name, address)
        ),
        provider:users!appointments_provider_id_fkey(name, phone),
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
    const dateLong = new Intl.DateTimeFormat('es-CR', {
      timeZone: 'America/Costa_Rica',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(apt.start_time));

    const time = new Intl.DateTimeFormat('es-CR', {
      timeZone: 'America/Costa_Rica',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(apt.start_time));

    // Extract data
    const clientName = apt.client?.name || apt.client_name || 'Cliente';
    const clientPhone = apt.client?.phone || apt.client_phone || '';
    const clientPhoneDisplay = formatPhoneForDisplay(clientPhone);
    const clientPhoneWhatsApp = clientPhone; // Already in +506XXXXXXXX format
    
    const providerName = apt.provider?.name || 'Proveedor';
    const providerPhone = apt.provider?.phone || '';
    const providerPhoneDisplay = formatPhoneForDisplay(providerPhone);
    const providerPhoneWhatsApp = providerPhone;
    
    const serviceName = apt.listing?.service_type?.name || 'Servicio';
    const recurrenceText = recurrenceMap[apt.recurrence || 'none'] || 'Sin recurrencia';
    
    // Build location using client data
    const location = buildLocationString(apt, apt.client);

    // Send email via Resend
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Gato <onboarding@resend.dev>',
        to: ['tech.gatoapp@outlook.com'],
        subject: 'Nueva Reserva',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; color: #111;">
          📅 Nueva reserva creada<br><br>

          👤 CLIENTE<br>
          Enviar WhatsApp a: <a href="https://wa.me/${clientPhoneWhatsApp}" style="color:#25D366;text-decoration:none;">${clientPhoneDisplay}</a><br>
          Mensaje para cliente:<br>
          Hola ${clientName} 👋 Tu cita para el servicio ${serviceName} ha sido registrada con éxito.<br>
          📍Ubicación: ${location}<br>
          📅 Fecha: ${dateLong}<br>
          🕒 Hora: ${time}<br>
          🔁 Recurrencia: ${recurrenceText}<br>
          Te confirmaremos por WhatsApp antes del servicio. Gracias por usar Gato 🐈‍⬛<br><br>

          👨‍🔧 PROVEEDOR<br>
          Enviar WhatsApp a: <a href="https://wa.me/${providerPhoneWhatsApp}" style="color:#25D366;text-decoration:none;">${providerPhoneDisplay}</a><br>
          Mensaje para proveedor:<br>
          Hola ${providerName} 👋 Tenés una nueva solicitud para el servicio ${serviceName}.<br>
          📍Ubicación: ${location}<br>
          📅 Fecha: ${dateLong}<br>
          🕒 Hora: ${time}<br>
          🔁 Recurrencia: ${recurrenceText}<br>
          Por favor confirmá tu disponibilidad en la app.<br><br>

          ────────────────────────────<br>
          Este correo es solo informativo. Los mensajes de WhatsApp se enviarán manualmente por el administrador.
          </div>
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
      recipient: 'tech.gatoapp@outlook.com',
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
    try {
      if (appointmentIdForLog) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await supabase.from('email_logs').insert({
          appointment_id: appointmentIdForLog,
          email_type: 'appointment_created',
          recipient: 'tech.gatoapp@outlook.com',
          status: 'failed',
          error_message: error?.message || String(error),
        });
      }
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(
      JSON.stringify({ error: error?.message || 'Internal Server Error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});
