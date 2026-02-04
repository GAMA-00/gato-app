
# Plan de Implementación: Sistema de Slots de 30 Minutos con Descuento por Slots Recomendados

## Resumen Ejecutivo

Este plan implementa una reestructuración completa del sistema de slots de la plataforma Gato, migrando de un modelo mixto (60/30 min) a un estándar global de **30 minutos** como unidad mínima e indivisible de tiempo reservable. Incluye el sistema de descuento del 10% para slots recomendados, lock de 5 minutos durante el proceso de pago, y protección contra overbooking.

---

## Arquitectura Actual vs. Propuesta

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           SISTEMA ACTUAL                                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Backend SQL:  v_slot_duration_minutes := 60 (hardcoded)                        │
│  Frontend:     const SLOT_SIZE = 60 (múltiples archivos)                        │
│  DB Real:      Mixto - slots de 30, 60 y otros minutos conviviendo              │
│  Lock:         24 horas para citas pending (excesivo)                           │
│  Descuento:    No implementado para slots recomendados                          │
│  Recomendados: Calculados en frontend, inconsistentes entre anuncios            │
└─────────────────────────────────────────────────────────────────────────────────┘

                                    ↓↓↓

┌─────────────────────────────────────────────────────────────────────────────────┐
│                           SISTEMA PROPUESTO                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Backend SQL:  v_slot_duration_minutes := 30 (única fuente de verdad)           │
│  Frontend:     SLOT_SIZE = 30 (constante centralizada en lib/constants.ts)      │
│  DB Real:      100% slots de 30 minutos (migración automática)                  │
│  Lock:         5 minutos exactos para citas pending durante pago                │
│  Descuento:    10% automático si slot inicial es recomendado                    │
│  Recomendados: Función SQL única + cálculo dinámico consistente                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Fases de Implementación

### FASE 1: Cambios en Base de Datos (Backend SQL)

#### 1.1 Migración: Estandarización a 30 Minutos

**Archivo:** Nueva migración SQL

**Cambios:**

1. **Actualizar `generate_provider_time_slots_for_listing`:**
   - Cambiar `v_slot_duration_minutes integer := 60` a `v_slot_duration_minutes integer := 30`
   - Mantener lógica de generación intacta

2. **Actualizar `create_appointment_with_slot_extended`:**
   - Modificar cálculo de slots requeridos: `v_required_slots := CEIL(EXTRACT(EPOCH FROM (p_end_time - p_start_time)) / 1800)` (1800 = 30 min en segundos)
   - Cambiar intervalos de `1 hour` a `30 minutes`

3. **Crear función `calculate_required_slots`:**
   ```sql
   CREATE OR REPLACE FUNCTION calculate_required_slots(p_duration_minutes integer)
   RETURNS integer AS $$
   BEGIN
     RETURN CEIL(p_duration_minutes::numeric / 30);
   END;
   $$ LANGUAGE plpgsql IMMUTABLE;
   ```

4. **Actualizar `sync_slots_with_availability`:**
   - Cambiar generación de slots a intervalos de 30 minutos

5. **Actualizar `maintain_future_slots`:**
   - Asegurar que use 30 minutos como base

#### 1.2 Sistema de Lock de 5 Minutos

**Archivo:** Nueva migración SQL

**Cambios:**

1. **Agregar columna `locked_until` a `provider_time_slots`:**
   ```sql
   ALTER TABLE provider_time_slots 
   ADD COLUMN IF NOT EXISTS locked_until timestamp with time zone DEFAULT NULL;
   ```

