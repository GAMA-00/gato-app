
Objetivo: corregir definitivamente que en “Dani Nail Artist” (y cualquier otro anuncio) se puedan reservar servicios >30 minutos, estandarizando TODO el sistema de slots a bloques fijos de 1 hora (60 min) y eliminando la variable `slot_size` (frontend + base de datos). A partir de esto, solo se reservarán múltiples slots cuando el servicio dure más de 1 hora.

## 1) Diagnóstico (causa raíz confirmada)
- El listing “Dani Nail Artist” tiene `listings.slot_size = 30`.
- En el flujo de reserva, ese `slot_size` se usa como “tamaño de bloque” (`slotSize`) para calcular cuántos slots consecutivos se necesitan.
- En la base de datos, los `provider_time_slots` para ese listing están mezclados: hay slots de 1 hora y algunos de 30 min (y en otros listings incluso más mezcla).
- Resultado: al reservar un servicio de 60 min con `slotSize=30`, el sistema intenta reservar 2 slots consecutivos de 30 min, pero muchos días solo tienen slots cada 60 min (09:00, 10:00, …). La validación de contigüidad detecta “hueco” y bloquea la reserva.

## 2) Decisión de diseño (lo que quedará “estándar”)
- “Unidad de agenda”: 1 slot = 60 minutos, siempre.
- “Duración reservada”:
  - Si servicio dura <= 60 min → se reserva 1 slot (60 min).
  - Si servicio dura > 60 min → se reserva `ceil(duración/60)` slots (se redondea hacia arriba a la siguiente hora).
- Consecuencia explícita: un servicio de 30 minutos ocupará 1 hora en la agenda (porque el sistema opera en bloques de 1 hora). Esto es coherente con tu requisito de estandarización.

## 3) Cambios en Base de Datos (SQL migration)
Se hará con la herramienta de migraciones (requiere aprobación al ejecutarla).

### 3.1 Eliminar `slot_size` del esquema
- Quitar constraint `slot_size_check`
- Quitar índice `idx_listings_slot_size`
- Dropear columna `public.listings.slot_size`

(Importante: antes de dropear la columna, actualizaremos el frontend para que deje de leer/escribir `slot_size`, o se rompe el build.)

### 3.2 Forzar generación de slots a 60 minutos (server-side)
Actualizar la función:
- `public.generate_provider_time_slots_for_listing(...)`
Actualmente calcula duración desde `listings.standard_duration` (lo cual genera slots de 30 min en varios anuncios). Se modificará para que use SIEMPRE 60 minutos como duración del slot, independientemente de la duración del servicio.

Esto asegura:
- slots uniformes (1h) en la tabla `provider_time_slots`
- trigger `auto_generate_slots_for_new_listing()` seguirá funcionando, pero generando 1h.

### 3.3 Limpieza de datos existentes (para que no queden slots de 30 min “colgados”)
Porque hoy hay mezcla de 30/60 en `provider_time_slots`, y eso rompe reservas.

Estrategia “segura” (no tocar histórico ni reservas existentes):
- Borrar únicamente slots FUTUROS que NO estén reservados, NO estén bloqueados manualmente, y NO estén bloqueados por recurrencia, y cuya duración no sea 1 hora.
  - `slot_date >= current_date`
  - `is_reserved = false`
  - `(slot_type IS NULL OR slot_type != 'manually_blocked')`
  - `recurring_blocked = false`
  - `(slot_datetime_end - slot_datetime_start) != interval '1 hour'`
- Luego llamar a `maintain_future_slots()` para re-crear slots faltantes (ya en 1h) usando `generate_provider_time_slots_for_listing` (actualizada).

Esto dejará a “Dani Nail Artist” con pura grilla 1h y hará que la reserva funcione de inmediato.

## 4) Cambios Frontend (TypeScript/React)
Objetivo: que el UI y la lógica ya no dependan de `slotSize` configurable, sino de una constante `SLOT_SIZE_MINUTES = 60`.

