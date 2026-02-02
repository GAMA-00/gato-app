
## Qué está pasando (diagnóstico con evidencia)

En `/client/results?serviceId=...` el frontend sí encuentra `listings` activos (en DB hay **1 listing activo** para ese `service_type_id`), pero la consulta a `provider_public_profiles` devuelve **[]**, por eso el contador queda en 0 y aparece “No se encontraron profesionales”.

Evidencia clave (desde red del navegador):
- `GET /rest/v1/provider_public_profiles?...&id=in.(bf15...)` → **200** pero **Response Body: []**

Causa raíz:
- La vista `public.provider_public_profiles` fue recreada con:
  - `WITH (security_invoker = true)` (confirmado en `supabase/migrations/20251111165357_...sql` y `pg_class.reloptions`)
- Con `security_invoker=true`, la vista **respeta las políticas RLS** de la tabla base `public.users`.
- Como la RLS de `public.users` quedó endurecida (solo “yo mismo” o admin), cuando un cliente intenta leer perfiles de proveedores a través de la vista, Postgres filtra y retorna **0 filas**.

Importante de seguridad:
- NO debemos “abrir” `users` para que sea legible públicamente (porque permitir SELECT sobre `users` expone todas las columnas de esas filas, incluyendo potencialmente PII como email/teléfono). La solución debe mantener `users` cerrada.

---

## Objetivo

Restaurar la visibilidad de los perfiles públicos de proveedores para el cliente (nombre/avatar/about/rating/etc.) sin relajar RLS de la tabla `users`.

---

## Solución (la correcta y segura)

### Cambio 1 (DB, crítico): Re-crear `provider_public_profiles` como SECURITY DEFINER (no invoker)

Crear una nueva migración que:
1) `DROP VIEW IF EXISTS public.provider_public_profiles;`
2) `CREATE VIEW public.provider_public_profiles WITH (security_invoker = false) AS ... FROM public.users ... WHERE u.role='provider'`
3) `GRANT SELECT ON public.provider_public_profiles TO anon, authenticated;`

Efecto:
- La vista correrá con privilegios del “dueño” de la vista (rol de migración/admin), que típicamente **bypassea RLS** en Supabase (a menos que exista `FORCE ROW LEVEL SECURITY`).
- El cliente seguirá viendo únicamente **las columnas seleccionadas** por la vista (no email/teléfono), manteniendo seguridad.

#### SQL propuesto (para la migración)
```sql
-- 2026xxxxxx_fix_provider_public_profiles.sql

DROP VIEW IF EXISTS public.provider_public_profiles;

CREATE VIEW public.provider_public_profiles
WITH (security_invoker = false)
AS
SELECT
  u.id,
  u.name,
  u.avatar_url,
  u.about_me,
  u.experience_years,
  u.certification_files,
  COALESCE(
    (SELECT AVG(r.rating)::numeric(3,2)
     FROM public.provider_ratings r
     WHERE r.provider_id = u.id),
    0
  ) AS average_rating,
  u.created_at
FROM public.users u
WHERE u.role = 'provider';

GRANT SELECT ON public.provider_public_profiles TO anon, authenticated;
```

#### Nota de edge case
Si `public.users` tuviera `ALTER TABLE ... FORCE ROW LEVEL SECURITY`, incluso el owner puede quedar sujeto a RLS y la vista no “rompería” el bloqueo. En ese caso, la alternativa segura sería:
- Crear una tabla “public_provider_profiles” (solo campos públicos) alimentada por triggers, con RLS `USING (true)` y sin PII.
Pero primero intentamos el fix simple (en Supabase usualmente funciona).

---

## Solución complementaria (evitar futuros “0 proveedores” en otras pantallas)

Aunque arreglando la vista se corrige **esta** pantalla (`/client/results`), hay otras partes del frontend que aún consultan `users` (o hacen joins `users!listings_provider_id_fkey`) y pueden fallar igual con la RLS actual (por ejemplo: listados recomendados, detalle de servicio, booking, etc.).

### Cambio 2 (Frontend, recomendado): sustituir lecturas de `users` por `provider_public_profiles` donde sea “client-facing”
Actualizar estos puntos:
- `src/services/listingService.ts`
  - `getActiveListingsWithProvider`: dejar de hacer join a `users!listings_provider_id_fkey` y en su lugar:
    1) traer listings (con provider_id)
    2) traer providers desde `provider_public_profiles` por `in(id, providerIds)`
    3) mapear al formato que usa la UI
  - `getListingById`: mismo patrón (evitar join a `users`)
- `src/hooks/useRecommendedListings.ts`: cambiar `.from('users')` → `.from('provider_public_profiles')`
- `src/components/client/service/useServiceDetail.ts`: reemplazar lecturas de provider desde `users` por `provider_public_profiles` para campos públicos.
  - Si el UI realmente necesita teléfono/email del proveedor, propondremos un mecanismo explícito y seguro (por ejemplo: tabla/vista pública “provider_contact_public” solo con campos opt-in, o edge function con control de acceso). No abrir `users`.

Esto evita que otras rutas “se rompan” por el mismo endurecimiento de RLS.

---

## Verificación (pasos concretos)

1) Aplicar migración en **Test** (preview):
   - Navegar a: `/client/results?serviceId=75492440-e8df-4559-b442-1bae3fcbb631&categoryName=Mascotas`
   - Verificar que:
     - `provider_public_profiles` ya devuelve filas (en red ya no debe ser `[]`)
     - `Profesionales Disponibles: X` muestre `X > 0`
     - Aparezca al menos la tarjeta del provider (Vicente)
2) Revisar otras pantallas clave:
   - Home (recomendados)
   - Detalle de servicio
   - Flujo de booking
3) Si todo está OK, **Publicar** para llevarlo a Live.

---

## Entregables cuando implementemos (en modo ejecución)

- 1 nueva migración SQL que re-crea la vista con `security_invoker=false`
- Ajustes en los módulos client-facing que aún leen `users`/joins a `users` (fase recomendada, para evitar regresiones)
- Prueba end-to-end de navegación categoría → results → seleccionar proveedor → detalle → booking

