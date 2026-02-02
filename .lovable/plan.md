
# Plan: Corregir integración de clientes con OnvoPay

## Problema identificado

Después de analizar el código y los logs, encontré dos problemas:

1. **El campo `customer` en `types.ts`**: Aunque ya revertimos el código en `index.ts`, la interfaz `OnvoPaymentIntentData` aún tiene el campo `customer`. Esto no causa el error actual, pero debe limpiarse por consistencia.

2. **Método HTTP incorrecto para actualizar clientes**: En `customer.ts` línea 66, se usa `PATCH` para actualizar el nombre del cliente, pero según la documentación oficial de OnvoPay, el método correcto es `POST`:
   - **Actual**: `method: 'PATCH'`
   - **Documentación**: `post /v1/customers/{id}`
   
   Este es el motivo del log: `⚠️ Failed to update customer name in OnvoPay (404)`

## Solución

### 1. Limpiar la interfaz OnvoPaymentIntentData

**Archivo: `supabase/functions/onvopay-authorize/types.ts`**

Eliminar el campo `customer` ya que OnvoPay no lo acepta en payment intents:

```typescript
export interface OnvoPaymentIntentData {
  amount: number;
  currency: string;
  description: string;
  // Removido: customer?: string;  <- OnvoPay no acepta este campo
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

### 2. Corregir método HTTP para actualizar clientes

**Archivo: `supabase/functions/onvopay-authorize/customer.ts`**

Cambiar el método de `PATCH` a `POST` según la documentación de OnvoPay:

```typescript
// Línea 66: Cambiar de PATCH a POST
const updateResponse = await fetch(updateUrl, {
  method: 'POST',  // Antes: 'PATCH'
  headers: {
    'Authorization': `Bearer ${secretKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ name: currentName })
});
```

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `supabase/functions/onvopay-authorize/types.ts` | Eliminar campo `customer` de la interfaz |
| `supabase/functions/onvopay-authorize/customer.ts` | Cambiar `PATCH` a `POST` en línea 66 |

## Resultado esperado

- Los pagos se procesarán correctamente sin el campo `customer` en el root del payment intent
- La actualización del nombre del cliente funcionará correctamente usando `POST`
- Los clientes existentes se sincronizarán con sus nombres actuales en OnvoPay

## Nota importante

Según la documentación de OnvoPay que compartiste:
- Los clientes se crean/actualizan mediante el endpoint `/v1/customers` 
- Los payment intents **no aceptan** el campo `customer` a nivel raíz
- El nombre del cliente se muestra en el dashboard de OnvoPay **a través del objeto Customer**, no del payment intent
- Por lo tanto, es crucial que la sincronización de clientes funcione correctamente