2. **Crear función `lock_slots_for_checkout`:**
   ```sql
   CREATE OR REPLACE FUNCTION lock_slots_for_checkout(
     p_slot_ids uuid[],
     p_lock_duration_minutes integer DEFAULT 5
   ) RETURNS boolean
   SECURITY DEFINER
   SET search_path = 'public'
   AS $$
   DECLARE
     v_user_id uuid;
     v_lock_until timestamp with time zone;
   BEGIN
     v_user_id := auth.uid();
     IF v_user_id IS NULL THEN
       RAISE EXCEPTION 'Unauthorized';
     END IF;
     
     v_lock_until := NOW() + (p_lock_duration_minutes || ' minutes')::interval;
     
     -- Verificar que todos los slots estén disponibles y no bloqueados
     IF EXISTS (
       SELECT 1 FROM provider_time_slots 
       WHERE id = ANY(p_slot_ids) 
       AND (is_available = false OR is_reserved = true OR (locked_until IS NOT NULL AND locked_until > NOW()))
     ) THEN
       RETURN false;
     END IF;
     
     -- Aplicar lock
     UPDATE provider_time_slots 
     SET locked_until = v_lock_until
     WHERE id = ANY(p_slot_ids)
     AND is_available = true 
     AND is_reserved = false
     AND (locked_until IS NULL OR locked_until <= NOW());
     
     RETURN true;
   END;
   $$ LANGUAGE plpgsql;
   ```

3. **Crear función `release_expired_locks`:**
   ```sql
   CREATE OR REPLACE FUNCTION release_expired_locks()
   RETURNS integer AS $$
   DECLARE
     v_released integer;
   BEGIN
     UPDATE provider_time_slots 
     SET locked_until = NULL
     WHERE locked_until IS NOT NULL AND locked_until <= NOW();
     
     GET DIAGNOSTICS v_released = ROW_COUNT;
     RETURN v_released;
   END;
   $$ LANGUAGE plpgsql;
   ```

4. **Crear job pg_cron para liberación automática:**
   ```sql
   SELECT cron.schedule(
     'release-expired-slot-locks',
     '* * * * *',  -- Cada minuto
     'SELECT release_expired_locks();'
   );
   ```

5. **Modificar `cleanup_old_pending_appointments`:**
   - Cambiar timeout de 24 horas a 5 minutos para citas pending sin pago iniciado

#### 1.3 Función Unificada de Slots Recomendados

**Archivo:** Nueva migración SQL

**Cambios:**

1. **Crear función `get_recommended_slots`:**
   ```sql
   CREATE OR REPLACE FUNCTION get_recommended_slots(
     p_provider_id uuid,
     p_start_date date,
     p_end_date date,
     p_client_residencia_id uuid DEFAULT NULL
   ) RETURNS TABLE (
     slot_id uuid,
     slot_date date,
     start_time time,
     is_recommended boolean
   )
   SECURITY INVOKER
   AS $$
   BEGIN
     RETURN QUERY
     WITH confirmed_appointments AS (
       -- Citas confirmadas del proveedor
       SELECT 
         a.start_time AS appt_start,
         a.end_time AS appt_end,
         a.residencia_id
       FROM appointments a
       WHERE a.provider_id = p_provider_id
         AND a.status IN ('confirmed', 'completed')
         AND a.start_time::date BETWEEN p_start_date AND p_end_date
     ),
     blocked_recurring AS (
       -- Slots bloqueados por recurrencia
       SELECT 
         pts.slot_date,
         pts.start_time,
         pts.end_time
       FROM provider_time_slots pts
       WHERE pts.provider_id = p_provider_id
         AND pts.recurring_blocked = true
         AND pts.slot_date BETWEEN p_start_date AND p_end_date
     )
     SELECT 
       pts.id AS slot_id,
       pts.slot_date,
       pts.start_time,
       -- Un slot es recomendado si está inmediatamente antes o después de una cita/bloqueo
       (
         -- Inmediatamente antes de una cita (este slot termina cuando inicia la cita)
         EXISTS (
           SELECT 1 FROM confirmed_appointments ca
           WHERE ca.appt_start::date = pts.slot_date
             AND (pts.start_time + INTERVAL '30 minutes') = ca.appt_start::time
             AND (p_client_residencia_id IS NULL OR ca.residencia_id = p_client_residencia_id)
         )
         OR
         -- Inmediatamente después de una cita (este slot inicia cuando termina la cita)
         EXISTS (
           SELECT 1 FROM confirmed_appointments ca
           WHERE ca.appt_end::date = pts.slot_date
             AND pts.start_time = ca.appt_end::time
             AND (p_client_residencia_id IS NULL OR ca.residencia_id = p_client_residencia_id)
         )
         OR
         -- Adyacente a slots recurrentes bloqueados
         EXISTS (
           SELECT 1 FROM blocked_recurring br
           WHERE br.slot_date = pts.slot_date
             AND (
               (pts.start_time + INTERVAL '30 minutes') = br.start_time  -- Antes
               OR pts.start_time = br.end_time                           -- Después
             )
         )
       ) AS is_recommended
     FROM provider_time_slots pts
     WHERE pts.provider_id = p_provider_id
       AND pts.is_available = true
       AND pts.is_reserved = false
       AND pts.slot_date BETWEEN p_start_date AND p_end_date;
   END;
   $$ LANGUAGE plpgsql STABLE;
   ```

