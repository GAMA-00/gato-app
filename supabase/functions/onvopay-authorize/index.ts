import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🚀 ONVOPAY MINIMAL - Function started');

  try {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      console.log('✅ CORS preflight handled');
      return new Response(null, { headers: corsHeaders });
    }

    console.log('📦 Parsing request body...');
    const body = await req.json();

    console.log('📋 Request data received:', {
      hasAppointmentId: !!body.appointmentId,
      hasAmount: !!body.amount,
      hasPaymentType: !!body.payment_type,
      appointmentId: body.appointmentId
    });

    // Simulate successful payment processing
    const mockResponse = {
      success: true,
      payment_id: `mock_payment_${Date.now()}`,
      appointment_id: body.appointmentId,
      status: body.payment_type === 'cash' ? 'authorized' : 'captured',
      onvopay_payment_id: `mock_onvo_${Date.now()}`,
      amount: body.amount,
      currency: 'USD',
      message: body.payment_type === 'cash'
        ? 'Pago autorizado (MOCK). Se cobrará al completar el servicio.'
        : 'Pago procesado exitosamente (MOCK).',
      timestamp: new Date().toISOString()
    };

    console.log('✅ Returning mock success response');

    return new Response(JSON.stringify(mockResponse), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Function error:', {
      message: error.message,
      name: error.name,
      stack: error.stack?.substring(0, 300)
    });

    return new Response(JSON.stringify({
      error: error.message || 'Function error',
      success: false,
      timestamp: new Date().toISOString(),
      debug: {
        error_type: error.name,
        has_stack: !!error.stack
      }
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});