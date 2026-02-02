
# Auditoría Completa del Sistema de Pagos OnvoPay

## Resumen Ejecutivo

Tras revisar exhaustivamente todas las Edge Functions, el código frontend, y la base de datos, he identificado **4 problemas críticos** y **3 mejoras recomendadas** para garantizar el correcto funcionamiento del sistema de pagos.

---

## ✅ Validación de Cumplimiento con Reglas de Negocio

### Regla 0: No cobrar antes de confirmación del proveedor
| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| One-time: No cobra al crear solicitud | ✅ Cumple | `onvopay-authorize` crea Payment Intent con status `pending_authorization` |
| One-time: Cobra solo al aceptar proveedor | ✅ Cumple | `onvopay-capture-on-provider-accept` ejecuta `/confirm` y `/capture` |
| Recurrente: No crea plan sin confirmación | ✅ Cumple | `onvopay-create-subscription` solo guarda localmente, no cobra |
| Recurrente: Cobra al aceptar proveedor | ✅ Cumple | `onvopay-initiate-recurring` se invoca desde `capture-on-provider-accept` |
| Rechazo: No crea transacción | ✅ Cumple | `handleDecline` en `useRequestActions.ts` solo actualiza status a `rejected` |

### Flujo de Captura Verificado
```text
Cliente solicita reserva
       │
       ▼
┌─────────────────────────────────────┐
│ onvopay-authorize                   │
│ • Crea Payment Intent               │
│ • Status: pending_authorization     │
│ • NO confirma, NO captura           │
└─────────────────────────────────────┘
       │
       ▼
Proveedor ACEPTA (handleAccept)
       │
       ▼
┌─────────────────────────────────────┐
│ onvopay-capture-on-provider-accept  │
│ • Llama /confirm con paymentMethodId│
│ • Llama /capture                    │
│ • Actualiza status: captured        │
└─────────────────────────────────────┘
       │
       ▼
✅ Dinero transferido
```

---

## ❌ Problemas Críticos Identificados

### 1. CRÍTICO: Moneda Hardcodeada (USD únicamente)

**Problema**: Todas las Edge Functions envían `currency: 'USD'` a OnvoPay, ignorando la moneda configurada en el listing.

**Archivos afectados**:
| Archivo | Línea | Código problemático |
|---------|-------|---------------------|
| `onvopay-authorize/index.ts` | 270 | `currency: 'USD'` |
| `onvopay-create-subscription/index.ts` | 98 | `currency: 'USD'` |
| `onvopay-charge-post-payment/index.ts` | 135 | `currency: 'USD'` |
| `onvopay-webhook/index.ts` | 441 | `currency: 'USD'` |

**Consecuencia**: Si un proveedor configura un servicio en CRC (₡15,000), el sistema envía $15,000 a OnvoPay.

**Solución requerida**:
1. Obtener `currency` del listing asociado a la cita
2. Pasar `currency` dinámicamente a OnvoPay
3. Validar que la moneda sea soportada (`USD` o `CRC`)

### 2. CRÍTICO: Fecha de Cobro Recurrente Basada en Fecha de Servicio (No Confirmación)

**Problema**: El sistema calcula `next_charge_date` basándose en `appointment.start_time` (fecha del servicio), no en la fecha de confirmación.

**Archivo afectado**: `onvopay-create-subscription/index.ts` líneas 128-130

```typescript
// ❌ ACTUAL: Usa fecha del servicio
const nextChargeDate = new Date(appointment.start_time);
```

**Ejemplo del problema**:
- Reserva confirmada: Lunes 6 de enero
- Servicio se presta: Miércoles 8 de enero (cada 15 días)
- **Actual**: Cobra los miércoles cada 15 días
- **Esperado**: Cobra los lunes cada 15 días (fecha de confirmación)

**Solución requerida**:
```typescript
// ✅ CORRECTO: Usar fecha actual (momento de confirmación)
const nextChargeDate = new Date(); // Fecha de confirmación
```

### 3. CRÍTICO: No hay Cron Job Configurado para Cobros Recurrentes

**Problema**: La tabla `cron.job` está vacía. El proceso `process-recurring-charges` nunca se ejecuta automáticamente.

**Consecuencia**: Los cobros recurrentes futuros (después del inicial) nunca se procesan.

**Evidencia en BD**: 
- Suscripciones con `next_charge_date` del 2025-11-13 siguen en status `active` sin procesarse
- Todas las suscripciones tienen `loop_status: 'manual_scheduling'`

**Solución requerida**:
```sql
SELECT cron.schedule(
  'process-recurring-charges-daily',
  '0 6 * * *',  -- 6:00 AM todos los días (hora Costa Rica)
  $$
  SELECT net.http_post(
    url:='https://jckynopecuexfamepmoh.supabase.co/functions/v1/process-recurring-charges',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb,
    body:='{}'::jsonb
  ) AS request_id;
  $$
);
```

### 4. ALTO: IVA Hardcodeado al 13% (Solo Costa Rica)

**Problema**: El cálculo de IVA está fijo al 13% de Costa Rica.

**Archivo**: `onvopay-authorize/utils.ts` línea 61
```typescript
const subtotalCents = Math.round(amountCents / 1.13);
```

**Impacto**: Si el sistema se expande a otros países o cambia la legislación fiscal, el IVA será incorrecto.

---

## ⚠️ Mejoras Recomendadas

### 1. Idempotencia: Protección contra Cobros Duplicados

