import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Obtener API key con fallback para testing
const onvopayApiKey = Deno.env.get('ONVOPAY_API_KEY') || 'test_key_sandbox';

if (!onvopayApiKey || onvopayApiKey === 'test_key_sandbox') {
  console.warn('⚠️ Using test Onvopay API key - payments will be simulated');
}

// Función para validar teléfonos de Costa Rica de forma flexible
const validatePhoneCR = (phone: string): boolean => {
  if (!phone) return false;
  const cleanPhone = phone.replace(/\D/g, '');
  // Aceptar si ya tiene 506 o si tiene 8 dígitos para agregar 506
  return cleanPhone.includes('506') || cleanPhone.length === 8;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Usuario no autenticado');
    }

    const { 
      appointmentId, 
      amount, 
      payment_type, 
      payment_method,
      card_data,
      billing_info 
    } = await req.json();

    // Log detallado de la request para debugging
    console.log('📋 Payment Request Data:', {
      appointmentId: appointmentId || 'missing',
      amount: amount || 'missing',
      payment_type: payment_type || 'missing',
      phone: billing_info?.phone ? 'provided' : 'missing',
      address: billing_info?.address ? 'provided' : 'missing',
      cardData: card_data ? 'provided' : 'missing'
    });

    // Validar que appointmentId existe
    if (!appointmentId) {
      throw new Error('ID de cita es requerido');
    }

    // Validar amount antes de cualquier cálculo
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      throw new Error('Monto inválido para el pago');
    }

    // Validar teléfono de Costa Rica de forma flexible
    if (!validatePhoneCR(billing_info?.phone)) {
      throw new Error('Teléfono debe ser de Costa Rica (+506)');
    }

    // Validar dirección
    if (!billing_info?.address || billing_info.address.trim().length === 0) {
      throw new Error('Dirección es requerida');
    }

    // Calculate IVA (13% Costa Rica) con mejor precisión
    const subtotal = Math.round(amount / 1.13 * 100) / 100;
    const iva_amount = Math.round((amount - subtotal) * 100) / 100;
    const commission_amount = Math.round(amount * 0.05 * 100) / 100;

    // Get appointment details (appointment ya existe)
    const { data: appointment, error: aptError } = await supabaseAdmin
      .from('appointments')
      .select('*, listings(title)')
      .eq('id', appointmentId)
      .single();

    if (aptError || !appointment) {
      console.error('❌ Error fetching appointment:', aptError);
      throw new Error('Cita no encontrada');
    }

    // Create payment record first
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('onvopay_payments')
      .insert({
        appointment_id: appointmentId,
        client_id: user.id,
        provider_id: appointment.provider_id,
        amount: amount,
        subtotal: subtotal,
        iva_amount: iva_amount,
        commission_amount: commission_amount,
        payment_type: payment_type,
        payment_method: payment_method,
        billing_info: billing_info,
        card_info: {
          last_four: card_data.number.slice(-4),
          brand: 'unknown' // We'll update this from Onvopay response
        },
        status: 'pending_authorization',
        external_reference: `APT-${appointmentId}-${Date.now()}`
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating payment record:', paymentError);
      throw new Error('Error al crear registro de pago');
    }

    // Prepare Onvopay API request
    const onvopayPayload = {
      amount: amount,
      currency: 'USD',
      description: `Pago por ${appointment.listings?.title || 'Servicio'}`,
      customer: {
        name: billing_info.name || appointment.client_name,
        email: appointment.client_email,
        phone: billing_info.phone,
        address: billing_info.address
      },
      card: {
        number: card_data.number,
        exp_month: card_data.expiry.split('/')[0],
        exp_year: '20' + card_data.expiry.split('/')[1],
        cvc: card_data.cvv,
        name: card_data.name
      },
      capture: payment_type === 'cash' ? false : true, // Only authorize for cash, capture for subscriptions
      reference: payment.external_reference,
      webhook_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/onvopay-webhook`
    };

    console.log('Calling Onvopay API with payload:', { ...onvopayPayload, card: '***' });

    // Modo testing o llamada real a Onvopay API
    let onvopayResult;
    let onvopayResponse;

    if (onvopayApiKey === 'test_key_sandbox') {
      // Simular respuesta exitosa para testing
      console.log('🧪 TESTING MODE: Simulando respuesta exitosa de Onvopay');
      onvopayResult = {
        id: `test_${Date.now()}`,
        status: 'authorized',
        transaction_id: `txn_test_${Date.now()}`,
        card: { brand: 'visa' },
        message: 'Test payment authorized successfully'
      };
      onvopayResponse = { ok: true };
    } else {
      // Llamada real a Onvopay API
      onvopayResponse = await fetch('https://api.onvopay.com/v1/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${onvopayApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(onvopayPayload)
      });

      onvopayResult = await onvopayResponse.json();
    }

    console.log('Onvopay API Response:', onvopayResult);

    if (!onvopayResponse.ok) {
      console.error('❌ Onvopay API Error:', onvopayResult);
      // Update payment with error
      await supabaseAdmin
        .from('onvopay_payments')
        .update({
          status: 'failed',
          failed_at: new Date().toISOString(),
          error_details: onvopayResult,
          onvopay_response: onvopayResult
        })
        .eq('id', payment.id);

      throw new Error(onvopayResult.message || 'Error en procesamiento de pago con Onvopay');
    }

    // Update payment with Onvopay response
    const updateData: any = {
      onvopay_payment_id: onvopayResult.id,
      onvopay_transaction_id: onvopayResult.transaction_id,
      onvopay_response: onvopayResult,
      card_info: {
        ...payment.card_info,
        brand: onvopayResult.card?.brand || 'unknown'
      }
    };

    // Set status based on Onvopay response
    if (onvopayResult.status === 'succeeded' || onvopayResult.status === 'authorized') {
      updateData.status = payment_type === 'cash' ? 'authorized' : 'captured';
      updateData.authorized_at = new Date().toISOString();
      
      if (payment_type !== 'cash') {
        updateData.captured_at = new Date().toISOString();
      }
    } else {
      updateData.status = 'failed';
      updateData.failed_at = new Date().toISOString();
    }

    const { error: updateError } = await supabaseAdmin
      .from('onvopay_payments')
      .update(updateData)
      .eq('id', payment.id);

    if (updateError) {
      console.error('Error updating payment:', updateError);
    }

    // Create subscription if payment_type is subscription and payment succeeded
    if (payment_type === 'subscription' && (onvopayResult.status === 'succeeded' || onvopayResult.status === 'authorized')) {
      // Get appointment recurrence info
      const recurrenceMap = {
        'weekly': { interval_type: 'weekly', interval_count: 1 },
        'biweekly': { interval_type: 'weekly', interval_count: 2 },
        'monthly': { interval_type: 'monthly', interval_count: 1 }
      };

      const recurringInfo = recurrenceMap[appointment.recurrence] || recurrenceMap['weekly'];

      const { error: subError } = await supabaseAdmin
        .from('onvopay_subscriptions')
        .insert({
          client_id: user.id,
          provider_id: appointment.provider_id,
          recurring_rule_id: appointment.recurring_rule_id,
          amount: amount,
          interval_type: recurringInfo.interval_type,
          interval_count: recurringInfo.interval_count,
          start_date: new Date().toISOString().split('T')[0],
          next_charge_date: new Date(Date.now() + (recurringInfo.interval_type === 'weekly' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
          onvopay_subscription_id: onvopayResult.subscription_id,
          status: 'active',
          inherit_original_data: true,
          original_appointment_template: {
            client_name: appointment.client_name,
            client_email: appointment.client_email,
            client_phone: appointment.client_phone,
            client_address: appointment.client_address,
            notes: appointment.notes,
            listing_id: appointment.listing_id,
            residencia_id: appointment.residencia_id
          }
        });

      if (subError) {
        console.error('Error creating subscription:', subError);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      payment_id: payment.id,
      status: updateData.status,
      onvopay_payment_id: onvopayResult.id,
      amount: amount,
      message: payment_type === 'cash' ? 'Pago autorizado. Se cobrará al completar el servicio.' : 'Pago procesado exitosamente.'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Complete Error Details:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // Devolver error más específico
    return new Response(JSON.stringify({
      error: error.message || 'Error interno del servidor',
      success: false,
      details: Deno.env.get('NODE_ENV') === 'development' ? error.stack : undefined
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});