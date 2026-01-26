
## Plan: Corregir la Lógica de Slots Recomendados

### Problema Identificado

Los slots adyacentes a citas ya agendadas no muestran la etiqueta "Recomendado" debido a una **condición de carrera** (race condition) entre la carga del perfil del usuario y el fetch de slots.

### Diagnóstico Técnico

**Flujo actual con el bug:**

1. Usuario abre la página de booking
2. `WeeklySlotGrid` se renderiza con `profile?.residencia_id = undefined` (perfil aún cargando)
3. Se llama `useWeeklySlots({ clientResidenciaId: undefined })`
4. `useWeeklySlotsFetcher` hace la consulta sin filtrar por residencia
5. `sameResidenciaAppointments` está vacío → `adjacentPool` está vacío → **no hay recomendaciones**
6. Cuando el perfil carga, `clientResidenciaId` cambia
7. Se dispara un refetch, pero debido al patrón de refs, el valor leído puede ser obsoleto

**Causa raíz:**
El hook `useWeeklySlotsFetcher` usa un patrón donde `fetchWeeklySlots` lee de `paramsRef.current`, pero este ref se actualiza via `useEffect`, lo cual es asíncrono. Hay una condición de carrera donde el fetch puede ejecutarse antes de que el ref se actualice.

### Solución Propuesta

Modificar la lógica para asegurar que el `clientResidenciaId` se use correctamente en todas las llamadas:

**Opción implementada: Actualizar `paramsRef` sincrónicamente**

En lugar de actualizar `paramsRef` en un `useEffect`, actualizarlo directamente en el cuerpo del hook (antes del render):

```typescript
// src/hooks/useWeeklySlotsFetcher.ts

// ANTES (líneas 40-63):
const paramsRef = useRef({...});
useEffect(() => {
  paramsRef.current = {...};
}, [deps]);

// DESPUÉS:
// Actualizar el ref sincrónicamente en cada render
paramsRef.current = {
  providerId,
  listingId,
  serviceDuration,
  recurrence,
  startDate,
  daysAhead,
  weekIndex,
  clientResidenciaId
};
```

---

### Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/hooks/useWeeklySlotsFetcher.ts` | Eliminar useEffect y actualizar paramsRef sincrónicamente |

---

### Cambio Detallado

**Archivo:** `src/hooks/useWeeklySlotsFetcher.ts`

**Líneas a modificar:** 40-63

```typescript
// ANTES:
  // Use ref to store current params - allows stable callback without dependencies
  const paramsRef = useRef({
    providerId,
    listingId,
    serviceDuration,
    recurrence,
    startDate,
    daysAhead,
    weekIndex,
    clientResidenciaId
  });

  // Update params ref when they change
  useEffect(() => {
    paramsRef.current = {
      providerId,
      listingId,
      serviceDuration,
      recurrence,
      startDate,
      daysAhead,
      weekIndex,
      clientResidenciaId
    };
  }, [providerId, listingId, serviceDuration, recurrence, startDate, daysAhead, weekIndex, clientResidenciaId]);

// DESPUÉS:
  // Use ref to store current params - allows stable callback without dependencies
  // CRITICAL: Update synchronously on every render to prevent race conditions
  const paramsRef = useRef({
    providerId,
    listingId,
    serviceDuration,
    recurrence,
    startDate,
    daysAhead,
    weekIndex,
    clientResidenciaId
  });
  
  // Update synchronously - not in useEffect to avoid race conditions
  paramsRef.current = {
    providerId,
    listingId,
    serviceDuration,
    recurrence,
    startDate,
    daysAhead,
    weekIndex,
    clientResidenciaId
  };
```

---

### Resultado Esperado

Después del cambio:

1. Usuario abre la página de booking
2. Primera renderización con `clientResidenciaId = undefined`
3. Cuando el perfil carga, componente re-renderiza
4. `paramsRef.current` se actualiza **sincrónicamente** con el nuevo `clientResidenciaId`
5. El `useEffect` en `useWeeklySlots` dispara `fetchWeeklySlots()` después de 100ms
6. `fetchWeeklySlots` lee el valor **actualizado** de `paramsRef.current`
7. La consulta incluye `clientResidenciaId`, obteniendo las citas del mismo residencial
8. `adjacentPool` contiene las citas → se calculan las recomendaciones correctamente
9. Slots adyacentes muestran la etiqueta "Recomendado"

---

### Verificación Visual Esperada

Para la cita del 30 de enero a las 10:00-11:00 (hora local):
- El slot de las **09:00** debería mostrar la etiqueta "Recomendado" (es adyacente anterior)
- El slot de las **12:00** debería mostrar la etiqueta "Recomendado" (es adyacente posterior a la cita de 11:00-12:00)

---

### Sección Técnica: Flujo Corregido

```text
Renderización inicial
    │
    ▼
profile?.residencia_id = undefined
    │
    ▼
paramsRef.current.clientResidenciaId = undefined (sincrónico)
    │
    ▼
fetchWeeklySlots() → Sin recomendaciones (esperado)
    │
    │
    │ ... perfil carga ...
    │
    ▼
Re-render con profile.residencia_id = '9b170ff3-...'
    │
    ▼
paramsRef.current.clientResidenciaId = '9b170ff3-...' (SINCRÓNICO ✓)
    │
    ▼
paramsSignature cambia → useEffect dispara fetchWeeklySlots()
    │
    ▼
fetchWeeklySlots() lee paramsRef.current con valor ACTUALIZADO
    │
    ▼
Consulta incluye residencia_id → sameResidenciaAppointments tiene datos
    │
    ▼
adjacentPool tiene citas → isRecommended se calcula correctamente
    │
    ▼
Slots adyacentes muestran "Recomendado" ✓
```
