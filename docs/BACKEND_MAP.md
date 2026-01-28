# ⚡ Backend Map - Gato App

## Stack Tecnológico

| Tecnología | Propósito |
|------------|-----------|
| Supabase | Backend-as-a-Service |
| PostgreSQL | Base de datos |
| Deno | Runtime para Edge Functions |
| OnvoPay API | Procesamiento de pagos |
| Resend | Envío de emails |

---

## 📁 Estructura de `/supabase`

```
supabase/
├── functions/                    # Edge Functions
│   ├── onvopay-*/               # Funciones de pago
│   ├── send-*/                  # Funciones de email
│   ├── *-recurring-*/           # Funciones de recurrencia
│   └── deploy.sh                # Script de deploy
│
└── migrations/                   # Migraciones SQL
    └── *.sql                    # Archivos de migración
```

---

## 🔌 Edge Functions

### Pagos (OnvoPay)

| Función | Propósito | Trigger |
|---------|-----------|---------|
| `onvopay-authorize` | Autorizar pago con tarjeta | Frontend checkout |
| `onvopay-confirm` | Confirmar pago autorizado | Post-autorización |
| `onvopay-capture` | Capturar pago autorizado | Proveedor acepta cita |
| `onvopay-capture-on-provider-accept` | Captura automática | Aceptación de cita |
| `onvopay-charge-post-payment` | Cobrar post-servicio | Servicio completado |
| `onvopay-webhook` | Recibir eventos OnvoPay | Webhook externo |

### Suscripciones/Recurrencia

| Función | Propósito | Trigger |
|---------|-----------|---------|
| `onvopay-create-subscription` | Crear suscripción | Reserva recurrente |
| `onvopay-create-loop` | Crear loop de pagos | Suscripción activa |
| `onvopay-initiate-recurring` | Iniciar flujo recurrente | Primera reserva |
| `onvopay-process-recurring-charges` | Procesar cobros | Cron/Scheduled |
| `onvopay-subscription-webhook` | Eventos de suscripción | Webhook externo |
| `cancel-recurring-series` | Cancelar serie | Usuario cancela |
| `skip-recurring-instance` | Saltar instancia | Usuario omite |

### Clientes OnvoPay

| Función | Propósito |
|---------|-----------|
| `onvopay-customer-sync` | Sincronizar cliente con OnvoPay |
| `onvopay-customer-diagnostics` | Diagnóstico de cliente |
| `onvopay-sync-customer-names` | Sincronizar nombres |
| `onvopay-create-payment-method` | Crear método de pago |

### Utilidades

| Función | Propósito |
|---------|-----------|
| `onvopay-health-check` | Verificar estado API |
| `onvopay-transaction-lookup` | Buscar transacción |
| `send-appointment-email` | Email de cita |
| `send-password-reset` | Email reset password |

---

## 🗃️ Modelo de Datos

### Diagrama ER Simplificado

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   users     │       │  listings   │       │appointments │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │◄──────│ provider_id │       │ id (PK)     │
│ email       │       │ id (PK)     │◄──────│ listing_id  │
│ name        │       │ title       │       │ client_id   │──►│users│
│ role        │       │ base_price  │       │ provider_id │──►│users│
│ phone       │       │ duration    │       │ start_time  │
└─────────────┘       │ availability│       │ status      │
                      └─────────────┘       └─────────────┘
                             │                     │
                             ▼                     ▼
                   ┌─────────────────┐   ┌─────────────────┐
                   │provider_time_   │   │onvopay_payments │
                   │slots            │   ├─────────────────┤
                   ├─────────────────┤   │ id (PK)         │
                   │ id (PK)         │   │ appointment_id  │
                   │ listing_id      │   │ amount          │
                   │ slot_date       │   │ status          │
                   │ start_time      │   │ onvopay_id      │
                   │ is_available    │   └─────────────────┘
                   └─────────────────┘
