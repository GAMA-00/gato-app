# 🛠️ Skill: Mensajería por WhatsApp (Cloud API)

## Contexto

WhatsApp Business es el **canal único de comunicación con el cliente** en Gato (ver
`docs/CONCEPTO_V1.md` §8.4). Todo mensaje automático al cliente sale del número de
Gato — el proveedor nunca expone su número personal. También se usa para OTP de login
del proveedor (pantalla O-1) y recordatorios (SE-4).

Usamos la **WhatsApp Cloud API** de Meta (Graph API).

---

## Identificadores y secrets

| Dato | Tipo | Dónde vive |
|------|------|------------|
| Phone Number ID | público | secret/config `WHATSAPP_PHONE_NUMBER_ID` |
| WhatsApp Business Account ID | público | secret/config `WHATSAPP_WABA_ID` |
| API Token | **secreto** | secret `WHATSAPP_TOKEN` (Supabase) — **nunca** en código ni `.env` commiteado |

> ⚠️ Si un token se filtra (chat, commit, log), **regenerarlo** en Meta for Developers
> de inmediato. Los tokens de larga duración se generan en System Users.

---

## Regla de oro: plantillas vs. mensajes de sesión

- **Dentro de la ventana de 24h** (el cliente escribió hace <24h): se puede enviar
  texto libre (`type: text`).
- **Fuera de la ventana de 24h** (recordatorios, confirmaciones proactivas): se
  **requiere una plantilla aprobada** por Meta (`type: template`). Hay que registrar y
  esperar aprobación de cada plantilla antes de producción.

Plantillas a registrar para v1 (Sección 9 del spec):
`solicitud_recibida`, `cita_confirmada`, `recordatorio_24h`, `recordatorio_2h`,
`cancelacion_proveedor`, `otp_login`.

---

## Enviar un mensaje (Edge Function `whatsapp-send`)

```typescript
// supabase/functions/whatsapp-send/index.ts
const WHATSAPP_TOKEN = Deno.env.get('WHATSAPP_TOKEN')!;
const PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')!;

async function sendTemplate(to: string, template: string, params: string[]) {
  const url = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,                                   // formato E.164: 50688887777
      type: 'template',
      template: {
        name: template,
        language: { code: 'es' },           // o 'es_CR' si la plantilla lo usa
        components: [{
          type: 'body',
          parameters: params.map((text) => ({ type: 'text', text })),
        }],
      },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;                              // contiene messages[0].id (wa_message_id)
}
```

> Siempre **loggear** en `whatsapp_messages` (direction, to, template, wa_message_id,
> status, appointment_id) para auditoría y para reenviar respuestas entrantes al
> proveedor.

---

## Formato de número (Costa Rica)

- Guardar y enviar en **E.164 sin `+`**: `50688887777` (506 + 8 dígitos).
- El selector de país en O-1/BL-5 default **CR +506**.
- Validar 8 dígitos para CR antes de enviar.

---

## OTP de login (pantalla O-1)

```
1. whatsapp-otp-request:
   - genera código de 6 dígitos
   - guarda hash (bcrypt) en whatsapp_otp con expires_at = now()+5min
   - envía plantilla 'otp_login' con el código
2. whatsapp-otp-verify:
   - compara hash, valida expiración y intentos (<5)
   - si ok: crea/recupera usuario proveedor e inicia sesión
```

> **Nunca** guardar el código OTP en claro. Limitar intentos. Expirar en 5 min.

---

## Webhook entrante (`whatsapp-webhook`)

- Meta envía un `GET` de verificación (responder el `hub.challenge`) y `POST` con
  estados (`sent/delivered/read/failed`) y mensajes entrantes.
- Verificar la firma `X-Hub-Signature-256` con el app secret.
- En mensaje entrante: registrar en `whatsapp_messages` (direction `inbound`) y
  notificar al proveedor en la app (Sección 9: "las respuestas se reenvían al
  proveedor").

---

## Checklist

- [ ] Token solo como secret, nunca commiteado
- [ ] Número en E.164 sin `+`
- [ ] Plantilla usada si está fuera de ventana de 24h
- [ ] Mensaje logueado en `whatsapp_messages`
- [ ] Webhook verifica firma de Meta
- [ ] OTP hasheado, expira en 5 min, máximo 5 intentos
