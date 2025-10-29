import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
  email: string;
  resetUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('🚀 === SEND PASSWORD RESET - Function started ===');
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log('✅ CORS preflight handled');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📦 Parsing request body...');
    const { email, resetUrl }: PasswordResetRequest = await req.json();
    console.log('📧 Request received:', { email, resetUrl });

    if (!email || !resetUrl) {
      console.error('❌ Missing required fields:', { email: !!email, resetUrl: !!resetUrl });
      throw new Error("Email y resetUrl son requeridos");
    }

    console.log('🔍 Checking RESEND_API_KEY...');
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.error('❌ RESEND_API_KEY not found in environment');
      throw new Error("RESEND_API_KEY no configurado");
    }
    console.log('✅ RESEND_API_KEY found:', resendKey.substring(0, 10) + '...');

    console.log('🔍 Verificando usuario en Supabase...');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('name, email')
      .eq('email', email)
      .single();

    if (userError) {
      console.warn('⚠️ User lookup error (continuing anyway):', userError.message);
    }

    const userName = user?.name || 'Usuario';
    console.log('👤 User name resolved:', userName);

    console.log('📧 Preparing to send email via Resend...');
    console.log('📧 From: Loop <onboarding@resend.dev>');
    console.log('📧 To:', email);
    console.log('📧 Subject: Recuperación de contraseña - Loop');

    const emailResponse = await resend.emails.send({
      from: "Loop <no-reply@gato-app.com>",
      to: [email],
      subject: "Recuperación de contraseña - Loop",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Recuperación de contraseña</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif; background-color: #f4f4f5;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    
                    <!-- Header -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 30px; text-align: center;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">🔐 Loop</h1>
                      </td>
                    </tr>
                    
                    <!-- Body -->
                    <tr>
                      <td style="padding: 40px;">
                        <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 24px; font-weight: 600;">
                          Hola ${userName},
                        </h2>
                        
                        <p style="margin: 0 0 20px; color: #4a5568; font-size: 16px; line-height: 1.6;">
                          Recibimos una solicitud para restablecer la contraseña de tu cuenta en Loop.
                        </p>
                        
                        <p style="margin: 0 0 30px; color: #4a5568; font-size: 16px; line-height: 1.6;">
                          Haz clic en el botón de abajo para crear una nueva contraseña:
                        </p>
                        
                        <!-- Button -->
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center" style="padding: 0 0 30px;">
                              <a href="${resetUrl}" 
                                 style="display: inline-block; 
                                        padding: 16px 40px; 
                                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                        color: #ffffff; 
                                        text-decoration: none; 
                                        border-radius: 6px; 
                                        font-weight: 600; 
                                        font-size: 16px;
                                        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
                                Restablecer contraseña
                              </a>
                            </td>
                          </tr>
                        </table>
                        
                        <p style="margin: 0 0 15px; color: #718096; font-size: 14px; line-height: 1.6;">
                          O copia y pega este enlace en tu navegador:
                        </p>
                        
                        <p style="margin: 0 0 30px; padding: 12px; background-color: #f7fafc; border-radius: 4px; word-break: break-all;">
                          <a href="${resetUrl}" style="color: #667eea; text-decoration: none; font-size: 14px;">
                            ${resetUrl}
                          </a>
                        </p>
                        
                        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px;">
                          <p style="margin: 0 0 10px; color: #a0aec0; font-size: 13px; line-height: 1.6;">
                            ⏰ Este enlace expirará en 1 hora por seguridad.
                          </p>
                          
                          <p style="margin: 0; color: #a0aec0; font-size: 13px; line-height: 1.6;">
                            Si no solicitaste restablecer tu contraseña, puedes ignorar este correo de forma segura.
                          </p>
                        </div>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #f7fafc; padding: 30px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="margin: 0 0 10px; color: #718096; font-size: 14px;">
                          Loop - Tu plataforma de servicios
                        </p>
                        <p style="margin: 0; color: #a0aec0; font-size: 12px;">
                          © ${new Date().getFullYear()} Loop. Todos los derechos reservados.
                        </p>
                      </td>
                    </tr>
                    
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    console.log("✅ Resend API call completed");
    console.log("📬 Email Response:", JSON.stringify(emailResponse, null, 2));
    
    if (emailResponse.error) {
      console.error("❌ Resend returned an error:", emailResponse.error);
      throw new Error(`Resend error: ${JSON.stringify(emailResponse.error)}`);
    }

    console.log("🎉 Email enviado exitosamente!");
    console.log("📧 Email ID:", emailResponse.data?.id);

    return new Response(JSON.stringify({ 
      success: true,
      message: "Email de recuperación enviado exitosamente",
      emailId: emailResponse.data?.id
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("❌ === ERROR EN SEND PASSWORD RESET ===");
    console.error("❌ Error name:", error.name);
    console.error("❌ Error message:", error.message);
    console.error("❌ Error stack:", error.stack);
    console.error("❌ Full error:", JSON.stringify(error, null, 2));
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || "Error enviando email",
        details: error.stack
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);
