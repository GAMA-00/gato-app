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
      
      // Por seguridad, si el usuario no existe, no revelamos esa información
      // Simplemente retornamos éxito sin enviar el email
      if (linkError.message.includes('User with this email not found') || 
          linkError.message.includes('User not found')) {
        console.log('ℹ️ Usuario no encontrado - retornando éxito por seguridad (no se envía email)');
        return new Response(JSON.stringify({ 
          success: true,
          message: "Si el correo existe en nuestro sistema, recibirás un enlace de recuperación"
        }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        });
      }
      
      // Si es otro tipo de error, sí lo lanzamos
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
                      <td style="background-color: #1C1C1E; padding: 50px 40px; text-align: center;">
                        <div style="font-size: 56px; margin-bottom: 15px;">🐱</div>
                        <h1 style="margin: 0; color: #FFFFFF; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">Gato</h1>
                        <p style="margin: 10px 0 0; color: #8A8A8E; font-size: 15px; font-weight: 500;">Tu plataforma de confianza</p>
                      </td>
                    </tr>
                    
                    <!-- Body -->
                    <tr>
                      <td style="padding: 40px;">
                        <div style="text-align: center; margin-bottom: 35px;">
                          <div style="font-size: 48px; margin-bottom: 15px;">🔐</div>
                          <h2 style="margin: 0 0 12px; color: #1C1C1E; font-size: 26px; font-weight: 700; letter-spacing: -0.3px;">
                            Hola ${userName}
                          </h2>
                          <p style="margin: 0; color: #8A8A8E; font-size: 16px; line-height: 1.6;">
                            Recuperación de contraseña
                          </p>
                        </div>
                        
                        <p style="margin: 0 0 30px; color: #1C1C1E; font-size: 16px; line-height: 1.6; text-align: center;">
                          Recibimos una solicitud para restablecer tu contraseña.
                        </p>
                        
                        <p style="margin: 0 0 35px; color: #8A8A8E; font-size: 15px; line-height: 1.6; text-align: center;">
                          Haz clic en el botón para crear una nueva contraseña:
                        </p>
                        
                        <!-- Button -->
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center" style="padding: 0 0 30px;">
                              <a href="${recoveryLink}" 
                                 style="display: inline-block; 
                                        padding: 16px 40px; 
                                        background-color: #1C1C1E;
                                        color: #FFFFFF; 
                                        text-decoration: none; 
                                        border-radius: 12px; 
                                        font-weight: 600; 
                                        font-size: 16px;
                                        box-shadow: 0 4px 12px rgba(28, 28, 30, 0.15);
                                        letter-spacing: -0.2px;">
                                Restablecer contraseña
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
                        
                        <div style="background-color: #F2F2F2; border-radius: 12px; padding: 24px; margin-top: 35px; border-left: 4px solid #1C1C1E;">
                          <p style="margin: 0 0 12px; color: #1C1C1E; font-size: 15px; line-height: 1.6; font-weight: 600;">
                            ⏰ Este enlace expira en 1 hora
                          </p>
                          
                          <p style="margin: 0; color: #8A8A8E; font-size: 14px; line-height: 1.6;">
                            Si no solicitaste este cambio, ignora este correo. Tu cuenta está segura.
                          </p>
                        </div>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #F2F2F2; padding: 35px 40px; text-align: center; border-top: 1px solid #E0E0E0;">
                        <div style="font-size: 28px; margin-bottom: 10px; opacity: 0.6;">🐱</div>
                        <p style="margin: 0 0 6px; color: #1C1C1E; font-size: 14px; font-weight: 600;">
                          Gato
                        </p>
                        <p style="margin: 0; color: #8A8A8E; font-size: 13px;">
                          © ${new Date().getFullYear()} Todos los derechos reservados
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
