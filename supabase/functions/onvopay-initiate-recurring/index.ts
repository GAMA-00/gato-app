/**
 * OnvoPay Initiate Recurring Payment
 * 
 * Crea una transacción en estado "Iniciada" (pending_authorization) para una cita recurrente.
 * Esta función se invoca automáticamente al crear una cita recurrente o manualmente por el sweeper.
 * 
 * Flow: Appointment Created → Payment Intent "Iniciada" → (on completion) → Confirm/Capture
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InitiateRecurringRequest {
  appointment_id: string;
  force?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { appointment_id, force = false }: InitiateRecurringRequest = await req.json();

    console.log('🎬 [onvopay-initiate-recurring] Starting payment initiation', {
      appointment_id,
      force,
    });

    if (!appointment_id) {
      throw new Error('appointment_id is required');
    }

    // Initialize Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 1. Fetch appointment details
    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from('appointments')
      .select(`
        id,
        client_id,
        provider_id,
        listing_id,
        recurrence,
        recurring_rule_id,
        is_recurring_instance,
        start_time,
        end_time,
        client_name,
        client_email,
        client_phone,
        client_address,
        onvopay_payment_id
      `)
      .eq('id', appointment_id)
      .single();

    if (appointmentError || !appointment) {
      throw new Error(`Appointment not found: ${appointmentError?.message}`);
    }

    console.log('📋 Appointment fetched:', {
      id: appointment.id,
      recurrence: appointment.recurrence,
      recurring_rule_id: appointment.recurring_rule_id,
      is_recurring_instance: appointment.is_recurring_instance,
    });

    // 2. Resolve active subscription (prioritize recurring_rule_id)
    let subscription = null;

    if (appointment.recurring_rule_id) {
      const { data: subByRule } = await supabaseAdmin
        .from('onvopay_subscriptions')
        .select('*')
        .eq('recurring_rule_id', appointment.recurring_rule_id)
        .eq('status', 'active')
        .not('payment_method_id', 'is', null)
        .single();

      subscription = subByRule;
      console.log('🔍 Subscription search by recurring_rule_id:', subscription?.id || 'NOT FOUND');
    }

  // ✅ CAMBIO 6: Buscar por external_reference (appointment_id) primero para evitar ambigüedades
  if (!subscription) {
    console.log('📋 No subscription found by recurring_rule_id, searching by appointment_id (external_reference)');
    const { data: subByAppointment } = await supabaseAdmin
      .from('onvopay_subscriptions')
      .select('*')
      .eq('external_reference', appointment_id)
      .eq('status', 'active')
      .not('payment_method_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    subscription = subByAppointment;
    console.log('🔍 Subscription search by external_reference (appointment_id):', subscription?.id || 'NOT FOUND');
  }

  // Fallback final: search by client_id + provider_id (última opción)
  if (!subscription) {
    console.log('📋 No subscription found by appointment_id, searching by client and provider (last resort)');
    const { data: subByClientProvider } = await supabaseAdmin
      .from('onvopay_subscriptions')
      .select('*')
      .eq('client_id', appointment.client_id)
      .eq('provider_id', appointment.provider_id)
      .eq('status', 'active')
      .not('payment_method_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    subscription = subByClientProvider;
    console.log('🔍 Subscription fallback (client/provider):', subscription?.id || 'NOT FOUND');
  }

  // ✅ CAMBIO 3: Validar si es cobro inicial o futuro
  if (!subscription || !subscription.payment_method_id) {
    const isInitialCharge = !appointment.onvopay_payment_id;
    
    if (isInitialCharge) {
      console.error('❌ No active subscription found for initial charge:', {
        appointment_id,
        hasRecurringRule: !!appointment.recurring_rule_id,
        hasSubscription: !!subscription,
        hasPaymentMethod: !!subscription?.payment_method_id
      });
      throw new Error('No se encontró suscripción activa con método de pago. La suscripción debe crearse antes del cobro inicial.');
    }
    
    // Para cobros futuros programados, skip es aceptable
    console.log('⚠️ No active subscription with payment_method_id found, skipping non-initial charge');
    return new Response(
      JSON.stringify({ 
        success: true, 
        skipped: true, 
        reason: 'No active subscription with payment method (non-initial charge)' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }

    console.log('✅ Active subscription found:', {
      subscription_id: subscription.id,
      payment_method_id: subscription.payment_method_id,
      amount: subscription.amount,
    });

    // 3. Anti-duplication check: existing pending/authorized payment for this appointment
    if (!force) {
      const { data: existingPayment } = await supabaseAdmin
        .from('onvopay_payments')
        .select('id, status, onvopay_payment_id')
        .eq('appointment_id', appointment_id)
        .eq('payment_type', 'recurring_initial')
        .in('status', ['pending_authorization', 'authorized', 'captured'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (existingPayment) {
        console.log('⚠️ Existing payment already initiated:', existingPayment);
        return new Response(
          JSON.stringify({ 
            success: true, 
            skipped: true, 
            existing_payment_id: existingPayment.id,
            onvopay_payment_id: existingPayment.onvopay_payment_id,
            status: existingPayment.status,
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }
    }

    // 4. Build billing_info from subscription's original_appointment_template or appointment data
    const templateData = subscription.original_appointment_template || {};
    const billing_info = {
      name: appointment.client_name || templateData.client_name || 'Cliente',
      email: appointment.client_email || templateData.client_email,
      phone: appointment.client_phone || templateData.client_phone,
      address: appointment.client_address || templateData.client_address,
    };

    console.log('📧 Billing info prepared:', billing_info);

    // 5. Fetch listing to build description
    const { data: listing } = await supabaseAdmin
      .from('listings')
      .select('service_types')
      .eq('id', appointment.listing_id)
      .single();

    const serviceType = listing?.service_types?.[0] || 'Servicio';
    const recurrenceLabel = appointment.recurrence === 'weekly' 
      ? 'Semanal' 
      : appointment.recurrence === 'biweekly' 
      ? 'Quincenal'
      : appointment.recurrence === 'monthly'
      ? 'Mensual'
      : 'Recurrente';
    
    const description = `${serviceType} - ${recurrenceLabel}`;
    console.log('📝 Payment description:', description);

    // 6. Generate idempotency key
    const idempotencyKey = `${subscription.id}_${appointment_id}_init`;
    console.log('🔑 Idempotency key:', idempotencyKey);

    // 7. Invoke onvopay-authorize to create Payment Intent
    const { data: authResponse, error: authError } = await supabaseAdmin.functions.invoke(
      'onvopay-authorize',
      {
        body: {
          appointmentId: appointment_id,
          amount: subscription.amount,
          billing_info,
          payment_type: 'recurring_initial',  // Initial charge for membership
          description,
          idempotency_key: idempotencyKey,
          card_data: {
            payment_method_id: subscription.payment_method_id,
            last4: subscription.card_last4,
            brand: subscription.card_brand,
            exp_month: subscription.card_exp_month,
            exp_year: subscription.card_exp_year
          },
          // ✅ METADATA para mejor visibilidad en OnvoPay dashboard
          metadata: {
            appointment_id,
            subscription_id: subscription.id,
            recurring_rule_id: appointment.recurring_rule_id,
            cycle_n: 0,
            frequency: appointment.recurrence,
            tz: 'America/Costa_Rica',
            created_by: 'gato-app',
            display_name: `${serviceType} - ${recurrenceLabel} - Ciclo Inicial`
          }
        },
      }
    );

    if (authError) {
      console.error('❌ Error calling onvopay-authorize:', authError);
      throw authError;
    }

    console.log('✅ Payment Intent created:', {
      payment_id: authResponse?.payment_id,
      onvopay_payment_id: authResponse?.onvopay_payment_id,
      status: authResponse?.status,
    });

    // ✅ PASO 8: Confirmar y Capturar INMEDIATAMENTE para pagos recurrentes
    console.log('🔄 Confirming and capturing recurring payment immediately...');
    
    const confirmPayload = {
      payment_intent_id: authResponse.onvopay_payment_id,
      card_data: {
        payment_method_id: subscription.payment_method_id,
        last4: subscription.card_last4,
        brand: subscription.card_brand,
        exp_month: subscription.card_exp_month,
        exp_year: subscription.card_exp_year
      }
    };

    const { data: confirmResponse, error: confirmError } = await supabaseAdmin.functions.invoke(
      'onvopay-confirm',
      { body: confirmPayload }
    );

    if (confirmError || !confirmResponse?.success) {
      console.error('❌ onvopay-confirm failed:', confirmError || confirmResponse);
      
      // Si la confirmación falla, marcar el pago como fallido
      await supabaseAdmin
        .from('onvopay_payments')
        .update({ 
          status: 'failed',
          onvopay_response: { error: confirmError || confirmResponse?.error }
        })
        .eq('id', authResponse.payment_id);
      
      throw new Error(confirmResponse?.message || 'Error al confirmar el cobro inicial. No se realizó ningún cargo.');
    }

    console.log('✅ Recurring payment confirmed and captured immediately', {
      paymentId: authResponse.payment_id,
      appointmentId: appointment_id,
      amount: authResponse.amount,
      status: confirmResponse.status,
      capturedAt: confirmResponse.captured_at
    });

    return new Response(
      JSON.stringify({
        success: true,
        initiated: true,
        payment_id: authResponse?.payment_id,
        onvopay_payment_id: authResponse?.onvopay_payment_id,
        status: 'captured',
        captured_at: confirmResponse.captured_at,
        subscription_id: subscription.id,
        appointment_id,
        message: 'Cobro inicial procesado exitosamente. Suscripción activa.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('❌ [onvopay-initiate-recurring] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: error.toString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