#### 1.4 Migración de Datos Existentes

**Archivo:** Nueva migración SQL (ejecutar después de cambios de estructura)

**Cambios:**

1. **Script de migración segura:**
   ```sql
   -- 1. Preservar reservas activas
   -- Las citas existentes NO se modifican - mantienen sus start_time y end_time originales
   
   -- 2. Regenerar slots de 30 min para todos los listings activos
   -- Solo para slots futuros no reservados
   DO $$
   DECLARE
     v_listing RECORD;
   BEGIN
     FOR v_listing IN 
       SELECT id, provider_id FROM listings WHERE is_active = true
     LOOP
       -- Eliminar slots futuros no reservados de duraciones incorrectas
       DELETE FROM provider_time_slots
       WHERE listing_id = v_listing.id
         AND slot_date > CURRENT_DATE
         AND is_reserved = false
         AND slot_type != 'manually_blocked'
         AND EXTRACT(EPOCH FROM (slot_datetime_end - slot_datetime_start))/60 != 30;
       
       -- Regenerar con 30 minutos
       PERFORM generate_provider_time_slots_for_listing(v_listing.provider_id, v_listing.id);
     END LOOP;
   END;
   $$;
   ```

---

### FASE 2: Cambios en Frontend

#### 2.1 Constantes Centralizadas

**Archivo nuevo:** `src/lib/constants.ts`

```typescript
/**
 * Constantes globales del sistema de slots
 * Esta es la ÚNICA fuente de verdad para la configuración de slots
 */
export const SLOT_SYSTEM = {
  /** Duración de cada slot en minutos (unidad mínima reservable) */
  SLOT_SIZE_MINUTES: 30,
  
  /** Duración del lock durante checkout en minutos */
  CHECKOUT_LOCK_MINUTES: 5,
  
  /** Porcentaje de descuento para slots recomendados */
  RECOMMENDED_DISCOUNT_PERCENT: 10,
} as const;

/**
 * Calcula el número de slots necesarios para una duración de servicio
 * Siempre redondea hacia arriba
 */
export function calculateRequiredSlots(serviceDurationMinutes: number): number {
  return Math.ceil(serviceDurationMinutes / SLOT_SYSTEM.SLOT_SIZE_MINUTES);
}

/**
 * Calcula la duración total en minutos basada en número de slots
 */
export function calculateTotalDuration(slotCount: number): number {
  return slotCount * SLOT_SYSTEM.SLOT_SIZE_MINUTES;
}
```

#### 2.2 Actualización de Hooks de Slots

**Archivos a modificar:**

1. **`src/hooks/useWeeklySlotsFetcher.ts`:**
   - Importar `SLOT_SYSTEM` desde `@/lib/constants`
   - Reemplazar todas las referencias a `60` por `SLOT_SYSTEM.SLOT_SIZE_MINUTES`
   - Actualizar cálculo de adyacencia (líneas 791-793):
     ```typescript
     const SLOT_DURATION = SLOT_SYSTEM.SLOT_SIZE_MINUTES; // 30 minutos
     const slotEndMin = slotMin + SLOT_DURATION;
     ```

2. **`src/hooks/useSlotGeneration.ts`:**
   - Importar `SLOT_SYSTEM`
   - Actualizar `generateTimeSlots` para usar 30 minutos como intervalo base

3. **`src/hooks/useProviderSlotManagement.ts`:**
   - Actualizar cálculos de duración a 30 minutos

