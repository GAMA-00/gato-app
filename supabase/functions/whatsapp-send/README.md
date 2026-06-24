# WhatsApp Cloud API — Funciones

Integración de WhatsApp Business (concepto v1). Canal único de comunicación con el
cliente. Ver `docs/skills/SKILL_WHATSAPP_MESSAGING.md` y `docs/CONCEPTO_V1.md` §6.

## Funciones

| Función | Propósito | verify_jwt |
|---------|-----------|------------|
| `whatsapp-send` | Enviar plantilla o texto; registra en `whatsapp_messages` | true |
| `whatsapp-webhook` | Handshake de Meta + estados de entrega + mensajes entrantes | false |

## Secrets requeridos (Supabase → Edge Functions → Secrets)

| Secret | Descripción |
|--------|-------------|
| `WHATSAPP_TOKEN` | Token de acceso de la Cloud API. **Regenerar si se filtró.** Nunca en código. |
| `WHATSAPP_PHONE_NUMBER_ID` | Phone Number ID (público). Actual: `1079451205261386` |
| `WHATSAPP_WABA_ID` | WhatsApp Business Account ID (público). Actual: `1133763133156652` |
| `WHATSAPP_VERIFY_TOKEN` | Cadena que vos inventás; se pone igual en la config del webhook de Meta |
| `WHATSAPP_APP_SECRET` | (Opcional pero recomendado) App secret para validar la firma del webhook |
| `WHATSAPP_GRAPH_VERSION` | (Opcional) versión de Graph API, default `v21.0` |

> ⚠️ El token compartido en chat debe regenerarse (tarea anotada en CONCEPTO_V1 §9).

## whatsapp-send — request

```jsonc
// Plantilla (proactivo / fuera de la ventana de 24h)
{
  "to": "50688887777",          // se normaliza a E.164; 8 dígitos → se antepone 506
  "type": "template",
  "template": "cita_confirmada",
  "language": "es",
  "params": ["María", "martes 15", "9:00 AM"],
  "appointment_id": "uuid-opcional"
}

// Texto libre (solo dentro de la ventana de 24h)
{ "to": "50688887777", "type": "text", "body": "¡Hola!" }
```

Respuesta: `{ "success": true, "wa_message_id": "wamid...", "log_id": "uuid" }`.

Desde el frontend, usar `src/services/whatsappService.ts`
(`sendWhatsAppTemplate` / `sendWhatsAppText`).

## Plantillas a registrar en Meta (esperan aprobación)

`solicitud_recibida`, `cita_confirmada`, `recordatorio_24h`, `recordatorio_2h`,
`cancelacion_proveedor`, `otp_login`. Idioma `es`. Los textos están en la Sección 9 del
spec (`docs/SPEC_PRODUCTO_V1.md`).

## Configurar el webhook en Meta

1. URL de callback: `https://<project-ref>.supabase.co/functions/v1/whatsapp-webhook`
2. Verify token: el mismo valor de `WHATSAPP_VERIFY_TOKEN`.
3. Suscribir el campo `messages`.
4. Meta hará un `GET` de verificación (se responde el `hub.challenge`) y luego enviará
   `POST` con estados y mensajes entrantes.
