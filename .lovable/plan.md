
# Plan: Corregir la Asociación de Cliente en Transacciones OnvoPay

## Problema Identificado

En el dashboard de OnvoPay, la columna "CLIENTE" muestra "--" en lugar del nombre del cliente. Esto ocurre porque:

1. **El campo `customer` no se está enviando al crear el Payment Intent** - Solo se está enviando el `customer_name` y `onvopay_customer_id` dentro de `metadata`, pero OnvoPay requiere el campo `customer` a nivel raíz del objeto para asociar la transacción con el cliente.

2. **El nombre del cliente en OnvoPay está desactualizado** - El cliente `572b3e62-43ae-45fd-8c50-89e085dfcac6` tiene `name: "Andrei"` en la tabla `users`, pero en `onvopay_customers` aparece como `name: "Cliente"`.

## Solución

### 1. Agregar campo `customer` al Payment Intent

Modificar la creación del payment intent para incluir el campo `customer` a nivel superior:

**Archivo: `supabase/functions/onvopay-authorize/types.ts`**
- Agregar campo opcional `customer?: string` a la interfaz `OnvoPaymentIntentData`

**Archivo: `supabase/functions/onvopay-authorize/index.ts`**
- Modificar `paymentIntentData` para incluir `customer: customerId` cuando esté disponible

```typescript
// ANTES (líneas 285-297)
const paymentIntentData = {
  amount: amountCents,
  currency: currency,
  description: description,
  metadata: {
    // ... sin customer a nivel raíz
  }
};

// DESPUÉS
const paymentIntentData = {
  amount: amountCents,
  currency: currency,
  description: description,
  ...(customerId && { customer: customerId }),  // ← Nuevo: asociar cliente
  metadata: {
    // ...
  }
};
```

### 2. Sincronizar nombre del cliente existente

El cliente ya existe en OnvoPay con nombre "Cliente" pero debería ser "Andrei". Ya existe lógica de sincronización en `customer.ts` (líneas 59-94) que actualiza el nombre cuando detecta un cambio, pero debemos asegurar que se ejecute correctamente.

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `supabase/functions/onvopay-authorize/types.ts` | Agregar `customer?: string` a `OnvoPaymentIntentData` |
| `supabase/functions/onvopay-authorize/index.ts` | Incluir `customer: customerId` en `paymentIntentData` |

## Resultado Esperado

- Las nuevas transacciones en OnvoPay mostrarán el nombre del cliente correctamente
- Los clientes existentes se actualizarán la próxima vez que se procese un pago (la sincronización ya existe)
- El dashboard de OnvoPay mostrará el nombre en la columna "CLIENTE" en lugar de "--"

## Nota Técnica

La API de OnvoPay sigue un patrón similar a Stripe, donde el campo `customer` debe ser el ID del customer object a nivel raíz del payment intent para que la transacción quede asociada al cliente en el dashboard.
