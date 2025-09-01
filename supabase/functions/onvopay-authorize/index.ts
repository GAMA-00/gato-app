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

    // Calculate IVA (13% Costa Rica) with proper precision
    const subtotal = Math.round((amount / 1.13) * 100) / 100;
    const iva_amount = Math.round((amount - subtotal) * 100) / 100;
    const commission_amount = Math.round((amount * 0.05) * 100) / 100;

    console.log('💰 Price breakdown (USD → Centavos para DB):', {
      // Valores en USD (para cálculos)
      original_amount_usd: amount,
      subtotal_usd: subtotal,
      iva_13_percent_usd: iva_amount,
      commission_5_percent_usd: commission_amount,
      total_verification_usd: subtotal + iva_amount,
      // Conversión a centavos (para inserción en DB)
      amount_cents: Math.round(amount * 100),
      subtotal_cents: Math.round(subtotal * 100),
      iva_cents: Math.round(iva_amount * 100),
      commission_cents: Math.round(commission_amount * 100),
      // Verificación de schema constraints
      meets_min_constraint: Math.round(amount * 100) >= 100,
      meets_max_constraint: Math.round(amount * 100) <= 5000000
    });

    // Validation: Ensure calculations are correct
    if (Math.abs((subtotal + iva_amount) - amount) > 0.01) {
      console.error('❌ Price calculation error:', {
        expected: amount,
        calculated: subtotal + iva_amount,
        difference: Math.abs((subtotal + iva_amount) - amount)
      });
      throw new Error('Error en cálculo de precios. Contacta soporte técnico.');
    }

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

    // Type validation before database insertion
    const validatePaymentData = (data) => {
      const requiredFields = ['appointment_id', 'client_id', 'provider_id', 'amount'];
      const missingFields = requiredFields.filter(field => !data[field]);

      if (missingFields.length > 0) {
        throw new Error(`Required payment fields missing: ${missingFields.join(', ')}`);
      }

      // Validate numeric fields
      const numericFields = ['amount', 'subtotal', 'iva_amount', 'commission_amount'];
      numericFields.forEach(field => {
        if (typeof data[field] !== 'number' || isNaN(data[field]) || data[field] < 0) {
          throw new Error(`Invalid numeric value for ${field}: ${data[field]}`);
        }
      });

      return true;
    };

    const paymentData = {
      appointment_id: appointmentId,
      client_id: user.id,
      provider_id: appointment.provider_id,
      amount: Math.round(amount * 100), // ✅ Convert to cents (INTEGER) for DB
      subtotal: Math.round(subtotal * 100), // ✅ Convert to cents (INTEGER) for DB
      iva_amount: Math.round(iva_amount * 100), // ✅ Convert to cents (INTEGER) for DB
      commission_amount: Math.round(commission_amount * 100), // ✅ Convert to cents (INTEGER) for DB
      payment_type: payment_type,
      payment_method: payment_method || 'card',
      billing_info: billing_info,
      card_info: {
        last_four: card_data?.number?.slice(-4) || 'XXXX',
        brand: 'unknown'
      },
      status: 'pending_authorization',
      external_reference: `APT-${appointmentId}-${Date.now()}`,
      created_at: new Date().toISOString()
    };

    console.log('💾 Payment data prepared for insertion (CENTAVOS):', {
      appointment_id: paymentData.appointment_id,
      client_id: paymentData.client_id,
      provider_id: paymentData.provider_id,
      amount_cents: paymentData.amount,
      subtotal_cents: paymentData.subtotal,
      iva_amount_cents: paymentData.iva_amount,
      commission_amount_cents: paymentData.commission_amount,
      payment_type: paymentData.payment_type,
      status: paymentData.status,
      billing_info: '***HIDDEN***',
      card_info: '***HIDDEN***'
    });

    // Use validation before insertion
    validatePaymentData(paymentData);

    // Enhanced error handling for database insertion
    console.log('🔍 Pre-insertion validation:', {
      appointment_exists: !!appointment,
      user_authenticated: !!user.id,
      amounts_valid: amount > 0 && subtotal > 0,
      required_fields_present: !!(appointmentId && payment_type && card_data)
    });

    let payment;
    try {
      const { data: paymentResult, error: paymentError } = await supabaseAdmin
        .from('onvopay_payments')
        .insert(paymentData)
        .select()
        .single();

      if (paymentError) {
        console.error('❌ Database insertion failed:', {
          error_code: paymentError.code,
          error_message: paymentError.message,
          error_details: paymentError.details,
          payment_data_types: Object.keys(paymentData).map(key => ({
            field: key,
            type: typeof paymentData[key],
            value: key.includes('info') ? '***HIDDEN***' : paymentData[key]
          }))
        });
        throw new Error(`Database error: ${paymentError.message} (${paymentError.code})`);
      }

      payment = paymentResult;
      console.log('✅ Payment record created successfully:', {
        payment_id: payment.id,
        status: payment.status,
        amount: payment.amount
      });

    } catch (insertError) {
      console.error('❌ Critical insertion error:', insertError);
      throw insertError;
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

      const successResponse = {
        success: true,
        payment_id: payment.id,
        appointment_id: appointmentId,
        status: updateData.status,
        onvopay_payment_id: onvopayResult.id,
        amount: amount,
        currency: 'USD',
        breakdown: {
          subtotal: subtotal,
          iva: iva_amount,
          commission: commission_amount,
          total: amount
        },
        message: payment_type === 'cash'
          ? 'Pago autorizado (TEST). Se cobrará al completar el servicio.'
          : 'Pago procesado exitosamente (TEST).',
        timestamp: new Date().toISOString()
      };

      console.log('🎉 Sending success response:', successResponse);

      return new Response(JSON.stringify(successResponse), {
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