4. **`src/hooks/useProviderListing.ts`:**
   - Cambiar línea 35: `const duration = SLOT_SYSTEM.SLOT_SIZE_MINUTES;`

#### 2.3 Actualización de WeeklySlotGrid

**Archivo:** `src/components/client/booking/WeeklySlotGrid.tsx`

**Cambios:**

1. **Importar constantes:**
   ```typescript
   import { SLOT_SYSTEM, calculateRequiredSlots } from '@/lib/constants';
   ```

2. **Actualizar cálculo de slots (líneas 52-65):**
   ```typescript
   const slotSize = SLOT_SYSTEM.SLOT_SIZE_MINUTES; // 30
   const slotsNeeded = calculateRequiredSlots(actualTotalDuration);
   ```

3. **Extender callback `onSlotSelect` para incluir `isRecommended`:**
   ```typescript
   interface WeeklySlotGridProps {
     // ... existentes
     onSlotSelect: (
       slots: string[], 
       startDate: Date, 
       startTime: string, 
       totalDuration: number,
       isInitialSlotRecommended: boolean // NUEVO
     ) => void;
   }
   ```

4. **Actualizar `handleSlotClick` para pasar `isRecommended`:**
   ```typescript
   const handleSlotClick = (slotId: string, date: Date, time: string) => {
     const slot = availableSlotGroups
       .flatMap(group => group.slots)
       .find(s => s.id === slotId);
     
     // ... validaciones existentes
     
     const isInitialSlotRecommended = slot?.isRecommended ?? false;
     
     onSlotSelect(
       consecutiveSlotIds, 
       slot.date, 
       slot.time, 
       totalDurationReserved,
       isInitialSlotRecommended // NUEVO
     );
   };
   ```

5. **Mensaje mejorado para slots insuficientes:**
   ```typescript
   if (!isContiguous || consecutiveSlotIds.length < slotsNeeded) {
     toast.error(
       `No hay suficientes slots consecutivos disponibles. ` +
       `Se necesitan ${slotsNeeded} slots de ${slotSize} minutos ` +
       `(${actualTotalDuration} minutos totales) sin interrupciones.`
     );
     return;
   }
   ```

#### 2.4 Sistema de Descuento 10%

**Archivo:** `src/pages/ClientBooking.tsx`

**Cambios:**

1. **Agregar estado para tracking de descuento:**
   ```typescript
   const [isRecommendedSlotSelected, setIsRecommendedSlotSelected] = useState(false);
   ```

2. **Actualizar handler de slot selection:**
   ```typescript
   const handleSlotSelect = (
     slotIds: string[], 
     date: Date, 
     time: string, 
     duration: number,
     isRecommended: boolean
   ) => {
     // ... lógica existente
     setIsRecommendedSlotSelected(isRecommended);
   };
   ```

3. **Aplicar descuento en cálculo de precio:**
   ```typescript
   const calculateFinalPrice = () => {
     let subtotal = effectiveSelectedVariants.reduce((sum, variant) => {
       const basePrice = Number(variant.price) * variant.quantity;
       const additionalPersonPrice = variant.personQuantity && variant.additionalPersonPrice 
         ? Number(variant.additionalPersonPrice) * (variant.personQuantity - 1) * variant.quantity
         : 0;
       return sum + basePrice + additionalPersonPrice;
     }, 0) + customVariablesTotalPrice;
     
     const discountAmount = isRecommendedSlotSelected 
       ? subtotal * (SLOT_SYSTEM.RECOMMENDED_DISCOUNT_PERCENT / 100) 
       : 0;
     
     return {
       subtotal,
       discountAmount,
       discountPercent: isRecommendedSlotSelected ? SLOT_SYSTEM.RECOMMENDED_DISCOUNT_PERCENT : 0,
       finalTotal: subtotal - discountAmount
     };
   };
   ```

4. **Pasar información de descuento al checkout:**
   ```typescript
   navigate('/checkout', {
     state: {
       // ... datos existentes
       pricing: calculateFinalPrice(),
       isRecommendedSlot: isRecommendedSlotSelected,
     }
   });
   ```

**Archivo:** `src/pages/Checkout.tsx`

**Cambios:**

