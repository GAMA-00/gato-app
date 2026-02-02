
# Plan: Corregir Headers CORS en Edge Functions de OnvoPay

## Diagnóstico del Problema

El error de consola muestra claramente:
```
Access to fetch at 'https://jckynopecuexfamepmoh.supabase.co/functions/v1/onvopay-authorize' 
from origin 'https://d441b09c-5b37-4117-9726-bc80bbe1b056.lovableproject.com' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

### Causa Raíz

Los headers CORS en las Edge Functions están **incompletos**. Actualmente tienen:

```typescript
'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
```

Pero el cliente Supabase envía headers adicionales que no están permitidos:
- `x-supabase-client-platform`
- `x-supabase-client-platform-version`
- `x-supabase-client-runtime`
- `x-supabase-client-runtime-version`

Cuando el navegador hace la solicitud preflight (OPTIONS) y estos headers no están en `Access-Control-Allow-Headers`, el navegador bloquea la solicitud principal.

## Solución

Actualizar los headers CORS en todas las Edge Functions de OnvoPay para incluir los headers requeridos.

### Headers CORS Correctos

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
```

## Archivos a Modificar

| Archivo | Ubicación del cambio |
|---------|---------------------|
| `supabase/functions/onvopay-authorize/config.ts` | Líneas 11-15 |
| `supabase/functions/onvopay-confirm/index.ts` | Líneas 4-7 |
| `supabase/functions/onvopay-capture-on-provider-accept/index.ts` | Líneas 4-7 |
| `supabase/functions/onvopay-charge-post-payment/index.ts` | Líneas 4-7 |
| `supabase/functions/onvopay-initiate-recurring/index.ts` | Headers CORS |
| `supabase/functions/onvopay-create-payment-method/index.ts` | Headers CORS |

## Cambios Específicos

### 1. `onvopay-authorize/config.ts`

```typescript
// ANTES (líneas 11-15)
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// DESPUÉS
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
```

### 2. `onvopay-confirm/index.ts`

```typescript
// ANTES (líneas 4-7)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// DESPUÉS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
```

### 3. Patrón similar para las demás funciones

Aplicar el mismo cambio a:
- `onvopay-capture-on-provider-accept/index.ts`
- `onvopay-charge-post-payment/index.ts`
- `onvopay-initiate-recurring/index.ts`
- `onvopay-create-payment-method/index.ts`
- Cualquier otra función que sea llamada desde el frontend

## Resultado Esperado

1. Las solicitudes desde el frontend pasarán la validación CORS
2. Los pagos se procesarán correctamente
3. Los clientes se crearán/actualizarán en OnvoPay
4. Las transacciones estarán vinculadas a los clientes (usando el `customerId` que ya implementamos)

## Nota sobre Vinculación de Clientes

La corrección anterior de incluir `customerId` en la confirmación del pago sigue siendo válida y funcionará una vez que el error CORS se resuelva. El flujo completo será:

```text
1. Cliente inicia pago → onvopay-authorize
2. Se crea/obtiene customerId → ensureOnvoCustomer
3. Se crea Payment Intent → createPaymentIntent
4. Cliente confirma → onvopay-confirm (con customerId)
5. Transacción queda vinculada al cliente en OnvoPay
```
