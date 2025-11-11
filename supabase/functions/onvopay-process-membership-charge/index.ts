/**
 * OnvoPay Process Membership Charge
 * 
 * Procesa cobros recurrentes programados para suscripciones activas.
 * Invocado por el scheduler process-recurring-charges.
 * 
 * NOTA: OnvoPay no soporta subscripciones automáticas nativas.
 * Este sistema manual es la única opción disponible con OnvoPay.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log('🎯 MEMBERSHIP CHARGE - Function started', {
    requestId,
    timestamp: new Date().toISOString()
  });

  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { subscription_id, appointment_id } = await req.json();

    if (!subscription_id) {
      throw new Error('subscription_id es requerido');
    }

    console.log('💳 [onvopay-process-membership-charge] Processing charge:', {
      subscription_id,
      appointment_id,
      requestId
    });

    // 1. Obtener datos de la suscripción
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('onvopay_subscriptions')
      .select('*')
      .eq('id', subscription_id)
      .single();

    if (subError || !subscription) {
      throw new Error(`Suscripción no encontrada: ${subError?.message}`);
    }

    // Validar estado activo
    if (subscription.status !== 'active') {
      console.log('⚠️ Suscripción no activa:', subscription.status);
      return new Response(JSON.stringify({
        success: false,
        error: 'SUBSCRIPTION_NOT_ACTIVE',
        message: `Suscripción en estado: ${subscription.status}`
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validar payment_method_id
    if (!subscription.payment_method_id) {
      throw new Error('No hay payment_method_id guardado para esta suscripción');
    }

    // Determinar el appointment_id objetivo (instancia real si se proporciona, o fallback)
    const targetAppointmentId = appointment_id || subscription.external_reference;
    
    console.log('🎯 Target appointment ID:', {
      provided_appointment_id: appointment_id,
      subscription_external_reference: subscription.external_reference,
      target_used: targetAppointmentId
    });

    // Verificar que no haya un cobro duplicado en las últimas 24h para ESTA INSTANCIA
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { data: recentPayments } = await supabaseAdmin
      .from('onvopay_payments')
      .select('id')
      .eq('appointment_id', targetAppointmentId)
      .eq('payment_type', 'recurring')
      .gte('created_at', oneDayAgo.toISOString())
      .limit(1);

    if (recentPayments && recentPayments.length > 0) {
      console.log('⚠️ Ya existe un cobro reciente (últimas 24h) para esta instancia, saltando...', {
        target_appointment_id: targetAppointmentId
      });
      return new Response(JSON.stringify({
        success: true,
        skipped: true,
        message: 'Cobro ya procesado en las últimas 24 horas para esta instancia'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('💳 Datos de suscripción obtenidos:', {
      amount: subscription.amount,
      client_id: subscription.client_id,
      provider_id: subscription.provider_id,
      has_payment_method: !!subscription.payment_method_id,
      next_charge_date: subscription.next_charge_date,
      target_appointment_id: targetAppointmentId
    });

    // Obtener datos del appointment REAL para generar descripción y metadata
    const { data: appointmentData } = await supabaseAdmin
      .from('appointments')
      .select(`
        recurrence,
        listings (
          title,
          service_types (
            name
          )
        )
      `)
      .eq('id', targetAppointmentId)
      .single();

    console.log('📊 Appointment data for description:', {
      appointmentData,
      serviceTypeName: appointmentData?.listings?.service_types?.name,
      listingTitle: appointmentData?.listings?.title,
      recurrence: appointmentData?.recurrence
    });

    // Generar descripción en formato correcto: "[Service Type] - [Recurrence]"
    const serviceTypeName = appointmentData?.listings?.service_types?.name || 
                           appointmentData?.listings?.title || 
                           'Servicio';

    const recurrenceMap: Record<string, string> = {
      'weekly': 'Semanal',
      'biweekly': 'Quincenal',
      'triweekly': 'Trisemanal',
      'monthly': 'Mensual'
    };

    const recurrenceText = recurrenceMap[appointmentData?.recurrence || subscription.interval_type] || 
                          recurrenceMap[subscription.interval_type] || 
                          subscription.interval_type;
    const description = `${serviceTypeName} - ${recurrenceText}`;

    console.log('📝 Descripción del cobro:', description);

    // 2. Crear Payment Intent usando onvopay-authorize
    console.log('📡 Paso 1/3: Creando Payment Intent...');
    
    const billing_info = subscription.original_appointment_template?.billing_info || {
      name: subscription.original_appointment_template?.client_name || 'Cliente',
      email: subscription.original_appointment_template?.client_email || '',
      phone: subscription.original_appointment_template?.client_phone || '',
      address: subscription.original_appointment_template?.client_address || ''
    };

    // 🆕 STEP 1: Check for existing pending_authorization payment for this appointment
    let paymentIntentId = null;

    const { data: existingPayment } = await supabaseAdmin
      .from('onvopay_payments')
      .select('id, onvopay_payment_id, status')
      .eq('appointment_id', targetAppointmentId)
      .eq('payment_type', 'recurring')
      .in('status', ['pending_authorization', 'authorized'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingPayment) {
      console.log('✅ Found existing Payment Intent:', {
        payment_id: existingPayment.id,
        onvopay_payment_id: existingPayment.onvopay_payment_id,
        status: existingPayment.status,
      });
      paymentIntentId = existingPayment.onvopay_payment_id;
    } else {
      console.log('🆕 No existing Payment Intent found, creating new one');

      // Generate idempotency key
      const idempotencyKey = `${subscription.id}_${targetAppointmentId}_${new Date().toISOString().split('T')[0]}`;
      console.log('🔑 Idempotency key:', idempotencyKey);

      // 🔧 CRITICAL FIX: Include card_data with payment_method_id when calling onvopay-authorize
      const { data: authResponse, error: authError } = await supabaseAdmin.functions.invoke(
        'onvopay-authorize',
        {
          body: {
            appointmentId: targetAppointmentId,
            amount: subscription.amount,
            billing_info,
            payment_type: 'recurring',
            description: description,
            idempotency_key: idempotencyKey,
            card_data: {
              payment_method_id: subscription.payment_method_id,
            },
          },
        }
      );

      if (authError || !authResponse?.success) {
        console.error('❌ Error creating Payment Intent:', authError);
        throw new Error(`Failed to authorize payment: ${authError?.message || authResponse?.error}`);
      }

      console.log('✅ Payment Intent created:', {
        payment_id: authResponse?.payment_id,
        onvopay_payment_id: authResponse?.payment_intent_id,
      });

      paymentIntentId = authResponse?.payment_intent_id;
      if (!paymentIntentId) {
        throw new Error('No payment_intent_id returned from authorize');
      }
    }

    // 🆕 STEP 2: Confirm the Payment Intent (auto-capture for recurring)
    console.log('📡 Paso 2/3: Confirmando pago con método guardado...');
    
    const { data: confirmResponse, error: confirmError } = await supabaseAdmin.functions.invoke(
      'onvopay-confirm',
      {
        body: {
          payment_intent_id: paymentIntentId,
          card_data: {
            payment_method_id: subscription.payment_method_id
          },
          billing_info
        }
      }
    );

    if (confirmError || !confirmResponse?.success) {
      console.error('❌ Error en onvopay-confirm:', confirmError);
      throw new Error(`Error confirmando pago: ${confirmError?.message || confirmResponse?.error}`);
    }

    console.log('✅ Pago confirmado. Status:', confirmResponse.status);

    // 4. Validar que se capturó INMEDIATAMENTE
    if (confirmResponse.status !== 'captured') {
      console.error('❌ ALERTA: Pago recurrente NO capturado inmediatamente');
      console.error('Status recibido:', confirmResponse.status);
      console.error('Response completo:', JSON.stringify(confirmResponse, null, 2));
      throw new Error(`Pago recurrente no capturado automáticamente. Status: ${confirmResponse.status}`);
    }

    console.log('✅ Validación: Pago recurrente capturado correctamente');

    // 5. Calcular próxima fecha de cobro
    console.log('📡 Paso 3/3: Actualizando suscripción...');
    
    const nextDate = new Date(subscription.next_charge_date);
    
    switch (subscription.interval_type) {
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + (7 * subscription.interval_count));
        break;
      case 'biweekly':
        nextDate.setDate(nextDate.getDate() + (14 * subscription.interval_count));
        break;
      case 'triweekly':
        nextDate.setDate(nextDate.getDate() + (21 * subscription.interval_count));
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + subscription.interval_count);
        break;
      default:
        throw new Error(`Tipo de intervalo no soportado: ${subscription.interval_type}`);
    }

    const today = new Date().toISOString().split('T')[0];
    const nextChargeDateStr = nextDate.toISOString().split('T')[0];

    // 6. Actualizar suscripción
    const { error: updateError } = await supabaseAdmin
      .from('onvopay_subscriptions')
      .update({
        next_charge_date: nextChargeDateStr,
        last_charge_date: today,
        failed_attempts: 0,
        last_failure_reason: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription_id);

    if (updateError) {
      console.error('⚠️ Error actualizando suscripción:', updateError);
      // No lanzar error, el cobro fue exitoso
    }

    console.log('✅ Suscripción actualizada:', {
      subscription_id,
      last_charge_date: today,
      next_charge_date: nextChargeDateStr
    });

    console.log('🎉 Cobro recurrente procesado exitosamente', {
      requestId,
      payment_id: confirmResponse.payment_id,
      amount: subscription.amount,
      duration: `${Date.now() - new Date(confirmResponse.timestamp || Date.now()).getTime()}ms`
    });

    // 🆕 STEP 4: Initiate payment for the NEXT recurring instance
    try {
      console.log('🔍 Looking for next recurring instance to initiate...');
      
      // Get current appointment to find its recurring_rule_id
      const { data: currentAppointment } = await supabaseAdmin
        .from('appointments')
        .select('recurring_rule_id')
        .eq('id', targetAppointmentId)
        .single();

      if (currentAppointment?.recurring_rule_id) {
        const { data: nextInstance } = await supabaseAdmin
          .from('appointments')
          .select('id, start_time')
          .eq('recurring_rule_id', currentAppointment.recurring_rule_id)
          .is('onvopay_payment_id', null)
          .gt('end_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(1)
          .single();

        if (nextInstance) {
          console.log('🎬 Initiating payment for next instance:', nextInstance.id);
          
          const { error: initiateError } = await supabaseAdmin.functions.invoke(
            'onvopay-initiate-recurring',
            {
              body: {
                appointment_id: nextInstance.id,
                force: false,
              },
            }
          );

          if (initiateError) {
            console.error('⚠️ Failed to initiate next payment:', initiateError);
          } else {
            console.log('✅ Next payment initiated successfully for:', nextInstance.id);
          }
        } else {
          console.log('ℹ️ No future instances found to initiate');
        }
      }
    } catch (nextError: any) {
      console.error('⚠️ Error initiating next payment (non-critical):', nextError.message);
      // Non-critical error, don't fail the main response
    }

    return new Response(JSON.stringify({
      success: true,
      payment_id: confirmResponse.payment_id,
      status: 'captured',
      next_charge_date: nextChargeDateStr,
      amount: subscription.amount,
      message: 'Cobro recurrente procesado exitosamente'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ ERROR en membership charge:', {
      requestId,
      error: error.message,
      stack: error.stack
    });

    // Incrementar failed_attempts en la suscripción
    try {
      const { subscription_id } = await req.json();
      
      const { data: currentSub } = await supabaseAdmin
        .from('onvopay_subscriptions')
        .select('failed_attempts, max_retry_attempts')
        .eq('id', subscription_id)
        .single();

      const newFailedAttempts = (currentSub?.failed_attempts || 0) + 1;
      const shouldCancel = newFailedAttempts >= (currentSub?.max_retry_attempts || 3);

      const { error: updateError } = await supabaseAdmin
        .from('onvopay_subscriptions')
        .update({
          failed_attempts: newFailedAttempts,
          last_failure_reason: error.message,
          status: shouldCancel ? 'cancelled' : 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription_id);

      if (updateError) {
        console.error('⚠️ Error actualizando failed_attempts:', updateError);
      } else {
        console.log(`📊 Failed attempts actualizados: ${newFailedAttempts}${shouldCancel ? ' (CANCELADA)' : ''}`);
      }
    } catch (updateErr) {
      console.error('⚠️ Error en actualización de failed_attempts:', updateErr);
    }

    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Error desconocido',
      requestId
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
