# ⚡ Backend Map - Gato App

> **Última actualización:** Febrero 2026  
> **Versión:** 2.0 DOE

## Stack Tecnológico

| Tecnología | Propósito |
|------------|-----------|
| Supabase | Backend-as-a-Service |
| PostgreSQL | Base de datos relacional |
| Deno | Runtime para Edge Functions |
| 🆕 WhatsApp Cloud API | Mensajería: OTP, notificaciones, recordatorios (canal único al cliente) |
| 🆕 Google Maps/Geocoding | Geocoding inverso GPS → cantón |
| OnvoPay API | Procesamiento de pagos (oculto en v1) |
| Resend | Envío de emails |

---

## 📁 Estructura de `/supabase`

```
supabase/
├── functions/                              # Edge Functions (25+)
│   │
│   ├── onvopay-authorize/                 # Autorizar pago
│   ├── onvopay-capture/                   # Capturar pago
│   ├── onvopay-capture-on-provider-accept/# Captura automática
│   ├── onvopay-charge-post-payment/       # Cobro post-servicio
│   ├── onvopay-confirm/                   # Confirmar 3DS
│   ├── onvopay-webhook/                   # Webhook de pagos
│   │
│   ├── onvopay-create-subscription/       # Crear suscripción
│   ├── onvopay-create-loop/               # Crear loop de cobros
│   ├── onvopay-initiate-recurring/        # Iniciar recurrente
│   ├── onvopay-process-recurring-charges/ # Procesar cobros
│   ├── onvopay-subscription-webhook/      # Webhook suscripciones
│   ├── onvopay-sweep-completed-recurring/ # Limpiar completadas
│   ├── onvopay-sync-recurring-payments/   # Sincronizar pagos
│   │
│   ├── onvopay-customer-sync/             # Sincronizar cliente
│   ├── onvopay-customer-diagnostics/      # Diagnóstico cliente
│   ├── onvopay-sync-customer-names/       # Sincronizar nombres
│   ├── onvopay-create-payment-method/     # Crear método de pago
│   │
│   ├── onvopay-health-check/              # Estado de API
│   ├── onvopay-transaction-lookup/        # Buscar transacción
│   ├── create-payment/                    # Crear pago (legacy)
│   │
│   ├── cancel-recurring-series/           # Cancelar serie
│   ├── skip-recurring-instance/           # Saltar instancia
│   ├── process-recurring-charges/         # Procesar cobros (cron)
│   │
│   ├── send-appointment-email/            # Email de cita
│   ├── send-password-reset/               # Email reset password
│   │
│   ├── RECURRING_PAYMENTS_FLOW.md         # Documentación flujo
│   └── deploy.sh                          # Script de deploy
│
└── migrations/                             # Migraciones SQL
    └── *.sql                              # Archivos de migración
```

---

## 🔌 Edge Functions

### Pagos (OnvoPay) - Core

| Función | Propósito | Trigger |
|---------|-----------|---------|
| `onvopay-authorize` | Autorizar pago con tarjeta | Frontend checkout |
| `onvopay-confirm` | Confirmar pago post-3DS | Redirect 3DS |
| `onvopay-capture` | Capturar pago autorizado | Manual/Admin |
| `onvopay-capture-on-provider-accept` | Captura automática | Proveedor acepta cita |
| `onvopay-charge-post-payment` | Cobrar post-servicio | Servicio completado |
| `onvopay-webhook` | Recibir eventos OnvoPay | Webhook externo |

### Suscripciones/Recurrencia

| Función | Propósito | Trigger |
|---------|-----------|---------|
| `onvopay-initiate-recurring` | Iniciar flujo recurrente | Primera reserva recurrente |
| `onvopay-create-subscription` | Crear suscripción en DB | Post-autorización |
| `onvopay-create-loop` | Crear loop en OnvoPay | Suscripción activa |
| `onvopay-process-recurring-charges` | Procesar cobros pendientes | Cron diario |
| `onvopay-subscription-webhook` | Eventos de suscripción | Webhook externo |
| `onvopay-sweep-completed-recurring` | Limpiar suscripciones | Cron semanal |
| `onvopay-sync-recurring-payments` | Sincronizar pagos | Cron/Manual |
| `cancel-recurring-series` | Cancelar serie completa | Usuario cancela |
| `skip-recurring-instance` | Saltar una instancia | Usuario omite |

