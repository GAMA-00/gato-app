
## Objetivo
Restaurar la visualización de slots disponibles en la pantalla "Reservar Servicio" regenerando correctamente los horarios de 30 minutos para todos los anuncios activos.

---

## Diagnóstico del problema actual
1. **Slots no se generaron correctamente**: La migración anterior no pobló slots futuros. Para el listing `c64ce17e-...`:
   - Solo existen 2 slots futuros (2026-02-04 y 2026-02-05)
   - Ambos están marcados como `is_available=false`, `is_reserved=true`
   - No hay ningún slot disponible para reservar
   
2. **Las citas están canceladas**: Aunque hay citas canceladas que deberían haber liberado slots, los triggers de liberación (`release_slot_on_cancellation`) no funcionan correctamente con el nuevo sistema de 30 minutos porque buscan coincidencia exacta de `slot_datetime_start` y `slot_datetime_end` (asumiendo que cita = 1 slot).

3. **La disponibilidad del proveedor SÍ existe**: El proveedor tiene configurado Lunes-Viernes 07:00-17:00, lo cual debería generar 20 slots de 30 minutos por día.

---

## Solución propuesta

### Fase 1: Migración SQL - Regenerar slots futuros

**Acciones:**
1. **Actualizar triggers de liberación de slots** para que funcionen con multi-slot:
   - `mark_slot_as_reserved()` y `release_slot_on_cancellation()` deben buscar slots por rango (`>=` y `<` en lugar de igualdad exacta).

2. **Liberar slots huérfanos**: Resetear `is_reserved=false`, `is_available=true` para slots cuyas citas asociadas están canceladas.

3. **Eliminar slots futuros generados** (respetando bloqueos manuales):
   ```sql
   DELETE FROM provider_time_slots
   WHERE slot_date >= CURRENT_DATE
     AND is_reserved = false
     AND slot_type = 'generated';
   ```

4. **Regenerar slots para todos los listings activos** usando `generate_provider_time_slots_for_listing()`.

5. **Agregar cron job** para mantenimiento automático diario (si no existe ya).

### Fase 2: (Opcional) Ajuste frontend
El frontend ya está correcto según el código revisado; la causa raíz es la falta de datos en la base de datos.

---

## Detalle técnico de la migración

```text
-- 1. Actualizar trigger para multi-slot (mark_slot_as_reserved)
CREATE OR REPLACE FUNCTION public.mark_slot_as_reserved()
RETURNS trigger AS $$
BEGIN
  UPDATE provider_time_slots
  SET is_reserved = true, is_available = false
  WHERE provider_id = NEW.provider_id
    AND listing_id = NEW.listing_id
    AND slot_datetime_start >= NEW.start_time
    AND slot_datetime_start < NEW.end_time;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Actualizar trigger para multi-slot (release_slot_on_cancellation)
CREATE OR REPLACE FUNCTION public.release_slot_on_cancellation()
RETURNS trigger AS $$
BEGIN
  IF NEW.status IN ('cancelled', 'rejected') 
     AND OLD.status NOT IN ('cancelled', 'rejected') THEN
    UPDATE provider_time_slots
    SET is_reserved = false, is_available = true
    WHERE provider_id = NEW.provider_id
      AND listing_id = NEW.listing_id
      AND slot_datetime_start >= NEW.start_time
      AND slot_datetime_start < NEW.end_time
      AND slot_type = 'reserved';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Liberar slots huérfanos de citas canceladas
UPDATE provider_time_slots pts
SET is_reserved = false, is_available = true
WHERE is_reserved = true
  AND slot_type IN ('reserved', 'generated')
  AND slot_date >= CURRENT_DATE
  AND NOT EXISTS (
    SELECT 1 FROM appointments a
    WHERE a.provider_id = pts.provider_id
      AND a.listing_id = pts.listing_id
      AND a.status IN ('pending', 'confirmed')
      AND pts.slot_datetime_start >= a.start_time
      AND pts.slot_datetime_start < a.end_time
  );

-- 4. Eliminar slots generated futuros no reservados (preservando manuales)
DELETE FROM provider_time_slots
WHERE slot_date >= CURRENT_DATE
  AND is_reserved = false
  AND slot_type = 'generated';

-- 5. Regenerar slots para cada listing activo
DO $$
DECLARE
  v_listing RECORD;
BEGIN
  FOR v_listing IN 
    SELECT l.id as listing_id, l.provider_id 
    FROM listings l WHERE l.is_active = true
  LOOP
    PERFORM generate_provider_time_slots_for_listing(
      v_listing.provider_id, 
      v_listing.listing_id
    );
  END LOOP;
END;
$$;

-- 6. Programar cron job de mantenimiento (si no existe)
SELECT cron.schedule(
  'maintain-future-slots-daily',
  '0 3 * * *',
  $$SELECT maintain_future_slots();$$
);
```

---

## Archivos a modificar
- **Nueva migración SQL** (Supabase) con los cambios anteriores

---

## Criterios de aceptación
1. Cada listing activo tiene slots futuros disponibles (>= hoy hasta +60 días).
2. La pantalla "Reservar Servicio" muestra horarios disponibles.
3. Los slots de citas canceladas se liberan automáticamente.
4. Los bloqueos manuales de proveedores se mantienen intactos.
5. El cron job garantiza disponibilidad continua.

---

## Riesgos y mitigaciones
- **Riesgo:** Borrar accidentalmente bloqueos manuales.
  - **Mitigación:** Solo eliminar `slot_type = 'generated'` y `is_reserved = false`.
- **Riesgo:** El cron job de pg_cron no se crea si ya existe.
  - **Mitigación:** Verificar existencia antes de crear o usar `ON CONFLICT`.

