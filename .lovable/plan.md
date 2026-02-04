
## Objetivo inmediato (error crítico)
Restaurar la visualización de horarios disponibles en **todos los anuncios**. Hoy la UI muestra “No hay más horarios…” / “No encontramos disponibilidad…” porque el sistema está quedándose sin slots futuros válidos (y/o filtrándolos) aunque el provider tenga disponibilidad configurada.

---

## Hallazgos (por qué no se ven slots)
1. **La disponibilidad del listing existe** (ej.: lunes–viernes 09:00–17:00) y tiene `minNoticeHours: 24`.
2. El frontend **sí llega a traer slots desde DB**, pero luego termina mostrando 0 por filtros.
3. En DB, para el listing afectado, **no hay slots futuros generados** (o quedan solo bloqueos/manual blocks). Esto hace que:
   - La semana actual no muestre nada (porque los slots que existían quedaron en días pasados y el filtro temporal los elimina).
   - El “lookahead” no encuentra nada en próximas semanas.
4. La migración de “regeneración de slots” probablemente **no generó nada** porque `generate_provider_time_slots_for_listing` incluye un guard de autenticación que puede fallar cuando se invoca desde migraciones/cron (no hay `auth.uid()` en ese contexto), por lo que el `DO $$ ... PERFORM generate_provider_time_slots_for_listing(...)` corre pero **no inserta**.

---

## Estrategia de solución (sin romper reglas del sistema 30 min)
### Fase A — Arreglar generación de slots en Backend (bloqueante)
**Meta:** Que `generate_provider_time_slots_for_listing` pueda ejecutarse:
- Desde la app (usuario autenticado), y
- Desde migraciones/cron (contexto sin `auth.uid()`), pero **solo para admin/service**.

**Cambio propuesto (SQL):**
1. **Actualizar el guard de auth** de `generate_provider_time_slots_for_listing` (ambas firmas) para permitir ejecución cuando:
   - `current_user` sea `postgres` (migraciones), o
   - el JWT role sea `service_role`.
   
   Ejemplo de patrón seguro:
   ```sql
   DECLARE
     v_role text := current_setting('request.jwt.claim.role', true);
   BEGIN
     IF auth.uid() IS NULL
        AND coalesce(v_role,'') <> 'service_role'
        AND current_user <> 'postgres'
     THEN
       RAISE EXCEPTION 'Not authenticated';
     END IF;
     ...
   END;
   ```

2. **Asegurar que la función sigue generando slots de 30 minutos** (ya está definido `v_slot_duration_minutes := 30`).

**Criterio de aceptación de Fase A**
- Ejecutar `generate_provider_time_slots_for_listing(provider, listing)` en migración crea slots desde `CURRENT_DATE` a +60 días.

---

### Fase B — Regeneración/Backfill de slots (para recuperar el sistema hoy)
**Meta:** Poblar el futuro con slots 30 min para todos los listings activos, sin tocar reservas existentes.

**Migración SQL de backfill:**
1. Borrado selectivo de slots futuros incorrectos (solo no reservados/no protegidos):
   - Mantener: reservados/confirmados, manual blocks, etc.
   - Borrar: “generated” futuros de duración distinta o inconsistentes (y/o limpiar “generated” futuros para re-crear limpio).

   Recomendación práctica:
   - Borrar *solo* `slot_type='generated'` a futuro (y opcionalmente también cualquier generated con duración != 30).
2. Loop por `listings.is_active = true` llamando `generate_provider_time_slots_for_listing`.

**Criterio de aceptación de Fase B**
- Cada listing activo tiene slots futuros (>= hoy) y se pueden consultar por `slot_date` en las próximas semanas.
- En al menos 1 listing de prueba, se visualizan horarios a partir del umbral de antelación (24h).

---

### Fase C — Corregir filtros frontend que pueden dejar el resultado en 0 (robustez)
Aunque el principal problema es “no hay slots futuros”, hay dos mejoras necesarias para evitar que “sí hay slots” pero el cliente igual vea 0:

1. **Filtro de “duración acomodable” en `useWeeklySlotsFetcher`**
   - Actualmente se usa un chequeo de contigüidad donde el `slotSize` se pasa incorrectamente como `serviceDuration` en algunos escenarios (esto puede filtrar todo cuando el sistema es 30 min).
   - Ajuste: usar siempre `SLOT_SYSTEM.SLOT_SIZE_MINUTES` como `slotSize` para contigüidad, y separar “duración requerida” (total del servicio) si realmente se quiere filtrar por capacidad.
   - Alternativa segura (rápida): **remover** ese filtro y confiar en la validación al click en `WeeklySlotGrid` (que ya valida contigüidad real para `slotsNeeded`).

2. **Filtro de antelación mínima (minNoticeHours)**
   - Mantener la regla, pero mejorar el comportamiento:
     - Si existen slots pero todos quedan filtrados por antelación, mostrar un mensaje específico: “No hay horarios disponibles dentro de las próximas 24h. Intenta en fechas posteriores.”

**Criterio de aceptación de Fase C**
- Si hay slots en DB posteriores a 24h, se muestran.
- Si solo hay slots dentro de 24h, la UI muestra mensaje claro (y no “no hay disponibilidad en 8 semanas”).

---

### Fase D — Prevención: mantenimiento automático
Para que no vuelva a pasar “se acabaron los slots”:
1. Confirmar/crear un job (pg_cron) diario que:
   - Recorra listings activos y regenere/complete slots faltantes a futuro (sin borrar reservas).
2. O ajustar una función tipo `maintain_future_slots` si existe, para que garantice siempre N días hacia adelante.

**Criterio de aceptación de Fase D**
- Los slots se mantienen poblados sin intervención manual.

---

## Implementación (qué archivos tocar)
### Backend (Supabase migrations)
- Nueva migración:
  - Patch de `generate_provider_time_slots_for_listing` (2 firmas) para permitir ejecución en migraciones/cron.
  - Backfill: borrar `generated` futuros según reglas y regenerar para listings activos.
  - (Opcional) fix `release_expired_slot_locks` para usar `NOW()` en lugar de `CURRENT_DATE`.

### Frontend
- `src/hooks/useWeeklySlotsFetcher.ts`
  - Ajustar/remover el filtro “accommodatableSlots” para que no elimine todo en el modelo 30 min.
  - Mensaje más claro cuando `minNoticeHours` filtra todo.

---

## Validación end-to-end (pasos de prueba)
1. Entrar a `/client/booking/:listingId` de 2–3 anuncios diferentes.
2. Confirmar que aparecen horarios (al menos para días posteriores al umbral de 24h).
3. Seleccionar un slot y confirmar que:
   - Se marca visualmente seleccionado.
   - Si la duración total requiere 2+ slots, respeta contigüidad y muestra error si hay huecos.
4. Navegar semanas (siguiente/anterior) y confirmar que no hay loops ni falsos “8 semanas sin disponibilidad”.

---

## Riesgos y mitigaciones
- **Riesgo:** abrir la función de generación a usuarios no autorizados.
  - **Mitigación:** permitir bypass solo para `postgres` (migraciones) y `service_role`; mantener `auth.uid()` requerido para ejecución normal.
- **Riesgo:** borrar slots que no deberían borrarse.
  - **Mitigación:** borrar únicamente `slot_type='generated'` futuros y `is_reserved=false`; nunca tocar reservas ni bloques manuales.