### Clientes OnvoPay

| Función | Propósito |
|---------|-----------|
| `onvopay-customer-sync` | Sincronizar cliente con OnvoPay |
| `onvopay-customer-diagnostics` | Diagnóstico de cliente |
| `onvopay-sync-customer-names` | Sincronizar nombres |
| `onvopay-create-payment-method` | Crear/guardar método de pago |

### Utilidades

| Función | Propósito |
|---------|-----------|
| `onvopay-health-check` | Verificar estado API OnvoPay |
| `onvopay-transaction-lookup` | Buscar transacción por ID |
| `send-appointment-email` | Enviar email de cita |
| `send-password-reset` | Enviar email reset password |

### 🆕 Nuevas (concepto v1) — por construir

| Función | Propósito | Trigger |
|---------|-----------|---------|
| `whatsapp-send` | Enviar mensaje/plantilla vía WhatsApp Cloud API | Interna |
| `whatsapp-webhook` | Estados de entrega + mensajes entrantes del cliente | Webhook Meta |
| `whatsapp-otp-request` | Generar y enviar OTP de 6 dígitos | Login proveedor (O-1) |
| `whatsapp-otp-verify` | Validar OTP e iniciar sesión | Login proveedor (O-1) |
| `send-reminders` | Cron: envía `reminder_jobs` vencidos (24h/2h/mensual) | Scheduled |
| `geocode-reverse` | GPS → cantón (geocoding inverso) | Booking link (BL-2) |

> Ver `skills/SKILL_WHATSAPP_MESSAGING.md` y `skills/SKILL_CANTONES_GEO.md`.

---

## 🗃️ Modelo de Datos

### Diagrama ER Principal

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     users       │       │    listings     │       │  appointments   │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │◄──────│ provider_id     │       │ id (PK)         │
│ email           │       │ id (PK)         │◄──────│ listing_id      │
│ name            │       │ title           │       │ client_id  ────►│users│
│ phone           │       │ base_price      │       │ provider_id ───►│users│
│ role            │       │ duration        │       │ start_time      │
│ avatar_url      │       │ currency        │       │ end_time        │
│ about_me        │       │ is_active       │       │ status          │
│ experience_years│       │ is_post_payment │       │ recurrence      │
└─────────────────┘       │ availability    │       │ onvopay_payment │
                          │ service_variants│       └─────────────────┘
                          │ slot_size       │                │
                          └─────────────────┘                ▼
                                   │               ┌─────────────────┐
                                   ▼               │onvopay_payments │
                          ┌─────────────────┐      ├─────────────────┤
                          │provider_time_   │      │ id (PK)         │
                          │slots            │      │ appointment_id  │
                          ├─────────────────┤      │ amount          │
                          │ id (PK)         │      │ status          │
                          │ listing_id      │      │ onvopay_id      │
                          │ provider_id     │      │ payment_type    │
                          │ slot_date       │      │ authorized_at   │
                          │ start_time      │      │ captured_at     │
                          │ end_time        │      └─────────────────┘
                          │ slot_datetime_  │
                          │   start/end     │
                          │ is_available    │
                          │ is_reserved     │
                          │ slot_type       │
                          └─────────────────┘
```

### Diagrama ER Recurrencia

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ recurring_rules │       │onvopay_         │       │ recurring_      │
├─────────────────┤       │subscriptions    │       │ instances       │
│ id (PK)         │◄──────│ recurring_rule  │       ├─────────────────┤
│ client_id       │       │ id              │       │ id (PK)         │
│ provider_id     │       ├─────────────────┤       │ recurring_rule  │
│ listing_id      │       │ id (PK)         │       │ id              │──►│
│ recurrence_type │       │ client_id       │       │ instance_date   │
│ day_of_week     │       │ provider_id     │       │ start_time      │
│ start_date      │       │ interval_type   │       │ end_time        │
│ start_time      │       │ next_charge_date│       │ status          │
│ is_active       │       │ status          │       └─────────────────┘
└─────────────────┘       │ onvopay_loop_id │
                          └─────────────────┘
```

