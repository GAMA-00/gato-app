import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const onvopayApiKey = Deno.env.get('ONVOPAY_API_KEY') || 'test_key_sandbox';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('🚀 === INICIANDO ONVOPAY AUTHORIZE ===');

  try {
    console.log('🔧 Environment check:', {
      hasSupabaseUrl: !!Deno.env.get('SUPABASE_URL'),
      hasServiceKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      onvopayKey: onvopayApiKey.substring(0, 8) + '...'
    });

    // Initialize Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('✅ Supabase client initialized');

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    console.log('🔐 Auth header:', authHeader ? 'present' : 'missing');

    if (!authHeader) {
      throw new Error('Authorization header requerido');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    console.log('👤 User auth result:', {
      hasUser: !!user,
      userId: user?.id,
      authError: authError?.message
    });

    if (authError || !user) {
      throw new Error(`Usuario no autenticado: ${authError?.message}`);
    }

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('📦 Request body received:', {
        hasAppointmentId: !!requestBody.appointmentId,
        hasAmount: !!requestBody.amount,
        hasPaymentType: !!requestBody.payment_type,
        hasCardData: !!requestBody.card_data,
        hasBillingInfo: !!requestBody.billing_info,
        appointmentId: requestBody.appointmentId,
        amount: requestBody.amount,
        paymentType: requestBody.payment_type
      });
    } catch (parseError) {
      console.error('❌ Error parsing request body:', parseError);
      throw new Error('Invalid JSON in request body');
    }

    const {
      appointmentId,
      amount,
      payment_type,
      payment_method,
      card_data,
      billing_info
    } = requestBody;

    // Validate required fields
    const missingFields = [];
    if (!appointmentId) missingFields.push('appointmentId');
    if (!amount) missingFields.push('amount');
    if (!payment_type) missingFields.push('payment_type');
    if (!card_data) missingFields.push('card_data');
    if (!billing_info) missingFields.push('billing_info');

    if (missingFields.length > 0) {
      console.error('❌ Missing required fields:', missingFields);
      throw new Error(`Campos requeridos faltantes: ${missingFields.join(', ')}`);
    }

    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      console.error('❌ Invalid amount:', amount);
      throw new Error(`Monto inválido: ${amount}`);
    }

    // Validate Costa Rica phone (more flexible)
    console.log('📞 Phone validation:', {
      phone: billing_info?.phone,
      hasPhone: !!billing_info?.phone
    });

    const validatePhoneCR = (phone) => {
      if (!phone) return false;
      const cleanPhone = phone.replace(/\D/g, '');
      // Accept if has 506 or if has 8 digits to add 506
      return cleanPhone.includes('506') || cleanPhone.length === 8;
    };

    if (!validatePhoneCR(billing_info?.phone)) {
      console.error('❌ Invalid CR phone:', billing_info?.phone);
      throw new Error('Teléfono debe ser de Costa Rica (+506)');
    }

    if (!billing_info?.address || billing_info.address.trim().length === 0) {
      console.error('❌ Missing address');
      throw new Error('Dirección es requerida');
    }

    console.log('✅ Basic validations passed');

    // Calculate IVA (13% Costa Rica) - Convert to integers (cents)
    const subtotal = Math.round((amount / 1.13) * 100);
    const iva_amount = Math.round((amount - (subtotal / 100)) * 100);
    const commission_amount = Math.round((amount * 0.05) * 100);

    console.log('💰 Price breakdown:', {
      amount,
      subtotal,
      iva_amount,
      commission_amount
    });

    // Get appointment details
    console.log('🔍 Fetching appointment:', appointmentId);

    const { data: appointment, error: aptError } = await supabaseAdmin
      .from('appointments')
      .select('*, listings(title)')
      .eq('id', appointmentId)
      .single();

    console.log('📋 Appointment query result:', {
      found: !!appointment,
      error: aptError?.message,
      appointmentId: appointment?.id,
      listingTitle: appointment?.listings?.title
    });

    if (aptError || !appointment) {
      console.error('❌ Appointment not found:', aptError);
      throw new Error(`Cita no encontrada: ${aptError?.message}`);
    }

    console.log('✅ Appointment found successfully');

    // Create payment record first
    console.log('💾 Creating payment record...');

    const paymentData = {
      appointment_id: appointmentId,
      client_id: user.id,
      provider_id: appointment.provider_id,
      amount: Math.round(amount * 100), // Convert to cents
      subtotal: subtotal,
      iva_amount: iva_amount,
      commission_amount: commission_amount,
      payment_type: payment_type,
      payment_method: payment_method || 'card',
      billing_info: billing_info,
      card_info: {
        last_four: card_data?.number?.slice(-4) || 'XXXX',
        brand: 'unknown'
      },
      status: 'pending_authorization',
      external_reference: `APT-${appointmentId}-${Date.now()}`
    };

    console.log('💳 Payment data prepared:', {
      ...paymentData,
      card_info: '***HIDDEN***'
    });

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('onvopay_payments')
      .insert(paymentData)
      .select()
      .single();

    if (paymentError) {
      console.error('❌ Error creating payment record:', paymentError);
      throw new Error(`Error al crear registro de pago: ${paymentError.message}`);
    }

    console.log('✅ Payment record created:', payment.id);

    // TESTING MODE - Skip actual Onvopay API call
    if (onvopayApiKey === 'test_key_sandbox') {
      console.log('🧪 TESTING MODE: Simulating successful payment');

      const onvopayResult = {
        id: `test_${Date.now()}`,
        status: 'authorized',
        transaction_id: `txn_test_${Date.now()}`,
        card: { brand: 'visa' },
        message: 'Test payment authorized successfully'
      };

      console.log('🎭 Simulated Onvopay response:', onvopayResult);

      // Update payment with simulated response
      const updateData = {
        onvopay_payment_id: onvopayResult.id,
        onvopay_transaction_id: onvopayResult.transaction_id,
        onvopay_response: onvopayResult,
        status: payment_type === 'cash' ? 'authorized' : 'captured',
        authorized_at: new Date().toISOString(),
        card_info: {
          ...paymentData.card_info,
          brand: onvopayResult.card?.brand || 'visa'
        }
      };

      if (payment_type !== 'cash') {
        updateData.captured_at = new Date().toISOString();
      }

      console.log('📝 Updating payment with test data...');

      const { error: updateError } = await supabaseAdmin
        .from('onvopay_payments')
        .update(updateData)
        .eq('id', payment.id);

      if (updateError) {
        console.error('❌ Error updating payment:', updateError);
      } else {
        console.log('✅ Payment updated successfully');
      }

      console.log('🎉 === SUCCESS: TEST PAYMENT COMPLETED ===');

      return new Response(JSON.stringify({
        success: true,
        payment_id: payment.id,
        status: updateData.status,
        onvopay_payment_id: onvopayResult.id,
        amount: amount,
        message: payment_type === 'cash'
          ? 'Pago autorizado (TEST). Se cobrará al completar el servicio.'
          : 'Pago procesado exitosamente (TEST).'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If we reach here, we would call real Onvopay API
    console.log('🚫 Real Onvopay API not implemented yet');
    throw new Error('Onvopay API real no implementada aún. Usar modo testing.');

  } catch (error) {
    console.error('❌ === COMPLETE ERROR DETAILS ===');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    console.error('Error object:', error);

    return new Response(JSON.stringify({
      error: error.message || 'Error interno del servidor',
      success: false,
      timestamp: new Date().toISOString(),
      details: error.stack
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});