
# Plan: Corrección Crítica - Lista de Proveedores Vacía

## Diagnóstico del Problema

### Causa Raíz Identificada
El hook `useProvidersQuery.ts` consulta directamente la tabla `users` para obtener información de proveedores:

```typescript
// Línea 54-65 actual (PROBLEMA)
const { data: providers, error: providersError } = await supabase
  .from('users')  // ❌ Bloqueado por RLS
  .select(`id, name, avatar_url, about_me, experience_years, average_rating, created_at`)
  .in('id', providerIds);
```

### Política RLS Restrictiva
La política RLS de la tabla `users` fue recientemente endurecida:

```sql
-- Política actual de SELECT en users
qual: (has_role(auth.uid(), 'admin') OR (auth.uid() = id))
```

Esto significa que un cliente autenticado **solo puede ver su propio perfil**, no los perfiles de proveedores. Por eso la lista aparece vacía.

### Evidencia
| Query | Resultado |
|-------|-----------|
| `listings` con `service_type_id = '754...'` | 1 listing activo encontrado |
| `users` (con service_role) | Proveedor "Vicente Garofalo M" existe |
| `provider_public_profiles` | Vista accesible públicamente |

---

## Solución Propuesta

### Cambio Requerido
Modificar `useProvidersQuery.ts` para usar la vista pública `provider_public_profiles` en lugar de la tabla `users`:

**Archivo**: `src/components/client/results/useProvidersQuery.ts`

**Cambio en líneas 53-65**:

```typescript
// ❌ ANTES (bloqueado por RLS)
const { data: providers, error: providersError } = await supabase
  .from('users')
  .select(`id, name, avatar_url, about_me, experience_years, average_rating, created_at`)
  .in('id', providerIds);

// ✅ DESPUÉS (vista pública sin restricciones RLS)
const { data: providers, error: providersError } = await supabase
  .from('provider_public_profiles')
  .select(`id, name, avatar_url, about_me, experience_years, average_rating, created_at`)
  .in('id', providerIds);
```

### Compatibilidad de Campos
La vista `provider_public_profiles` contiene **exactamente los mismos campos** que la query actual:

| Campo | En `users` | En `provider_public_profiles` |
|-------|------------|-------------------------------|
| `id` | ✅ | ✅ |
| `name` | ✅ | ✅ |
| `avatar_url` | ✅ | ✅ |
| `about_me` | ✅ | ✅ |
| `experience_years` | ✅ | ✅ |
| `average_rating` | ✅ | ✅ |
| `created_at` | ✅ | ✅ |

---

## Detalle Técnico

### Sección de Código a Modificar

```typescript
// src/components/client/results/useProvidersQuery.ts - Líneas 53-65

// Fetch provider information from public view (accessible without RLS restrictions)
const { data: providers, error: providersError } = await supabase
  .from('provider_public_profiles')  // ✅ Cambiar de 'users' a vista pública
  .select(`
    id,
    name,
    avatar_url,
    about_me,
    experience_years,
    average_rating,
    created_at
  `)
  .in('id', providerIds);
```

---

## Impacto

### Positivo
- Los clientes podrán ver la lista de proveedores disponibles
- Se mantiene la seguridad de datos sensibles (email, teléfono no expuestos)
- No se requieren cambios en RLS ni en la estructura de BD

### Sin Cambios
- La lógica de procesamiento de proveedores permanece igual
- Los campos devueltos son idénticos
- No hay cambios en el frontend

---

## Verificación Post-Implementación

1. Navegar a cualquier categoría con proveedores
2. Verificar que aparezcan las tarjetas de proveedores
3. Confirmar que el contador muestre el número correcto
