
# Plan: Corregir Lógica de "Recomendado" para Todos los Anuncios

## Diagnóstico del Problema

Después de analizar el código y la base de datos, identifiqué la causa raíz:

### Problema Principal
Las consultas en `useWeeklySlotsFetcher.ts` filtran por `listing_id` específico, lo que significa que:

1. **Las citas de OTROS anuncios del mismo proveedor NO se consideran** para el cálculo de recomendaciones
2. Si un proveedor tiene "Anuncio A" y "Anuncio B", una cita del "Anuncio A" en un condominio **no marca** como recomendado los slots del "Anuncio B" en el mismo condominio

### Consultas Afectadas (todas filtran por `listing_id`)

| Consulta | Líneas | Propósito |
|----------|--------|-----------|
| `apptAllRes` | 145-152 | Citas generales para conflictos |
| `apptDirectRes` | 153-163 | Citas del mismo residencial |
| `apptRecurringBaseRes` | 164-172 | Citas recurrentes base |
| `legacyRecurringFirstRes` | 179-188 | Recurrentes legacy |
| `historicalRes` | 189-200 | Historial de 4 semanas |
| `legacyRecurringRes` | 203-213 | Segunda consulta recurrente |

### Datos de Ejemplo
```text
Proveedor: bf15e5fe-0fe2-4917-a1ea-976333594d6f
Listing: Pet Grooming (c64ce17e-200d-46f0-8265-ea9bbda95f08)
Cita Recurrente: Lunes 9:00 AM Costa Rica (weekly)
Residencia: 9b170ff3-9bf5-4c0e-a5e8-fcaee6fd7b4e

✅ Slots 8:00 AM y 10:00 AM del Lunes DEBERÍAN mostrar "Recomendado"
❌ Actualmente: La lógica funciona pero solo para el mismo listing
```

## Solución Propuesta

Modificar las 3 consultas clave para recomendaciones, **eliminando el filtro de `listing_id`** cuando se buscan citas para el cálculo de adyacencia (pool de recomendaciones).

### Cambios en `useWeeklySlotsFetcher.ts`

#### 1. Nueva consulta para recomendaciones cross-listing (líneas ~153-163)

**ANTES:**
```typescript
clientResidenciaId ?
  supabase
    .from('appointments')
    .select('id, start_time, end_time, status, external_booking, recurrence, residencia_id')
    .eq('provider_id', providerId)
    .eq('listing_id', listingId)  // ❌ Filtro limitante
    .in('status', ['confirmed', 'pending', 'completed'])
    .eq('residencia_id', clientResidenciaId)
    .gte('start_time', baseDate.toISOString())
    .lte('start_time', endOfDay(endDate).toISOString())
```

**DESPUÉS:**
```typescript
clientResidenciaId ?
  supabase
    .from('appointments')
    .select('id, start_time, end_time, status, external_booking, recurrence, residencia_id, listing_id')
    .eq('provider_id', providerId)
    // ✅ SIN filtro de listing_id - busca TODAS las citas del proveedor en esta residencia
    .in('status', ['confirmed', 'pending', 'completed'])
    .eq('residencia_id', clientResidenciaId)
    .gte('start_time', baseDate.toISOString())
    .lte('start_time', endOfDay(endDate).toISOString())
```

#### 2. Consulta histórica cross-listing (líneas ~189-200)

**ANTES:**
```typescript
clientResidenciaId ?
  supabase
    .from('appointments')
    .select('start_time, end_time, status, residencia_id')
    .eq('provider_id', providerId)
    .eq('listing_id', listingId)  // ❌ Filtro limitante
```

**DESPUÉS:**
```typescript
clientResidenciaId ?
  supabase
    .from('appointments')
    .select('start_time, end_time, status, residencia_id, listing_id')
    .eq('provider_id', providerId)
    // ✅ SIN filtro de listing_id
```

#### 3. Consulta de citas recurrentes base cross-listing (líneas ~164-172)

**ANTES:**
```typescript
supabase
  .from('appointments')
  .select('id, provider_id, listing_id, client_id, residencia_id, start_time, end_time, recurrence, status, external_booking')
  .eq('provider_id', providerId)
  .eq('listing_id', listingId)  // ❌ Filtro limitante
  .in('status', ['confirmed', 'pending', 'completed'])
  .not('recurrence', 'in', '("none","once")')
```

**DESPUÉS:**
```typescript
supabase
  .from('appointments')
  .select('id, provider_id, listing_id, client_id, residencia_id, start_time, end_time, recurrence, status, external_booking')
  .eq('provider_id', providerId)
  // ✅ SIN filtro de listing_id para recomendaciones cross-listing
  .in('status', ['confirmed', 'pending', 'completed'])
  .not('recurrence', 'in', '("none","once")')
```

### Impacto en el Flujo

```text
ANTES:
┌─────────────────────────────────────────────────────────┐
│ Cliente ve anuncio "Pet Grooming"                        │
│ Proveedor tiene cita recurrente en mismo residencial     │
│ Consulta SOLO busca citas de "Pet Grooming"              │
│ ❌ Si la cita es de otro anuncio, NO se marca recomendado│
└─────────────────────────────────────────────────────────┘

DESPUÉS:
┌─────────────────────────────────────────────────────────┐
│ Cliente ve anuncio "Pet Grooming"                        │
│ Proveedor tiene cita recurrente en mismo residencial     │
│ Consulta busca TODAS las citas del proveedor             │
│ ✅ Slots adyacentes se marcan como "Recomendado"         │
│ ✅ Funciona para one-time Y recurrentes                  │
│ ✅ Funciona para semana actual Y futuras                 │
└─────────────────────────────────────────────────────────┘
```

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/hooks/useWeeklySlotsFetcher.ts` | Remover `.eq('listing_id', listingId)` de 3 consultas específicas para recomendaciones |

## Consultas que NO se modifican

Las siguientes consultas DEBEN mantener el filtro de `listing_id` porque son para **conflictos de disponibilidad** (no recomendaciones):

- `apptAllRes` (líneas 145-152): Conflictos de citas del mismo listing
- Slots de base de datos: Deben ser del listing específico

## Resultado Esperado

1. Los slots adyacentes a CUALQUIER cita del proveedor en el mismo residencial mostrarán "Recomendado"
2. Funciona tanto para citas one-time como recurrentes
3. Funciona para la semana actual y todas las semanas futuras
4. Aplica a TODOS los anuncios del proveedor