1. **Mostrar descuento en UI:**
   ```typescript
   const { pricing, isRecommendedSlot } = location.state;
   
   // En el render:
   {pricing.discountAmount > 0 && (
     <div className="flex justify-between text-green-600">
       <span>Descuento slot recomendado ({pricing.discountPercent}%)</span>
       <span>-{formatCurrency(pricing.discountAmount, currency)}</span>
     </div>
   )}
   ```

#### 2.5 Sistema de Lock durante Checkout

**Archivo nuevo:** `src/hooks/useSlotLock.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SLOT_SYSTEM } from '@/lib/constants';

export function useSlotLock(slotIds: string[]) {
  const [isLocked, setIsLocked] = useState(false);
  const [lockExpiry, setLockExpiry] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const acquireLock = useCallback(async () => {
    if (slotIds.length === 0) return false;
    
    try {
      const { data, error } = await supabase.rpc('lock_slots_for_checkout', {
        p_slot_ids: slotIds,
        p_lock_duration_minutes: SLOT_SYSTEM.CHECKOUT_LOCK_MINUTES
      });
      
      if (error) throw error;
      if (!data) {
        setError('Los slots ya no están disponibles');
        return false;
      }
      
      setIsLocked(true);
      setLockExpiry(new Date(Date.now() + SLOT_SYSTEM.CHECKOUT_LOCK_MINUTES * 60 * 1000));
      return true;
    } catch (err) {
      setError('Error al reservar los slots');
      return false;
    }
  }, [slotIds]);

  const releaseLock = useCallback(async () => {
    if (!isLocked || slotIds.length === 0) return;
    
    try {
      await supabase
        .from('provider_time_slots')
        .update({ locked_until: null })
        .in('id', slotIds);
      
      setIsLocked(false);
      setLockExpiry(null);
    } catch (err) {
      console.error('Error releasing lock:', err);
    }
  }, [isLocked, slotIds]);

  // Auto-release on unmount
  useEffect(() => {
    return () => {
      if (isLocked) {
        releaseLock();
      }
    };
  }, [isLocked, releaseLock]);

  return {
    isLocked,
    lockExpiry,
    error,
    acquireLock,
    releaseLock,
    timeRemaining: lockExpiry ? Math.max(0, lockExpiry.getTime() - Date.now()) : 0
  };
}
```

**Archivo:** `src/pages/Checkout.tsx`

**Cambios:**

1. **Integrar hook de lock:**
   ```typescript
   const { slotIds } = location.state;
   const { isLocked, lockExpiry, acquireLock, timeRemaining, error: lockError } = useSlotLock(slotIds);
   
   useEffect(() => {
     acquireLock();
   }, []);
   
   // Mostrar countdown
   {isLocked && (
     <div className="text-sm text-amber-600">
       Tiempo restante para completar: {Math.ceil(timeRemaining / 1000)}s
     </div>
   )}
   ```

#### 2.6 Validación Backend del Descuento

**Archivo:** `supabase/functions/onvopay-authorize/index.ts`

**Cambios:**

1. **Agregar validación de descuento:**
   ```typescript
   // Recibir datos de descuento del frontend
   const { 
     amount, 
     isRecommendedSlot, 
     originalSubtotal,
     slotIds 
   } = body;
   
   // Validar descuento si aplica
   if (isRecommendedSlot) {
     // Verificar que el slot inicial sea realmente recomendado
     const { data: recommendedCheck } = await supabaseAdmin.rpc('get_recommended_slots', {
       p_provider_id: providerId,
       p_start_date: slotDate,
       p_end_date: slotDate,
       p_client_residencia_id: clientResidenciaId
     });
     
     const firstSlotIsRecommended = recommendedCheck?.some(
       r => r.slot_id === slotIds[0] && r.is_recommended
     );
     
     if (!firstSlotIsRecommended) {
       return new Response(JSON.stringify({ 
         error: 'Descuento inválido: el slot no califica como recomendado' 
       }), { status: 400 });
     }
     
     // Verificar que el monto coincida con el descuento esperado
     const expectedTotal = originalSubtotal * 0.90; // 10% descuento
     if (Math.abs(amount - expectedTotal) > 0.01) {
       return new Response(JSON.stringify({ 
         error: 'Monto de pago no coincide con el descuento esperado' 
       }), { status: 400 });
     }
   }
   ```

