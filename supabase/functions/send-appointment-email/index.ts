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

// Helper to build location string
const buildLocationString = (apt: any, clientData: any): string => {
  // External booking - use client_address
  if (apt.external_booking || apt.is_external) {
    return apt.client_address || 'Ubicación externa';
  }
  
  // Internal booking - build from residencia + condominium + house
  const parts: string[] = [];
  
  if (clientData?.residencias?.name) {
    parts.push(clientData.residencias.name);
  }
  
  const condominium = clientData?.condominium_text || clientData?.condominium_name;
  if (condominium) {
    parts.push(condominium);
  }
  
  if (clientData?.house_number) {
    parts.push(`Casa ${clientData.house_number}`);
  }
  
  return parts.length > 0 ? parts.join(' - ') : 'Ubicación no especificada';
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
        from: 'Gato <tech.gatoapp@outlook.com>',
        to: ['tech.gatoapp@outlook.com'],
        subject: 'Nueva Reserva',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">📅 Nueva reserva creada</h2>
            
            <h3 style="color: #555; margin-top: 30px;">👤 CLIENTE</h3>
            <p><strong>Enviar WhatsApp a:</strong> <a href="https://wa.me/${clientPhoneWhatsApp}" style="color: #25D366;">${clientPhoneDisplay}</a></p>
            <p><strong>Mensaje para cliente:</strong></p>
            <blockquote style="background: #f5f5f5; border-left: 4px solid #ddd; padding: 15px; margin: 10px 0;">
              Hola ${clientName} 👋 Tu cita para el servicio ${serviceName} ha sido registrada con éxito.<br>
              📍Ubicación: ${location}<br>
              📅 Fecha: ${dateLong}<br>
              🕒 Hora: ${time}<br>
              🔁 Recurrencia: ${recurrenceText}<br>
              Te confirmaremos por WhatsApp antes del servicio. Gracias por usar Gato 🐈‍⬛
            </blockquote>
            
            <h3 style="color: #555; margin-top: 30px;">👨‍🔧 PROVEEDOR</h3>
            <p><strong>Enviar WhatsApp a:</strong> <a href="https://wa.me/${providerPhoneWhatsApp}" style="color: #25D366;">${providerPhoneDisplay}</a></p>
            <p><strong>Mensaje para proveedor:</strong></p>
            <blockquote style="background: #f5f5f5; border-left: 4px solid #ddd; padding: 15px; margin: 10px 0;">
              Hola ${providerName} 👋 Tenés una nueva solicitud para el servicio ${serviceName}.<br>
              📍Ubicación: ${location}<br>
              📅 Fecha: ${dateLong}<br>
              🕒 Hora: ${time}<br>
              🔁 Recurrencia: ${recurrenceText}<br>
              Por favor confirmá tu disponibilidad en la app.
            </blockquote>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="color: #888; font-size: 12px;"><em>Este correo es solo informativo. Los mensajes de WhatsApp se enviarán manualmente por el administrador.</em></p>
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
    if (error.appointment_id) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await supabase.from('email_logs').insert({
          appointment_id: error.appointment_id,
          email_type: 'appointment_created',
          recipient: 'tech.gatoapp@outlook.com',
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
