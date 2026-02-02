
# Plan: Corrección Crítica - Error en Pantalla de Detalle del Servicio

## Diagnóstico del Problema

### Síntoma
Al hacer clic en "Ver detalles" desde la lista de proveedores, la pantalla de detalle muestra: **"No se pudo cargar la información del servicio"**

### Causa Raíz
El hook `useServiceDetail.ts` y otros hooks relacionados consultan directamente la tabla `users`, la cual tiene políticas RLS restrictivas que impiden a los clientes ver perfiles de proveedores:

```sql
-- Política actual de SELECT en users (muy restrictiva)
qual: (has_role(auth.uid(), 'admin') OR (auth.uid() = id))
```

Esto significa que un cliente autenticado **solo puede ver su propio perfil**, bloqueando cualquier consulta a datos de proveedores.

### Archivos Afectados

| Archivo | Líneas | Problema |
|---------|--------|----------|
| `src/components/client/service/useServiceDetail.ts` | 71-87, 102-117 | Consulta `users` para obtener datos del proveedor |
| `src/hooks/useProviderMerits.ts` | 47-51 | Consulta `users.average_rating` |
| `src/hooks/useProviderServiceMerits.ts` | 54-58 | Consulta `users.average_rating` |

---

## Solución

### Cambio Principal: Usar `provider_public_profiles` en todos los hooks client-facing

La vista `provider_public_profiles` ya existe y contiene todos los campos públicos necesarios:
- `id`, `name`, `avatar_url`, `about_me`, `experience_years`, `certification_files`, `average_rating`, `created_at`

Esta vista fue configurada con `security_invoker = false` (Security Definer), lo que permite acceso sin restricciones RLS.

---

## Cambios Técnicos Detallados

### Cambio 1: `useServiceDetail.ts` (Crítico)

**Reemplazar** las consultas a `users` (líneas 71-87 y 102-117) por una consulta a `provider_public_profiles`:

```typescript
// ANTES (líneas 71-87) - BLOQUEADO POR RLS
const { data: providerQueryData, error: providerError } = await supabase
  .from('users')
  .select(`id, name, about_me, experience_years, average_rating, 
           certification_files, email, phone, avatar_url, role`)
  .eq('id', providerId)
  .eq('role', 'provider')
  .maybeSingle();

// DESPUÉS - USA VISTA PÚBLICA
const { data: providerQueryData, error: providerError } = await supabase
  .from('provider_public_profiles')
  .select(`id, name, about_me, experience_years, average_rating, 
           certification_files, avatar_url, created_at`)
  .eq('id', providerId)
  .maybeSingle();
```

**Eliminar** el bloque de fallback (líneas 98-125) ya que no es necesario con la vista pública.

**Nota sobre campos faltantes:**
- `email` y `phone` del proveedor no están en la vista pública (por seguridad/privacidad)
- `role` ya no es necesario porque la vista solo contiene proveedores
- Si el UI necesita contacto, se manejará por otro mecanismo (mensajería in-app)

### Cambio 2: `useProviderMerits.ts`

**Reemplazar** la consulta a `users` (líneas 47-51):

```typescript
// ANTES - BLOQUEADO POR RLS
supabase
  .from('users')
  .select('average_rating')
  .eq('id', providerId)
  .single(),

// DESPUÉS - USA VISTA PÚBLICA
supabase
  .from('provider_public_profiles')
  .select('average_rating')
  .eq('id', providerId)
  .maybeSingle(),
```

### Cambio 3: `useProviderServiceMerits.ts`

**Reemplazar** la consulta a `users` (líneas 54-58):

```typescript
// ANTES - BLOQUEADO POR RLS  
supabase
  .from('users')
  .select('average_rating')
  .eq('id', providerId)
  .single(),

// DESPUÉS - USA VISTA PÚBLICA
supabase
  .from('provider_public_profiles')
  .select('average_rating')
  .eq('id', providerId)
  .maybeSingle(),
```

---

## Resumen de Cambios

| Archivo | Acción |
|---------|--------|
| `useServiceDetail.ts` | Reemplazar 2 bloques de consulta a `users` por `provider_public_profiles` |
| `useProviderMerits.ts` | Cambiar consulta de `users` a `provider_public_profiles` |
| `useProviderServiceMerits.ts` | Cambiar consulta de `users` a `provider_public_profiles` |

---

## Impacto

### Positivo
- La pantalla de detalle del servicio cargará correctamente
- Los clientes podrán ver información de proveedores sin errores
- Se mantiene la seguridad de datos sensibles (email, teléfono no expuestos)
- Consistencia con el patrón ya usado en `useProvidersQuery.ts` y `useRecommendedListings.ts`

### Sin Cambios
- La lógica de procesamiento de datos permanece igual
- No se requieren cambios en la base de datos
- El flujo de booking no se ve afectado

---

## Verificación Post-Implementación

1. Navegar a `/client/results?serviceId=75492440-e8df-4559-b442-1bae3fcbb631&categoryName=Mascotas`
2. Hacer clic en "Ver detalles" de cualquier proveedor
3. Verificar que la pantalla de detalle carga correctamente
4. Confirmar que se muestra: nombre, avatar, rating, descripción, variantes
5. Probar el flujo completo hasta la reserva
