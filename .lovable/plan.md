
# Auditoría Completa del Sistema de Pagos OnvoPay

## Estado de Implementación

| Fase | Descripción | Estado |
|------|-------------|--------|
| Fase 1 | Corrección de Moneda Dinámica (USD/CRC) | ✅ COMPLETADO |
| Fase 2 | Corrección de Fecha de Cobro Recurrente | ✅ COMPLETADO |
| Fase 3 | Configurar Cron Job | ⏳ PENDIENTE (requiere ejecución manual) |
| Fase 4 | Parametrizar IVA por Moneda | ✅ COMPLETADO |

---

## ✅ Cambios Implementados

### 1. Moneda Dinámica (Fase 1)

**Archivos modificados:**
- `onvopay-authorize/index.ts` - Obtiene `currency` del listing y lo usa en Payment Intent
- `onvopay-create-subscription/index.ts` - Usa currency dinámico en subscripciones
- `onvopay-charge-post-payment/index.ts` - Usa currency del listing para cobros post-servicio

**Lógica implementada:**
```typescript
// 1. Query incluye currency del listing
const { data: appointment } = await supabase
  .from('appointments')
  .select('..., listings(currency)')
  .single();

// 2. Validación de moneda soportada
const currency = appointment.listings?.currency || 'USD';
if (!['USD', 'CRC'].includes(currency)) {
  throw new Error('Moneda no soportada');
}

// 3. Uso dinámico en Payment Intent
const paymentIntentData = {
  amount: amountCents,
  currency: currency,  // ✅ Dinámico
  // ...
};
```

### 2. Fecha de Cobro Recurrente (Fase 2)

**Archivo modificado:** `onvopay-create-subscription/index.ts`

**Cambio:**
```typescript
// ❌ ANTES: Basado en fecha del servicio
const nextChargeDate = new Date(appointment.start_time);

// ✅ DESPUÉS: Basado en fecha de confirmación
const now = new Date();
const nextChargeDate = calculateNextChargeDate(now, recurrenceType);
```

**Nueva función `calculateNextChargeDate`:**
- Calcula la próxima fecha de cobro según el tipo de recurrencia
- Soporta: daily, weekly, biweekly, triweekly, monthly

### 3. IVA Parametrizado (Fase 4)

**Archivo modificado:** `onvopay-authorize/utils.ts`

**Cambio:**
```typescript
const IVA_RATES: Record<string, number> = {
  'CRC': 0.13,  // 13% IVA Costa Rica
  'USD': 0,     // Sin IVA para USD
};

export function calculateAmounts(totalAmount: number, currency: string = 'USD') {
  const ivaRate = IVA_RATES[currency] || 0;
  // ...
}
```

---

## ⏳ Fase 3: Configurar Cron Job (PENDIENTE)

**Acción requerida:** Ejecutar el siguiente SQL en [Supabase SQL Editor](https://supabase.com/dashboard/project/jckynopecuexfamepmoh/sql/new)

```sql
-- 1. Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Crear cron job para cobros recurrentes diarios a las 6 AM Costa Rica (12 PM UTC)
SELECT cron.schedule(
  'process-recurring-charges-daily',
  '0 12 * * *',
  $$
  SELECT net.http_post(
    url:='https://jckynopecuexfamepmoh.supabase.co/functions/v1/process-recurring-charges',
    headers:=jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impja3lub3BlY3VleGZhbWVwbW9oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTQzNDU4MCwiZXhwIjoyMDYxMDEwNTgwfQ.YOUR_SERVICE_ROLE_KEY'
    ),
    body:='{}'::jsonb
  );
  $$
);

-- 3. Verificar que el job fue creado
SELECT * FROM cron.job;
```

**Nota:** Reemplaza `YOUR_SERVICE_ROLE_KEY` con tu Service Role Key real de Supabase.

---

## Resumen de Riesgos Mitigados

| Riesgo | Severidad | Estado |
|--------|-----------|--------|
| Cobro en moneda incorrecta | 🔴 Crítico | ✅ RESUELTO |
| Fecha de cobro incorrecta | 🟠 Alto | ✅ RESUELTO |
| IVA incorrecto para USD | 🟡 Medio | ✅ RESUELTO |
| Cobros recurrentes no se ejecutan | 🔴 Crítico | ⏳ Requiere SQL manual |

---

## Verificación Final

### ✅ Cumple con documentación OnvoPay
- Flujo de 3 pasos: Create → Confirm → Capture
- Uso de payment_method_id para saved cards
- Webhooks para eventos payment.captured/failed

### ✅ Cumple con regla crítica de negocio
- No se cobra sin confirmación del proveedor
- Rechazo no genera transacciones

### ✅ Soporte correcto de moneda (USD/CRC)
- Currency obtenido dinámicamente del listing
- Validación de monedas soportadas
- IVA calculado según moneda (13% CRC, 0% USD)

### ⏳ Pendiente
- Ejecutar SQL para configurar cron job