### Tablas Core

| Tabla | Descripción | RLS |
|-------|-------------|-----|
| `users` | Usuarios del sistema | ✅ |
| `listings` | Servicios publicados | ✅ |
| `appointments` | Citas/Reservas | ✅ |
| `provider_time_slots` | Slots de disponibilidad | ✅ |
| `provider_availability` | Horarios del proveedor | ✅ |

### Tablas de Pagos

| Tabla | Descripción | RLS |
|-------|-------------|-----|
| `onvopay_payments` | Registros de pago | ✅ |
| `onvopay_subscriptions` | Suscripciones activas | ✅ |
| `onvopay_customers` | Clientes sincronizados | ✅ |
| `onvopay_webhooks` | Log de webhooks | ✅ |
| `payment_methods` | Métodos de pago guardados | ✅ |
| `invoices` | Facturas generadas | ✅ |
| `post_payment_invoices` | Facturas post-pago | ✅ |
| `post_payment_items` | Items de factura | ✅ |
| `post_payment_evidence` | Evidencia de servicio | ✅ |

### Tablas de Recurrencia

| Tabla | Descripción | RLS |
|-------|-------------|-----|
| `recurring_rules` | Reglas de recurrencia | ✅ |
| `recurring_instances` | Instancias generadas | ✅ |
| `recurring_exceptions` | Excepciones (saltar/reagendar) | ✅ |
| `recurring_appointment_instances` | Citas recurrentes | ✅ |

### Tablas de Ubicación

| Tabla | Descripción | RLS |
|-------|-------------|-----|
| `residencias` | Residencias/Comunidades | ✅ |
| `condominiums` | Condominios | ✅ |
| `clients` | Relación cliente-residencia | ✅ |
| `providers` | Registro de proveedores | ✅ |
| `provider_residencias` | Zonas que cubre proveedor | ✅ |
| `listing_residencias` | Zonas por servicio | ✅ |

### Tablas de Soporte

| Tabla | Descripción |
|-------|-------------|
| `service_categories` | Categorías de servicios |
| `service_types` | Tipos de servicios |
| `team_members` | Equipo del proveedor |
| `provider_ratings` | Calificaciones |
| `cancellation_policies` | Políticas de cancelación |
| `email_logs` | Log de emails |
| `user_roles` | Roles de usuario (admin) |
| `system_settings` | Configuración del sistema |
| `admin_stat_offsets` | Offsets para estadísticas |
| `price_history` | Historial de precios |

### 🆕 Tablas nuevas (concepto v1)

| Tabla | Descripción | RLS |
|-------|-------------|-----|
| `provincias` | 7 provincias de CR (lectura pública) | ✅ |
| `cantones` | 84 cantones + centroide (lectura pública) | ✅ |
| `provider_cantones` | Zonas de trabajo del proveedor + días/aceptación | ✅ |
| `provider_settings` | Buffer, descuento proximidad, toggles recordatorio | ✅ |
| `whatsapp_messages` | Log de mensajes WhatsApp (in/out) | ✅ |
| `whatsapp_otp` | Códigos OTP hasheados (login) | ✅ |
| `reminder_jobs` | Cola de recordatorios programados | ✅ |

> Esquema SQL completo en [CONCEPTO_V1.md](./CONCEPTO_V1.md) §5.

---

## 🔐 Row Level Security (RLS)

### Políticas Principales

```sql
-- Usuarios solo ven su propio perfil
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Proveedores ven sus propias citas
CREATE POLICY "Providers view own appointments" ON appointments
  FOR SELECT USING (auth.uid() = provider_id);

-- Clientes ven sus propias reservas
CREATE POLICY "Clients view own bookings" ON appointments
  FOR SELECT USING (auth.uid() = client_id);

-- Admins ven todo
CREATE POLICY "Admins view all" ON appointments
  FOR SELECT USING (has_role(auth.uid(), 'admin'));
```

### Funciones de Rol