### 4.1 Booking flow (Cliente)
Archivos principales:
- `src/pages/ClientBooking.tsx`
  - Eliminar lecturas de `effectiveServiceDetails?.slot_size`
  - Definir `const SLOT_SIZE = 60`
  - Pasar `slotSize={SLOT_SIZE}` (o directamente eliminar esa prop en cadena, ver abajo)
  - Ajustar queries `.select(...)` que hoy incluyen `slot_size` (reschedule y fallback listing) para removerlo cuando la columna desaparezca.

- `src/components/client/booking/NewBookingForm.tsx`
  - Eliminar `slotSize?: number` como prop (o mantenerla, pero ignorarla y forzar 60; preferible eliminar para “remover variable”).
  - Calcular `requiredSlots = Math.ceil(totalServiceDuration / 60)`
  - Pasar a `WeeklySlotGrid` un `slotSize` fijo 60 (o eliminar prop y que sea interno en WeeklySlotGrid).

- `src/components/client/booking/WeeklySlotGrid.tsx`
  - Dejar el componente “controlado” (ya está) y además:
    - Eliminar `slotSize?: number` del contrato público si decidimos removerlo de raíz.
    - Usar `slotSize = 60` fijo para:
      - cálculo `slotsNeeded`
      - validación de contigüidad (esperar +60 min entre slots)
      - llamada a `useWeeklySlots({ serviceDuration: 60 })` para que el fetcher calcule end times consistentemente.

### 4.2 Creación/edición de anuncios (Proveedor)
Para eliminar el “selector 30/60” y que todo quede fijo a 60:
- `src/components/services/ServiceForm.tsx`
  - Quitar `slotSize` del schema Zod y de `defaultValues`
  - Quitar la carga de `initialData.slotSize` (usar 60 fijo o eliminar el campo)
- `src/components/services/steps/ServiceDetailsStep.tsx`
  - Eliminar completamente la tarjeta/RadioGroup “Configuración de Horarios (30/60)”.
  - Mantener el resto intacto.

### 4.3 Mutations / Services / Queries (evitar leer/escribir slot_size)
- `src/hooks/useServiceMutations.ts`
  - Quitar `slot_size` del payload en create/update (porque el campo ya no existirá).
- `src/services/listingService.ts`
  - Remover `slot_size` de `UpdateListingSchema` (Zod) para que nadie intente actualizarlo.
- `src/components/client/service/useServiceDetail.ts`
  - Quitar `slot_size` del select.
- `src/components/client/results/useProvidersQuery.ts`
  - Quitar `slot_size` del select.

### 4.4 Provider calendar / slot blocking (consistencia)
- `src/hooks/useProviderListing.ts`
  - Hoy prioriza `slot_size` y eso puede volver a introducir 30.
  - Cambiarlo para que `serviceDuration` sea siempre 60 (o al menos no usar `slot_size`).
- `src/hooks/useProviderSlotManagement.ts` y `ProviderSlotBlockingGrid`
  - No necesitan cambios grandes si el `serviceDuration` que reciben pasa a ser 60 fijo.

## 5) Pruebas / Validación (smoke tests)
Siguiendo checklist interno:
1) Cliente:
   - Entrar a “Dani Nail Artist”
   - Probar reservar:
     - servicio 30 min → debe permitir seleccionar 1 slot (1h) y aparecer “Siguiente”
     - servicio 60 min → 1 slot
     - servicio 90/120 min → 2 slots consecutivos (y error claro si no hay contiguidad)
2) Proveedor:
   - Ver calendario/gestión de slots: confirmar que la grilla muestra solo slots de 1h (en semanas futuras)
   - Bloquear/desbloquear slot: sigue funcionando.
3) Admin:
   - Abrir panel y leer listados sin mutaciones.

## 6) Consideraciones y riesgos controlados
- No se modifican archivos “DO_NOT_CHANGE_BEHAVIOR” (useRecurringBooking / robustBookingSystem / etc.).
- Limpieza de `provider_time_slots` es no-destructiva para reservas existentes (no borramos slots reservados ni manualmente bloqueados).
- La eliminación de `slot_size` requiere actualizar todas las queries/mutations antes (si no, rompe compilación y/o runtime).

## 7) Entregables (qué se verá al final)
- “Dani Nail Artist” permite reservar servicios >30 min.
- Todos los anuncios operan en grilla de 1 hora, sin opción 30/60.
- DB sin columna `listings.slot_size` y sin slots futuros de 30 min.
