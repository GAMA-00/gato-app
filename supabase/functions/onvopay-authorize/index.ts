import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const onvopayApiKey = Deno.env.get('ONVOPAY_API_KEY');

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

    console.log('Onvopay Authorization Request:', { appointmentId, amount, payment_type, billing_info: billing_info?.address?.length });

    // Validate Costa Rica specific data
    if (!billing_info?.phone?.includes('506')) {
      throw new Error('Teléfono debe ser de Costa Rica');
    }

    if (!billing_info?.address || billing_info.address.trim().length === 0) {
      throw new Error('Dirección es requerida');
    }

    // Calculate IVA (13% Costa Rica)
    const subtotal = Math.round(amount / 1.13);
    const iva_amount = amount - subtotal;
    const commission_amount = Math.round(amount * 0.05); // 5% commission

    // Get appointment details
    const { data: appointment, error: aptError } = await supabaseAdmin
      .from('appointments')
      .select('*, listings(title), users!client_id(name, email)')
      .eq('id', appointmentId)
      .single();

    if (aptError || !appointment) {
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
        name: billing_info.name || appointment.users?.name,
        email: appointment.users?.email,
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

    // Call Onvopay API
    const onvopayResponse = await fetch('https://api.onvopay.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${onvopayApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(onvopayPayload)
    });

    const onvopayResult = await onvopayResponse.json();

    console.log('Onvopay API Response:', onvopayResult);

    if (!onvopayResponse.ok) {
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

      throw new Error(onvopayResult.message || 'Error en procesamiento de pago');
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
    console.error('Error in onvopay-authorize:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});