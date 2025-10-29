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

    // Generar enlace de recuperación real con tokens usando el Admin API
    console.log('🔗 Generando enlace de recuperación con Supabase Admin...');
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: resetUrl }
    });
    if (linkError) {
      console.error('❌ Error generando enlace de recuperación:', linkError.message);
      throw new Error(`No se pudo generar el enlace de recuperación: ${linkError.message}`);
    }
    const recoveryLink = (linkData as any)?.properties?.action_link || (linkData as any)?.action_link;
    console.log('🔗 Recovery link generado:', recoveryLink);

    console.log('📧 Preparing to send email via Resend...');
    console.log('📧 From: Gato <no-reply@gato-app.com>');
    console.log('📧 To:', email);
    console.log('📧 Subject: Recuperación de contraseña - Gato');

    const emailResponse = await resend.emails.send({
      from: "Gato <no-reply@gato-app.com>",
      to: [email],
      subject: "Recuperación de contraseña - Gato",
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
                      <td style="background: linear-gradient(135deg, #FF6B6B 0%, #FFE66D 100%); padding: 50px 40px; text-align: center; position: relative;">
                        <div style="font-size: 64px; margin-bottom: 10px;">🐱</div>
                        <h1 style="margin: 0; color: #2D3748; font-size: 32px; font-weight: 800; text-shadow: 2px 2px 4px rgba(0,0,0,0.1);">Gato</h1>
                        <p style="margin: 8px 0 0; color: #4A5568; font-size: 14px; font-weight: 500;">Tu plataforma de confianza</p>
                      </td>
                    </tr>
                    
                    <!-- Body -->
                    <tr>
                      <td style="padding: 40px;">
                        <div style="text-align: center; margin-bottom: 30px;">
                          <div style="font-size: 48px; margin-bottom: 15px;">🔐</div>
                          <h2 style="margin: 0 0 10px; color: #2D3748; font-size: 28px; font-weight: 700;">
                            ¡Hola ${userName}!
                          </h2>
                        </div>
                        
                        <p style="margin: 0 0 20px; color: #4A5568; font-size: 17px; line-height: 1.7; text-align: center;">
                          Recibimos una solicitud para restablecer tu contraseña 🐾
                        </p>
                        
                        <p style="margin: 0 0 35px; color: #718096; font-size: 15px; line-height: 1.6; text-align: center;">
                          Haz clic en el botón para crear una nueva contraseña segura:
                        </p>
                        
                        <!-- Button -->
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center" style="padding: 0 0 30px;">
                              <a href="${recoveryLink}" 
                                 style="display: inline-block; 
                                        padding: 18px 48px; 
                                        background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%);
                                        color: #ffffff; 
                                        text-decoration: none; 
                                        border-radius: 50px; 
                                        font-weight: 700; 
                                        font-size: 17px;
                                        box-shadow: 0 6px 20px rgba(255, 107, 107, 0.4);
                                        transition: transform 0.2s;">
                                🐱 Restablecer contraseña
                              </a>
                            </td>
                          </tr>
                        </table>
                        
                        <p style="margin: 0 0 15px; color: #718096; font-size: 14px; line-height: 1.6;">
                          O copia y pega este enlace en tu navegador:
                        </p>
                        
                        <p style="margin: 0 0 30px; padding: 12px; background-color: #f7fafc; border-radius: 4px; word-break: break-all;">
                          <a href="${recoveryLink}" style="color: #667eea; text-decoration: none; font-size: 14px;">
                            ${recoveryLink}
                          </a>
                        </p>
                        
                        <div style="background: linear-gradient(135deg, #FFF5F5 0%, #FED7D7 100%); border-radius: 12px; padding: 20px; margin-top: 30px; border-left: 4px solid #FF6B6B;">
                          <p style="margin: 0 0 12px; color: #C53030; font-size: 14px; line-height: 1.6; font-weight: 600;">
                            ⏰ Importante: Este enlace expira en 1 hora
                          </p>
                          
                          <p style="margin: 0; color: #9B2C2C; font-size: 13px; line-height: 1.6;">
                            Si no solicitaste este cambio, ignora este correo. Tu cuenta está segura 🛡️
                          </p>
                        </div>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #2D3748 0%, #1A202C 100%); padding: 35px 40px; text-align: center;">
                        <div style="font-size: 32px; margin-bottom: 12px;">🐱</div>
                        <p style="margin: 0 0 8px; color: #E2E8F0; font-size: 15px; font-weight: 600;">
                          Gato - Tu plataforma de confianza
                        </p>
                        <p style="margin: 0; color: #A0AEC0; font-size: 13px;">
                          © ${new Date().getFullYear()} Gato. Todos los derechos reservados 🐾
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