```sql
-- Verificar si usuario tiene rol
CREATE FUNCTION has_role(user_id uuid, role app_role)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = $1
    AND user_roles.role = $2
  );
$$ LANGUAGE sql SECURITY DEFINER;
```

### Roles SQL

| Rol | Descripción | Acceso |
|-----|-------------|--------|
| `anon` | Usuario no autenticado | Lectura pública limitada |
| `authenticated` | Usuario autenticado | Según RLS políticas |
| `service_role` | Acceso completo | Edge Functions |

---

## 🔄 Flujos de Pagos

### 1. Pago Normal (Pre-pago)

```
                    Frontend Checkout
                          │
                          ▼
              ┌─────────────────────┐
              │  onvopay-authorize  │
              └─────────────────────┘
                          │
                          ▼
                    OnvoPay API
                    (authorize)
                          │
              ┌───────────┴───────────┐
              │                       │
    3DS Required              No 3DS
              │                       │
              ▼                       │
        Redirect 3DS                  │
              │                       │
              ▼                       │
    ┌─────────────────┐               │
    │ onvopay-confirm │               │
    └─────────────────┘               │
              │                       │
              └───────────┬───────────┘
                          │
                          ▼
              Appointment creada
              (status: pending)
                          │
                          ▼
              Proveedor acepta
                          │
                          ▼
    ┌─────────────────────────────────┐
    │onvopay-capture-on-provider-accept│
    └─────────────────────────────────┘
                          │
                          ▼
              Pago capturado
              (status: captured)
```

### 2. Pago Post-Servicio

```
              Cliente reserva
              (sin pago inicial)
                     │
                     ▼
              Proveedor acepta
                     │
                     ▼
              Servicio ejecutado
                     │
                     ▼
              Proveedor marca completado
                     │
                     ▼
    ┌──────────────────────────────┐
    │onvopay-charge-post-payment   │
    └──────────────────────────────┘
                     │
                     ▼
              Cobro con tarjeta guardada
                     │
                     ▼
              Factura generada
```

### 3. Pago Recurrente

```
              Primera reserva recurrente
                        │
                        ▼
          ┌──────────────────────────┐
          │onvopay-initiate-recurring│
          └──────────────────────────┘
                        │
           ┌────────────┴────────────┐
           │                         │
    Crear appointment         Crear recurring_rule
           │                         │
           └────────────┬────────────┘
                        │
                        ▼
          ┌──────────────────────────┐
          │    onvopay-authorize     │
          └──────────────────────────┘
                        │
                        ▼
          Primer pago autorizado
                        │
                        ▼
          ┌──────────────────────────┐
          │onvopay-create-subscription│
          └──────────────────────────┘
                        │
                        ▼
          ┌──────────────────────────┐
          │   onvopay-create-loop    │
          └──────────────────────────┘
                        │
                        ▼
          Loop creado en OnvoPay
                        │
            ┌───────────┴───────────┐
            │    Cada ciclo:        │
            │                       │
            ▼                       ▼
    Cobro automático      Crear appointment
    (via loop)            para próxima fecha
```

---

## 📧 Sistema de Emails

### Edge Functions

| Función | Trigger | Template |
|---------|---------|----------|
| `send-appointment-email` | Cita creada/modificada | appointment-* |
| `send-password-reset` | Solicitud reset | password-reset |

### Tipos de Email

| Tipo | Descripción |
|------|-------------|
| `appointment-confirmation` | Confirmación de cita |
| `appointment-reminder` | Recordatorio (24h antes) |
| `appointment-cancelled` | Cancelación |
| `appointment-rescheduled` | Reagendamiento |
| `password-reset` | Reset de contraseña |
| `payment-receipt` | Recibo de pago |
| `payment-failed` | Pago fallido |

---

## ⚙️ Funciones SQL Importantes

### Generación de Slots

```sql
-- Genera slots para un listing específico
-- IMPORTANTE: Usa timezone America/Mexico_City
generate_provider_time_slots_for_listing(
  p_provider_id uuid,
  p_listing_id uuid,
  p_days_ahead integer DEFAULT 60
) RETURNS integer
```

