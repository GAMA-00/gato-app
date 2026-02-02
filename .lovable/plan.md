

# Plan: Corregir Vinculación de Cliente y Transiciones de Estado en OnvoPay

## Problema Identificado

Los logs muestran claramente el error:
```
"message": [ "property customerId should not exist" ]
"path": "/v1/payment-intents/.../confirm"
```

**OnvoPay rechaza el `customerId` en el endpoint `/confirm`**. Esta es la causa por la que:
1. Las transacciones fallan al confirmar
2. El estado permanece en "Iniciado" en lugar de cambiar a "Exitoso"

## Análisis del Flujo Actual

```text
1. onvopay-authorize
   └─ Crea Payment Intent (sin customer vinculado al PI)
   └─ Guarda customerId solo en metadata
   
2. onvopay-confirm / onvopay-capture-on-provider-accept
   └─ Intenta enviar customerId al /confirm  ← ❌ ERROR AQUÍ
   └─ OnvoPay rechaza: "property customerId should not exist"
   └─ Estado permanece en "pending_authorization"
```

## Solución Propuesta

Según la documentación de OnvoPay, el cliente debe vincularse al crear el Payment Intent, no al confirmarlo. Los Payment Intents de OnvoPay aceptan un campo `customer` durante la creación.

### Cambios Necesarios

| Archivo | Cambio |
|---------|--------|
| `supabase/functions/onvopay-authorize/payment.ts` | Agregar campo `customer` al crear Payment Intent |
| `supabase/functions/onvopay-authorize/types.ts` | Agregar campo `customer?: string` a la interfaz |
| `supabase/functions/onvopay-authorize/index.ts` | Pasar `customerId` como `customer` en el payload |
| `supabase/functions/onvopay-confirm/index.ts` | **REMOVER** `customerId` del payload de confirm |
| `supabase/functions/onvopay-capture-on-provider-accept/index.ts` | **REMOVER** `customerId` del payload de confirm |
| `supabase/functions/onvopay-charge-post-payment/index.ts` | **REMOVER** `customerId` del payload de confirm |
| `src/components/dashboard/AppointmentList.tsx` | Usar hook centralizado para capturar pagos |

### Cambios Detallados

#### 1. `onvopay-authorize/types.ts` - Agregar campo `customer`

```typescript
export interface OnvoPaymentIntentData {
  amount: number;
  currency: string;
  description: string;
  customer?: string;  // ← NUEVO: ID del cliente en OnvoPay
  metadata: {
    appointment_id: string;
    client_id: string;
    provider_id: string;
    is_post_payment: string;
    customer_name?: string;
    onvopay_customer_id?: string;
  };
}
```

#### 2. `onvopay-authorize/index.ts` - Incluir customer en Payment Intent

```typescript
const paymentIntentData = {
  amount: amountCents,
  currency: currency,
  description: description,
  ...(customerId && { customer: customerId }), // ← NUEVO: Vincular cliente
  metadata: {
    appointment_id: body.appointmentId,
    // ... resto de metadata
  }
};
```

#### 3. `onvopay-confirm/index.ts` - REMOVER customerId

```typescript
// ANTES (línea 283-286)
const confirmData: Record<string, any> = { 
  paymentMethodId,
  ...(customerId && { customerId }) // ← REMOVER ESTO
};

// DESPUÉS
const confirmData: Record<string, any> = { 
  paymentMethodId  // Solo paymentMethodId, sin customerId
};
```

#### 4. `onvopay-capture-on-provider-accept/index.ts` - REMOVER customerId

```typescript
// ANTES (líneas 230-233)
body: JSON.stringify({
  paymentMethodId: paymentMethodId,
  ...(customerId && { customerId }) // ← REMOVER ESTO
})

// DESPUÉS
body: JSON.stringify({
  paymentMethodId: paymentMethodId
})
```

También remover las líneas 200-208 que obtienen el customerId antes de confirmar (ya no se necesita).

#### 5. `onvopay-charge-post-payment/index.ts` - REMOVER customerId

Similar al anterior, remover el `customerId` del payload de confirm.

#### 6. `AppointmentList.tsx` - Usar hook centralizado

Reemplazar la lógica local por el hook `useRequestActions` que sí invoca la captura de pagos:

```typescript
import { useRequestActions } from '@/hooks/useRequestActions';

// En el componente:
const { handleAccept, handleDecline, isLoading } = useRequestActions();

// Usar handleAccept en lugar de handleAcceptAppointment local
```

## Flujo Corregido

```text
1. onvopay-authorize
   └─ Crea Payment Intent CON customer vinculado  ← ✅ FIX
   
2. onvopay-confirm / capture-on-provider-accept
   └─ Confirma solo con paymentMethodId  ← ✅ FIX
   └─ Estado cambia a "authorized" → "captured"
   └─ Dashboard OnvoPay muestra cliente correctamente
```

## Resultado Esperado

1. Las transacciones se procesarán correctamente
2. El estado cambiará de "Iniciado" a "Exitoso" cuando el proveedor acepte
3. El nombre del cliente aparecerá en el dashboard de OnvoPay
4. El flujo será consistente desde cualquier vista del dashboard

## Archivos a Modificar (Resumen)

1. `supabase/functions/onvopay-authorize/types.ts` - Agregar campo `customer`
2. `supabase/functions/onvopay-authorize/index.ts` - Incluir `customer` en creación de PI
3. `supabase/functions/onvopay-confirm/index.ts` - Remover `customerId` de confirm
4. `supabase/functions/onvopay-capture-on-provider-accept/index.ts` - Remover `customerId` de confirm
5. `supabase/functions/onvopay-charge-post-payment/index.ts` - Remover `customerId` de confirm
6. `src/components/dashboard/AppointmentList.tsx` - Usar hook centralizado

