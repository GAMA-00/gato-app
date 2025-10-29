# 📧 Configuración de Resend para Emails de Producción

## Problema Actual

Resend está en modo de prueba y solo permite enviar emails al correo registrado: `tech.gatoapp@outlook.com`

## Pasos para Habilitar Envío a Cualquier Email

### 1. Verificar un Dominio en Resend

1. **Ir a Resend Domains:**
   - Visita: https://resend.com/domains
   - Inicia sesión con tu cuenta

2. **Agregar tu Dominio:**
   - Haz clic en "Add Domain"
   - Ingresa tu dominio (ej: `loop.com` o `tudominio.com`)
   - Haz clic en "Add"

3. **Configurar Registros DNS:**
   
   Resend te dará 3 registros DNS que debes agregar en tu proveedor de dominio (GoDaddy, Namecheap, Cloudflare, etc.):

   **Registro SPF (TXT):**
   ```
   Tipo: TXT
   Nombre: @
   Valor: v=spf1 include:spf.resend.com ~all
   ```

   **Registro DKIM (TXT):**
   ```
   Tipo: TXT
   Nombre: resend._domainkey
   Valor: [valor proporcionado por Resend]
   ```

   **Registro DMARC (TXT):**
   ```
   Tipo: TXT
   Nombre: _dmarc
   Valor: v=DMARC1; p=none; rua=mailto:dmarc@tudominio.com
   ```

4. **Verificar el Dominio:**
   - Espera 5-10 minutos para que se propaguen los cambios DNS
   - Regresa a Resend y haz clic en "Verify Domain"
   - Una vez verificado, verás un ✅ junto a tu dominio

### 2. Actualizar el Email "From" en el Código

Una vez verificado el dominio, actualiza estos archivos:

**Archivo: `supabase/functions/send-password-reset/index.ts`**

Cambia la línea 69:
```typescript
// ❌ Antes (modo prueba)
from: "Loop <onboarding@resend.dev>",

// ✅ Después (con dominio verificado)
from: "Loop <noreply@tudominio.com>",
```

### 3. Verificar que Funciona

1. Despliega los cambios (se hace automáticamente)
2. Prueba el flujo de recuperación de contraseña
3. Verifica que el email llegue a cualquier dirección

## Alternativa: Usar el Email de Prueba

Mientras verificas el dominio, puedes probar con `tech.gatoapp@outlook.com`:

1. Ve a `/forgot-password`
2. Ingresa: `tech.gatoapp@outlook.com`
3. El email debería llegar inmediatamente

## Recursos

- **Resend Docs:** https://resend.com/docs/introduction
- **Verificar Dominio:** https://resend.com/domains
- **API Keys:** https://resend.com/api-keys
- **Dashboard:** https://resend.com/emails

## Costos

- **Gratis:** 3,000 emails/mes
- **Pro:** $20/mes - 50,000 emails/mes
- Más planes en: https://resend.com/pricing