### Utilidades

```sql
-- Actualizar updated_at automáticamente
update_updated_at_column() RETURNS trigger

-- Verificar rol de usuario
has_role(user_id uuid, role app_role) RETURNS boolean
```

---

## 🔧 Variables de Entorno

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `SUPABASE_URL` | URL del proyecto Supabase | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | ✅ |
| `SUPABASE_ANON_KEY` | Anon key | ✅ |
| `ONVOPAY_SECRET_KEY` | API key OnvoPay | ✅ |
| `ONVOPAY_API_BASE` | URL base OnvoPay | ❌ (default) |
| `RESEND_API_KEY` | API key Resend | ✅ |
| `ONVOPAY_API_BASE` | URL base OnvoPay | ❌ |
| 🆕 `WHATSAPP_TOKEN` | Token de WhatsApp Cloud API (**secreto** — regenerar si se filtra) | ✅ |
| 🆕 `WHATSAPP_PHONE_NUMBER_ID` | Phone Number ID de Meta | ✅ |
| 🆕 `WHATSAPP_WABA_ID` | WhatsApp Business Account ID | ✅ |
| 🆕 `GOOGLE_MAPS_API_KEY` | Geocoding inverso GPS → cantón | ✅ |

---

## 📊 Webhooks

### OnvoPay Webhooks

| Evento | Handler | Acción |
|--------|---------|--------|
| `payment.authorized` | `onvopay-webhook` | Marcar autorizado |
| `payment.captured` | `onvopay-webhook` | Marcar capturado |
| `payment.failed` | `onvopay-webhook` | Marcar fallido |
| `payment.refunded` | `onvopay-webhook` | Marcar reembolsado |
| `subscription.charge.success` | `onvopay-subscription-webhook` | Procesar cobro |
| `subscription.charge.failed` | `onvopay-subscription-webhook` | Manejar fallo |

### Configuración de Webhook

```
URL: https://jckynopecuexfamepmoh.supabase.co/functions/v1/onvopay-webhook
Método: POST
Headers: x-onvopay-signature
```

---

## 📝 Patrones de Edge Function

### Template Base

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    
    // Lógica aquí...

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
```

### Autenticación JWT

```typescript
const authHeader = req.headers.get('Authorization');
if (!authHeader) {
  return new Response(
    JSON.stringify({ error: 'No authorization header' }),
    { status: 401 }
  );
}

const { data: { user }, error } = await supabase.auth.getUser(
  authHeader.replace('Bearer ', '')
);
```

### Llamada a OnvoPay

```typescript
const ONVOPAY_SECRET_KEY = Deno.env.get('ONVOPAY_SECRET_KEY');

const response = await fetch('https://api.onvopay.com/v1/payments', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${ONVOPAY_SECRET_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ ... }),
});
```

---

## 🚨 Monitoreo y Debug

### Queries de Diagnóstico

```sql
-- Pagos del día por estado
SELECT status, COUNT(*) 
FROM onvopay_payments 
WHERE created_at > CURRENT_DATE 
GROUP BY status;

-- Pagos fallidos recientes
SELECT * FROM onvopay_payments 
WHERE status = 'failed' 
AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Webhooks no procesados
SELECT * FROM onvopay_webhooks 
WHERE processed = false 
ORDER BY received_at DESC 
LIMIT 10;

-- Suscripciones activas
SELECT * FROM onvopay_subscriptions 
WHERE status = 'active'
ORDER BY next_charge_date;
```

### Edge Function Logs

Acceso via:
```
https://supabase.com/dashboard/project/jckynopecuexfamepmoh/functions/{function_name}/logs
```

---

## ⚠️ Archivos Críticos

```
DO_NOT_CHANGE_BEHAVIOR sin revisión:
- supabase/functions/onvopay-authorize/
- supabase/functions/onvopay-capture/
- supabase/functions/onvopay-capture-on-provider-accept/
- supabase/functions/onvopay-initiate-recurring/
- supabase/functions/onvopay-create-subscription/
- supabase/functions/onvopay-create-loop/
- supabase/functions/onvopay-webhook/
```
