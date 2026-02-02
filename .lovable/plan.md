
# Plan: Asociar Cliente a Transacciones en OnvoPay

## Diagnóstico Completo

El dashboard de OnvoPay muestra "No hay detalles" en el campo Cliente porque las transacciones no están vinculadas al objeto Customer. Después de analizar el código y la documentación:

### Hallazgos Clave

1. **Los clientes SÍ se crean correctamente** en OnvoPay - La función `ensureOnvoCustomer` funciona y sincroniza nombres.

2. **El problema está en la confirmación del pago** - OnvoPay requiere que el `customerId` se envíe en el momento de confirmar el Payment Intent para vincular la transacción al cliente.

3. **Actualmente NO se envía** - En todas las funciones de confirmación (`onvopay-confirm`, `onvopay-capture-on-provider-accept`, `onvopay-charge-post-payment`), solo se envía `paymentMethodId`.

### Evidencia en Código

```typescript
// onvopay-confirm/index.ts (línea 271)
const confirmData: Record<string, any> = { paymentMethodId };
// ❌ Falta: customerId para vincular al cliente
```

```typescript  
// onvopay-capture-on-provider-accept/index.ts (línea 218)
body: JSON.stringify({
  paymentMethodId: paymentMethodId
})
// ❌ Falta: customerId
```

```typescript
// onvopay-charge-post-payment/index.ts (línea 186)
body: JSON.stringify({
  paymentMethodId: savedMethod.onvopay_payment_method_id
})
// ❌ Falta: customerId
```

## Solución Propuesta

Agregar `customerId` al payload de confirmación en todas las funciones que confirman pagos con OnvoPay.

### Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `supabase/functions/onvopay-confirm/index.ts` | Obtener `onvopay_customer_id` y enviarlo en confirmación |
| `supabase/functions/onvopay-capture-on-provider-accept/index.ts` | Agregar `customerId` al confirmar |
| `supabase/functions/onvopay-charge-post-payment/index.ts` | Agregar `customerId` al confirmar |

### Cambios Detallados

#### 1. `onvopay-confirm/index.ts`

Antes de la línea 271, obtener el customer mapping:

```typescript
// Obtener customerId del mapeo de clientes
const { data: customerMapping } = await supabase
  .from('onvopay_customers')
  .select('onvopay_customer_id')
  .eq('client_id', payment.client_id)
  .maybeSingle();

const customerId = customerMapping?.onvopay_customer_id;
console.log('👤 OnvoPay Customer ID para vinculación:', customerId || 'none');

// Confirmar con paymentMethodId Y customerId
const confirmData: Record<string, any> = { 
  paymentMethodId,
  ...(customerId && { customerId }) // ← Nuevo: vincular cliente
};
```

#### 2. `onvopay-capture-on-provider-accept/index.ts`

Antes de la línea 199, obtener customer mapping y agregarlo al confirm:

```typescript
// Obtener customerId del mapeo
const { data: customerMapping } = await supabaseAdmin
  .from('onvopay_customers')
  .select('onvopay_customer_id')
  .eq('client_id', payment.client_id)
  .maybeSingle();

const customerId = customerMapping?.onvopay_customer_id;
console.log('👤 Customer ID para vinculación:', customerId || 'none');

// Confirmar incluyendo customerId
body: JSON.stringify({
  paymentMethodId: paymentMethodId,
  ...(customerId && { customerId })
})
```

#### 3. `onvopay-charge-post-payment/index.ts`

En la línea 186, agregar customerId que ya está disponible (línea 130):

```typescript
body: JSON.stringify({
  paymentMethodId: savedMethod.onvopay_payment_method_id,
  ...(customerId && { customerId }) // ← customerId ya existe en scope
})
```

## Resultado Esperado

1. Todas las transacciones futuras quedarán vinculadas al Customer en OnvoPay
2. El dashboard de OnvoPay mostrará el nombre del cliente en cada transacción
3. El nombre mostrado será el sincronizado desde la base de datos (ej: "Andrei", "Vicente")

## Notas Técnicas

- El campo `customerId` en camelCase es el formato esperado por la API de OnvoPay
- La asociación ocurre en el momento de `/confirm`, no en la creación del Payment Intent
- Las transacciones ya existentes no se actualizarán automáticamente (solo afecta transacciones futuras)