#### 2.7 Protección de Slots Recurrentes

**Archivo:** `src/components/calendar/AvailabilityManageTab.tsx`

**Cambios (líneas 146-153):**
```typescript
const handleSlotToggle = useCallback(async (slotId: string, date: Date, time: string) => {
  const slot = slotGroups.flatMap(group => group.slots).find(s => s.id === slotId);
  if (!slot) return;

  // PROTECCIÓN: No permitir desactivar slots de planes recurrentes
  if (slot.conflictReason === 'Bloqueado por cita recurrente' || slot.recurringBlocked) {
    toast({
      title: 'Horario protegido',
      description: 'Este horario está bloqueado por un plan recurrente activo y no puede ser modificado.',
      variant: 'destructive'
    });
    return;
  }
  
  // ... resto de la lógica
}, [/* deps */]);
```

---

### FASE 3: Migración y Compatibilidad

#### 3.1 Script de Migración Segura

La migración debe:
1. **NO modificar** citas existentes (confirmadas, pending, completed)
2. **Regenerar** slots futuros no reservados con duración de 30 minutos
3. **Preservar** bloqueos manuales y recurrentes

#### 3.2 Rollback Plan

**Si algo falla:**
1. Revertir migración SQL (cambiar 30 → 60)
2. Revertir constantes frontend
3. Los datos de citas nunca se tocan, por lo que no hay pérdida de información

---

## Detalle Técnico: Archivos a Modificar

| Archivo | Tipo de Cambio | Prioridad |
|---------|---------------|-----------|
| Nueva migración SQL | Crear | CRÍTICA |
| `src/lib/constants.ts` | Crear | CRÍTICA |
| `src/hooks/useWeeklySlotsFetcher.ts` | Modificar | ALTA |
| `src/hooks/useSlotGeneration.ts` | Modificar | ALTA |
| `src/hooks/useProviderSlotManagement.ts` | Modificar | ALTA |
| `src/hooks/useProviderListing.ts` | Modificar | ALTA |
| `src/hooks/useSlotLock.ts` | Crear | ALTA |
| `src/components/client/booking/WeeklySlotGrid.tsx` | Modificar | ALTA |
| `src/components/client/booking/NewBookingForm.tsx` | Modificar | MEDIA |
| `src/pages/ClientBooking.tsx` | Modificar | ALTA |
| `src/pages/Checkout.tsx` | Modificar | ALTA |
| `src/components/calendar/AvailabilityManageTab.tsx` | Modificar | MEDIA |
| `src/utils/availabilitySlotGenerator.ts` | Modificar | MEDIA |
| `supabase/functions/onvopay-authorize/index.ts` | Modificar | ALTA |

---

## Beneficios de la Implementación

1. **Consistencia Global:** Todos los anuncios operan con la misma unidad de tiempo
2. **Mayor Granularidad:** Servicios cortos (15-20 min) ocupan solo 1 slot vs. 1 hora antes
3. **Optimización de Agenda:** Proveedores pueden aprovechar mejor su tiempo
4. **Incentivos Claros:** 10% descuento fomenta reservas en horarios eficientes
5. **Seguridad de Concurrencia:** Lock de 5 min previene overbooking
6. **Mantenibilidad:** Lógica centralizada en constantes y funciones SQL únicas

---

## Consideraciones de Performance

1. **Índices SQL:** Agregar índices en `provider_time_slots(locked_until)` y `provider_time_slots(slot_date, start_time)`
2. **Cache Frontend:** El hook `useWeeklySlotsFetcher` ya implementa debounce y deduplicación
3. **Cálculo Lazy:** Slots recomendados se calculan solo para el rango visible

---

## Riesgos y Mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Datos legacy inconsistentes | Script de migración selectivo que no toca reservas activas |
| Race conditions en locks | Función SQL con SERIALIZABLE y validaciones atómicas |
| Descuento manipulado | Validación doble frontend + backend |
| Performance con más slots | Índices y queries optimizadas |
