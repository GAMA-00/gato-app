
# Plan: Corrección de 3 Problemas en OnvoPay Webhook

## Resumen de Correcciones

| # | Problema | Archivo | Corrección |
|---|----------|---------|------------|
| 1 | Falta `currency` en insert de BD | `onvopay-charge-post-payment/index.ts` | Agregar `currency: currency` en línea 244-261 |
| 2 | IVA hardcodeado al 13% | `onvopay-webhook/index.ts` | Obtener currency de suscripción y calcular IVA dinámico en `handleSubscriptionCharged` |
| 3 | Currency hardcodeado 'USD' | `onvopay-webhook/index.ts` | Obtener currency del listing via template en `handleLoopChargeSucceeded` |

---

## Corrección 1: Agregar `currency` en onvopay-charge-post-payment

**Archivo**: `supabase/functions/onvopay-charge-post-payment/index.ts`  
**Líneas**: 242-261

El código ya obtiene `currency` correctamente en línea 133, pero no lo incluye en el insert a la BD.

**Cambio requerido**:
```typescript
// Línea 254 - Agregar currency al insert
.insert({
  appointment_id: invoice.appointment_id,
  client_id: invoice.appointments.client_id,
  provider_id: invoice.appointments.provider_id,
  onvopay_payment_id: onvoResult.id,
  amount: amountCents,
  subtotal: amountCents,
  iva_amount: 0,
  currency: currency,  // ✅ AGREGAR ESTA LÍNEA
  payment_type: 'cash',
  payment_method: 'card',
  status: finalStatus,
  // ...resto igual
})
```

---

## Corrección 2: IVA dinámico en handleSubscriptionCharged

**Archivo**: `supabase/functions/onvopay-webhook/index.ts`  
**Función**: `handleSubscriptionCharged` (líneas 255-391)

**Problema actual** (línea 338):
```typescript
const subtotalAmount = Math.round(amount / 1.13); // ❌ Hardcodeado 13%
```

**Solución**: Agregar helper de IVA y obtener currency del template

```typescript
// 1. Agregar helper de IVA al inicio del archivo (después de corsHeaders)
const IVA_RATES: Record<string, number> = {
  'CRC': 0.13,
  'USD': 0
};

function calculateIvaFromAmount(amount: number, currency: string): { subtotal: number; iva: number } {
  const rate = IVA_RATES[currency] || 0;
  const subtotal = Math.round(amount / (1 + rate));
  return { subtotal, iva: amount - subtotal };
}

// 2. En handleSubscriptionCharged, obtener currency del template y usarlo
const template = subscription.original_appointment_template;
const currency = template?.currency || 'USD'; // Obtener currency del template

// Reemplazar líneas 338-339 con:
const { subtotal: subtotalAmount, iva: ivaAmount } = calculateIvaFromAmount(amount, currency);

// 3. Agregar currency al insert (línea 343-359)
.insert({
  // ...campos existentes
  currency: currency,  // ✅ AGREGAR
  // ...
})
```

---

## Corrección 3: Currency dinámico en handleLoopChargeSucceeded

**Archivo**: `supabase/functions/onvopay-webhook/index.ts`  
**Función**: `handleLoopChargeSucceeded` (líneas 418-568)

**Problema actual** (línea 451):
```typescript
currency: 'USD', // ❌ Hardcodeado
```

**Solución**: Obtener currency del template de la suscripción

```typescript
// En handleLoopChargeSucceeded, después de obtener subscription (línea 434):
const template = subscription.original_appointment_template;
const currency = template?.currency || 'USD';

// Usar helper de IVA para calcular montos
const amountInCurrency = amount / 100; // Convert from cents
const { subtotal: subtotalAmount, iva: ivaAmount } = calculateIvaFromAmount(amountInCurrency, currency);

// Actualizar el insert (línea 442-468):
.insert({
  // ...campos existentes
  amount: amountInCurrency,
  subtotal: subtotalAmount,      // ✅ Calculado dinámicamente
  iva_amount: ivaAmount,         // ✅ Calculado dinámicamente
  currency: currency,            // ✅ Dinámico del template
  // ...
})
```

---

## Cambios Técnicos Detallados

### Archivo 1: `onvopay-charge-post-payment/index.ts`

**Línea 254**: Agregar `currency: currency,` al objeto de insert

### Archivo 2: `onvopay-webhook/index.ts`

1. **Líneas 8-20**: Agregar constante `IVA_RATES` y función helper `calculateIvaFromAmount`

2. **Función `handleSubscriptionCharged`** (líneas 334-359):
   - Obtener currency del template
   - Usar helper para calcular subtotal/IVA
   - Agregar currency al insert

3. **Función `handleLoopChargeSucceeded`** (líneas 436-468):
   - Obtener currency del template
   - Usar helper para calcular subtotal/IVA  
   - Actualizar currency dinámico

---

## Verificación Post-Implementación

Después de aplicar los cambios:

1. Deploy automático de Edge Functions
2. Verificar logs de funciones en Supabase Dashboard
3. Probar con una suscripción existente (si hay datos de prueba)

---

## Riesgos Mitigados

| Riesgo | Mitigación |
|--------|------------|
| Template sin currency | Fallback a 'USD' |
| IVA incorrecto | Helper centralizado con rates por moneda |
| Datos históricos | Los nuevos cálculos solo afectan registros futuros |