**Estado actual**: Parcialmente implementado
- ✅ `onvopay-initiate-recurring` usa `idempotency_key`
- ✅ `onvopay-process-membership-charge` verifica pagos recientes (24h)
- ⚠️ `onvopay-authorize` acepta `idempotency_key` pero no lo genera automáticamente

**Recomendación**: Generar `idempotency_key` automáticamente en todos los flujos:
```typescript
const idempotencyKey = `${appointmentId}_${paymentType}_${Date.now()}`;
```

### 2. Validación de Reintentos: Max 3 Intentos

**Estado actual**: ✅ Implementado correctamente
- `onvopay_subscriptions.max_retry_attempts` default 3
- `failed_attempts` se incrementa en cada fallo
- Suscripción se cancela automáticamente después de 3 fallos

### 3. Tipos de Recurrencia Soportados

**Estado actual**: ✅ Completo
| Frecuencia | interval_type | interval_count | Verificado |
|------------|---------------|----------------|------------|
| Semanal | weekly | 1 | ✅ |
| Quincenal | biweekly | 1 | ✅ |
| Cada 3 semanas | triweekly | 1 | ✅ |
| Mensual | monthly | 1 | ✅ |

---

## Cambios Requeridos (Plan de Implementación)

### Fase 1: Corrección de Moneda (CRÍTICO)

**Archivo**: `supabase/functions/onvopay-authorize/index.ts`

1. Obtener currency del listing:
```typescript
// Agregar currency a la query del appointment (línea ~154)
.select(`
  client_id, 
  provider_id, 
  listing_id,
  recurrence,
  listings (
    title,
    currency,  // ← AGREGAR
    service_type_id,
    service_types (name)
  )
`)
```

2. Usar currency dinámico en Payment Intent:
```typescript
// Línea ~268-280
const paymentIntentData = {
  amount: amountCents,
  currency: appointment.listings?.currency || 'USD',  // ← CAMBIAR
  // ...
};
```

3. Actualizar `onvopay-create-subscription`, `onvopay-charge-post-payment`, y `onvopay-process-membership-charge` con la misma lógica.

### Fase 2: Corrección de Fecha de Cobro Recurrente (CRÍTICO)

**Archivo**: `supabase/functions/onvopay-create-subscription/index.ts`

```typescript
// Línea ~128-130 - CAMBIAR
// ❌ ANTES:
const nextChargeDate = new Date(appointment.start_time);

// ✅ DESPUÉS:
// El primer cobro ocurre inmediatamente al confirmar
// El siguiente cobro es en X días/semanas desde HOY (fecha de confirmación)
const now = new Date();
const nextChargeDate = calculateNextDate(now, recurrenceType);
```

### Fase 3: Configurar Cron Job (CRÍTICO)

**Acción**: Ejecutar SQL en Supabase Dashboard

```sql
-- Habilitar extensiones si no están activas
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Crear cron job para cobros recurrentes diarios a las 6 AM Costa Rica
SELECT cron.schedule(
  'process-recurring-charges-daily',
  '0 12 * * *',  -- 6 AM Costa Rica = 12 PM UTC
  $$
  SELECT net.http_post(
    url:='https://jckynopecuexfamepmoh.supabase.co/functions/v1/process-recurring-charges',
    headers:=jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    ),
    body:='{}'::jsonb
  );
  $$
);
```

### Fase 4: Parametrizar IVA (RECOMENDADO)

**Archivo**: `supabase/functions/onvopay-authorize/utils.ts`

```typescript
// Agregar configuración de IVA por país/moneda
const IVA_RATES: Record<string, number> = {
  'USD': 0,      // Sin IVA para USD (o ajustar según negocio)
  'CRC': 0.13,   // 13% IVA Costa Rica
};

export function calculateAmounts(totalAmount: number, currency: string = 'USD') {
  const ivaRate = IVA_RATES[currency] || 0;
  const amountCents = Math.round(totalAmount * 100);
  const subtotalCents = Math.round(amountCents / (1 + ivaRate));
  const ivaCents = amountCents - subtotalCents;
  return { amountCents, subtotalCents, ivaCents };
}
```

---

## Resumen de Riesgos y Edge Cases

| Riesgo | Severidad | Estado | Acción |
|--------|-----------|--------|--------|
| Cobro en moneda incorrecta | 🔴 Crítico | Activo | Implementar Fase 1 |
| Cobros recurrentes no se ejecutan | 🔴 Crítico | Activo | Implementar Fase 3 |
| Fecha de cobro incorrecta | 🟠 Alto | Activo | Implementar Fase 2 |
| IVA incorrecto para USD | 🟡 Medio | Potencial | Implementar Fase 4 |
| Cobros duplicados | 🟢 Bajo | Mitigado | Idempotency keys implementadas |
| Fallos de red | 🟢 Bajo | Mitigado | Retry logic con backoff |

---

## Verificación Final

### ✅ Cumple con documentación OnvoPay
- Flujo de 3 pasos: Create → Confirm → Capture
- Uso de payment_method_id para saved cards
- Webhooks para eventos payment.captured/failed

### ✅ Cumple con regla crítica de negocio
- No se cobra sin confirmación del proveedor
- Rechazo no genera transacciones

### ⚠️ Requiere corrección urgente
- Soporte correcto de moneda (USD/CRC)
- Cron job para cobros recurrentes
- Lógica de fechas basada en confirmación
