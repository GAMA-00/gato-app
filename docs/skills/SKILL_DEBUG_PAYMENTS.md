# 🛠️ Skill: Debugging de Pagos OnvoPay

> ⚠️ **Concepto v1:** OnvoPay sigue presente en el backend pero **NO se expone en el
> flujo v1** ("sin pagos en v1", ver `docs/CONCEPTO_V1.md` §3). El booking link nuevo
> **no debe** disparar ninguna edge function de pago. Esta skill aplica al código
> legacy y a cuando se reactiven los pagos (suscripción Gato Pro / cobros).

## Contexto

Esta skill te ayuda a diagnosticar y resolver problemas con pagos en OnvoPay.

---

## Herramientas de Diagnóstico

### 1. Verificar estado del pago en DB

```sql
-- Buscar pago por appointment_id
SELECT 
  op.id,
  op.status,
  op.amount,
  op.onvopay_payment_id,
  op.created_at,
  op.authorized_at,
  op.captured_at,
  op.failed_at,
  op.error_details
FROM onvopay_payments op
WHERE op.appointment_id = 'UUID_AQUI';
```

### 2. Verificar webhooks recibidos

```sql
-- Ver webhooks relacionados a un pago
SELECT 
  ow.event_type,
  ow.processed,
  ow.received_at,
  ow.processing_result,
  ow.error_details
FROM onvopay_webhooks ow
WHERE ow.payment_id = 'UUID_PAGO';
```

### 3. Verificar appointment

```sql
SELECT 
  a.id,
  a.status,
  a.onvopay_payment_id,
  a.start_time,
  a.client_id,
  a.provider_id
FROM appointments a
WHERE a.id = 'UUID_APPOINTMENT';
```

---

## Problemas Comunes

### 1. Pago stuck en `pending_authorization`

**Síntomas:**
- El pago aparece como `pending_authorization`
- La cita no se confirma

**Diagnóstico:**
```sql
SELECT * FROM onvopay_payments 
WHERE status = 'pending_authorization' 
AND created_at < NOW() - INTERVAL '30 minutes';
```

**Solución:**
- Si 3DS falló: el cliente debe reintentar
- Si timeout: verificar webhooks perdidos

### 2. Pago `authorized` pero no capturado

**Síntomas:**
- Status es `authorized`
- Proveedor ya aceptó la cita

**Diagnóstico:**
```sql
SELECT 
  op.id,
  op.status,
  a.status as appointment_status
FROM onvopay_payments op
JOIN appointments a ON a.onvopay_payment_id = op.id
WHERE op.status = 'authorized'
AND a.status = 'confirmed';
```

**Solución:**
Ejecutar captura manual:
```sql
-- docs/fix-stuck-payment.sql
-- Ver archivo para query completo
```

### 3. Webhook no procesado

**Síntomas:**
- Webhook recibido pero `processed = false`

**Diagnóstico:**
```sql
SELECT * FROM onvopay_webhooks 
WHERE processed = false 
ORDER BY received_at DESC 
LIMIT 10;
```

**Solución:**
- Revisar `error_details` del webhook
- Reprocesar manualmente si es necesario

---

## Edge Function Logs

### Ver logs de autorización

```typescript
// Buscar en logs de onvopay-authorize
// Filtrar por appointmentId o requestId
```

### Ver logs de captura

```typescript
// Buscar en logs de onvopay-capture
// o onvopay-capture-on-provider-accept
```

---

## Estados de Pago

| Estado | Descripción | Siguiente Paso |
|--------|-------------|----------------|
| `pending` | Recién creado | Esperar autorización |
| `pending_authorization` | En proceso 3DS | Usuario completa 3DS |
| `authorized` | Autorizado, no capturado | Proveedor acepta → captura |
| `captured` | Dinero capturado | ✅ Completado |
| `failed` | Falló | Ver error_details |
| `cancelled` | Cancelado | - |

---

## Runbook de Emergencia

### Cliente reporta "pago duplicado"

1. Verificar en DB cuántos pagos existen
2. Verificar estado de cada pago
3. Si hay duplicados captured, escalar a soporte OnvoPay

### Proveedor no recibe pago

1. Verificar estado del pago (¿captured?)
2. Verificar que la cita esté `confirmed` o `completed`
3. Revisar proceso de payout (externo a la app)

### Sistema caído de OnvoPay

1. Verificar health check
2. Activar modo bypass si está configurado
3. Comunicar a usuarios que intenten más tarde

---

## Queries Útiles

```sql
-- Pagos del día
SELECT COUNT(*), status 
FROM onvopay_payments 
WHERE created_at > CURRENT_DATE 
GROUP BY status;

-- Pagos fallidos recientes
SELECT * FROM onvopay_payments 
WHERE status = 'failed' 
AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Revenue del mes
SELECT SUM(amount) as total
FROM onvopay_payments
WHERE status = 'captured'
AND captured_at >= DATE_TRUNC('month', CURRENT_DATE);
```

---

## Checklist de Debug

- [ ] Verificar estado en `onvopay_payments`
- [ ] Verificar webhooks relacionados
- [ ] Verificar estado de appointment
- [ ] Revisar logs de Edge Functions
- [ ] Verificar si OnvoPay está operacional
