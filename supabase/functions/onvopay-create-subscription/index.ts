import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ONVOPAY_API_KEY = Deno.env.get('ONVOPAY_API_KEY');
const ONVOPAY_API_URL = Deno.env.get('ONVOPAY_API_URL') || 'https://api.onvopay.com';

// Mapeo de tipos de recurrencia a intervalos de ONVO Pay
const RECURRENCE_MAP: Record<string, { interval: string; interval_count: number }> = {
  'weekly': { interval: 'week', interval_count: 1 },
  'biweekly': { interval: 'week', interval_count: 2 },
  'triweekly': { interval: 'week', interval_count: 3 },
  'monthly': { interval: 'month', interval_count: 1 }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const {
      appointmentId,
      amount,
      recurrenceType,
      paymentMethodId,
      billing_info
    } = await req.json();

    console.log('📅 Creando suscripción recurrente:', {
      appointmentId,
      amount,
      recurrenceType,
      paymentMethodId
    });

    // Validar tipo de recurrencia
    const recurrenceConfig = RECURRENCE_MAP[recurrenceType];
    if (!recurrenceConfig) {
      throw new Error(`Tipo de recurrencia no soportado: ${recurrenceType}`);
    }

    // Obtener datos del appointment
    const { data: appointment, error: aptError } = await supabaseAdmin
      .from('appointments')
      .select('*, recurring_rules(id)')
      .eq('id', appointmentId)
      .single();

    if (aptError || !appointment) {
      throw new Error('Appointment no encontrado');
    }

    // Crear suscripción en ONVO Pay
    const subscriptionPayload = {
      amount: amount,
      currency: 'USD',
      interval: recurrenceConfig.interval,
      interval_count: recurrenceConfig.interval_count,
      payment_method_id: paymentMethodId,
      billing_details: {
        name: billing_info.name,
        email: billing_info.email,
        phone: billing_info.phone,
        address: billing_info.address
      },
      metadata: {
        appointment_id: appointmentId,
        client_id: appointment.client_id,
        provider_id: appointment.provider_id,
        listing_id: appointment.listing_id,
        recurrence_type: recurrenceType,
        recurring_rule_id: appointment.recurring_rules?.[0]?.id || null
      }
    };

    // ONVO Pay no tiene endpoint de subscripciones nativas
    // Manejamos la recurrencia localmente con cobros programados
    console.log('⚠️ ONVO Pay no soporta suscripciones nativas');
    console.log('💾 Guardando suscripción solo en base de datos local');
    console.log('📅 Los cobros futuros serán procesados automáticamente por process-recurring-charges');

    // Generar ID local para la suscripción
    const localSubscriptionId = `local_sub_${appointmentId}_${Date.now()}`;
    console.log('🆔 ID local generado:', localSubscriptionId);

    // Calcular siguiente fecha de cobro
    const nextChargeDate = new Date();
    if (recurrenceConfig.interval === 'week') {
      nextChargeDate.setDate(nextChargeDate.getDate() + (7 * recurrenceConfig.interval_count));
    } else if (recurrenceConfig.interval === 'month') {
      nextChargeDate.setMonth(nextChargeDate.getMonth() + recurrenceConfig.interval_count);
    }

    // Guardar en tabla onvopay_subscriptions (LOCAL)
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('onvopay_subscriptions')
      .insert({
        onvopay_subscription_id: localSubscriptionId, // ID local, no de ONVO Pay
        recurring_rule_id: appointment.recurring_rules?.[0]?.id || null,
        client_id: appointment.client_id,
        provider_id: appointment.provider_id,
        amount: amount,
        interval_type: recurrenceConfig.interval,
        interval_count: recurrenceConfig.interval_count,
        status: 'active',
        start_date: new Date().toISOString().split('T')[0],
        next_charge_date: nextChargeDate.toISOString().split('T')[0],
        external_reference: appointmentId,
        payment_method_id: paymentMethodId, // CRÍTICO: Guardar para cobros futuros
        original_appointment_template: {
          listing_id: appointment.listing_id,
          residencia_id: appointment.residencia_id,
          client_name: appointment.client_name,
          client_email: appointment.client_email,
          client_phone: appointment.client_phone,
          client_address: appointment.client_address,
          notes: appointment.notes,
          billing_info: billing_info // Guardar billing_info para futuros cobros
        }
      })
      .select()
      .single();

    if (subError) {
      console.error('❌ Error guardando suscripción:', subError);
      throw new Error('Error guardando suscripción en base de datos');
    }

    console.log('✅ Suscripción guardada en BD:', subscription.id);

    // Actualizar appointment con subscription_id
    const { error: updateError } = await supabaseAdmin
      .from('appointments')
      .update({
        onvopay_payment_id: subscription.id // Vincular appointment con subscription
      })
      .eq('id', appointmentId);

    if (updateError) {
      console.error('⚠️ Error actualizando appointment:', updateError);
    }

    return new Response(JSON.stringify({
      success: true,
      subscription_id: localSubscriptionId,
      db_subscription_id: subscription.id,
      next_charge_date: nextChargeDate.toISOString().split('T')[0],
      interval: recurrenceConfig.interval,
      interval_count: recurrenceConfig.interval_count,
      message: 'Suscripción creada exitosamente. Los cobros futuros se procesarán automáticamente.'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Error en onvopay-create-subscription:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Error desconocido'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
