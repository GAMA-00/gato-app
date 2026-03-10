

## Diagnostico: Pagos con tarjetas reales fallan con error 400

### Causa raiz confirmada

Los logs de la Edge Function `onvopay-create-payment-method` muestran el error exacto:

```
payment_methods.invalid_test_payment_method
"The provided payment method is not part of the testing payment methods available for Test mode."
```

**El `ONVOPAY_SECRET_KEY` configurado en Supabase es una clave de modo TEST/sandbox.** Cuando se usa una tarjeta real, OnvoPay la rechaza porque el modo test solo acepta tarjetas de prueba.

No hay un bug en el codigo. El flujo funciona correctamente: la tokenizacion, creacion de payment method y el charge estan bien implementados. El problema es exclusivamente de configuracion de credenciales.

### Solucion

1. **Obtener las credenciales de produccion (live) desde el dashboard de OnvoPay** — tipicamente tendran un prefijo diferente al de test (por ejemplo `sk_live_...` en vez de `sk_test_...`).

2. **Actualizar el secret `ONVOPAY_SECRET_KEY`** en Supabase con la clave de produccion.

3. **Verificar `ONVOPAY_API_BASE`** — actualmente el codigo usa `https://api.onvopay.com` como default, que es el endpoint de produccion. Si existe un secret `ONVOPAY_API_BASE` configurado apuntando a sandbox, tambien debe actualizarse.

### Accion requerida del usuario

Necesito que me confirmes:

- Tienes acceso a las credenciales de produccion (live) de OnvoPay?
- Quieres que actualice el secret `ONVOPAY_SECRET_KEY` con la clave de produccion? (tendras que proporcionarla)

No se requieren cambios en el codigo. Una vez actualizadas las credenciales, los pagos con tarjetas reales funcionaran.

### Nota sobre consistencia de entornos

Revise todas las Edge Functions y la mayoria usan `ONVOPAY_SECRET_KEY` + `ONVOPAY_API_BASE` (default `https://api.onvopay.com`). Algunas funciones como `onvopay-capture` tienen logica dual (test/live), pero la funcion de tokenizacion usa una sola clave. Al cambiar a produccion, todos los flujos usaran el entorno correcto.