```

### Tablas Principales

| Tabla | Descripción | RLS |
|-------|-------------|-----|
| `users` | Usuarios del sistema | ✅ |
| `listings` | Servicios publicados | ✅ |
| `appointments` | Citas/Reservas | ✅ |
| `onvopay_payments` | Registros de pago | ✅ |
| `onvopay_subscriptions` | Suscripciones activas | ✅ |
| `recurring_rules` | Reglas de recurrencia | ✅ |
| `provider_time_slots` | Slots de disponibilidad | ✅ |
| `residencias` | Residencias | ✅ |
| `condominiums` | Condominios | ✅ |
| `team_members` | Equipo del proveedor | ✅ |
| `provider_ratings` | Calificaciones | ✅ |
| `invoices` | Facturas | ✅ |

### Tablas de Soporte

| Tabla | Descripción |
|-------|-------------|
| `service_categories` | Categorías de servicios |
| `service_types` | Tipos de servicios |
| `cancellation_policies` | Políticas de cancelación |
| `email_logs` | Log de emails enviados |
| `onvopay_webhooks` | Log de webhooks |

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
```

### Roles SQL

| Rol | Descripción |
|-----|-------------|
| `anon` | Usuario no autenticado |
| `authenticated` | Usuario autenticado |
| `service_role` | Acceso completo (backend) |

---

## 🔄 Flujo de Pagos

### 1. Pago Normal

```
Cliente → onvopay-authorize → OnvoPay API
                                   │
                                   ▼
                            Payment Intent
                                   │
       ┌───────────────────────────┘
       ▼
onvopay-confirm ← Resultado 3DS
       │
       ▼
   Appointment confirmada
       │
       ▼
Proveedor acepta → onvopay-capture → Pago capturado
```

### 2. Pago Post-Servicio

```
Servicio completado
       │
       ▼
onvopay-charge-post-payment
       │
       ▼
Cobro automático con tarjeta guardada
       │
       ▼
Factura generada
```

### 3. Pago Recurrente

```
Primera reserva recurrente
       │
       ▼
onvopay-initiate-recurring
       │
       ▼
onvopay-create-subscription
       │
       ▼
onvopay-create-loop → Loop en OnvoPay
       │
       ▼
Cobros automáticos cada ciclo
```

---

## 📧 Sistema de Emails

### Funciones de Email

| Función | Trigger | Template |
|---------|---------|----------|
| `send-appointment-email` | Cita creada/modificada | appointment-* |
| `send-password-reset` | Solicitud reset | password-reset |

### Tipos de Email

- `appointment-confirmation` - Confirmación de cita
- `appointment-reminder` - Recordatorio
- `appointment-cancelled` - Cancelación
- `password-reset` - Reset de contraseña

---

## 🔧 Variables de Entorno

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `SUPABASE_URL` | URL de Supabase | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Service key | ✅ |
| `ONVOPAY_SECRET_KEY` | API key OnvoPay | ✅ |
| `RESEND_API_KEY` | API key Resend | ✅ |
| `ONVOPAY_API_BASE` | URL base OnvoPay | ❌ |

---

## 📊 Webhooks

### OnvoPay Webhooks

| Evento | Handler | Acción |
|--------|---------|--------|
| `payment.succeeded` | `onvopay-webhook` | Marcar pago exitoso |
| `payment.failed` | `onvopay-webhook` | Marcar pago fallido |
| `subscription.charge` | `onvopay-subscription-webhook` | Procesar cobro |

### Configuración

```
URL: https://{project-ref}.supabase.co/functions/v1/onvopay-webhook
Método: POST
Headers: x-onvopay-signature
```

---

## 📝 TODOs Backend

- [ ] TODO: Documentar todos los endpoints de Edge Functions
- [ ] TODO: Agregar schema de request/response
- [ ] TODO: Documentar proceso de migraciones
- [ ] TODO: Agregar tests para Edge Functions
- [ ] TODO: Documentar manejo de errores
- [ ] TODO: Crear runbook para incidentes de pago
