
## Problema

Los slots se están generando empezando a la 1:00 AM cuando el proveedor configuró disponibilidad de 7:00 AM a 5:00 PM. Esto ocurre por un problema de interpretación de zona horaria.

## Causa Raíz

La función SQL `generate_provider_time_slots_for_listing` combina la fecha con la hora de disponibilidad sin especificar zona horaria:

```sql
-- Línea 74 de la migración actual
v_slot_start := v_current_date + v_window_start;
```

Esto crea un `timestamp with time zone` interpretando `07:00` como **UTC**. Cuando el cliente ve estos slots, su navegador (en America/Mexico_City, UTC-6) convierte `07:00 UTC` a `01:00 AM` hora local.

### Flujo actual (incorrecto):
```text
Proveedor configura: 07:00 - 17:00 (pensando en hora local)
         ↓
SQL interpreta: 07:00 UTC - 17:00 UTC
         ↓
Slot guardado: slot_datetime_start = 2026-02-05 07:00:00+00
         ↓
Frontend convierte a local: new Date('2026-02-05T07:00:00+00')
         ↓
Usuario ve: 01:00 AM (UTC-6)
```

### Flujo corregido:
```text
Proveedor configura: 07:00 - 17:00 (hora local America/Mexico_City)
         ↓
SQL interpreta: 07:00 AT TIME ZONE 'America/Mexico_City' → 13:00 UTC
         ↓
Slot guardado: slot_datetime_start = 2026-02-05 13:00:00+00
         ↓
Frontend convierte a local: new Date('2026-02-05T13:00:00+00')
         ↓
Usuario ve: 07:00 AM (correcto)
```

## Solución

### Modificación SQL

Actualizar la función `generate_provider_time_slots_for_listing` para interpretar los tiempos de disponibilidad en la zona horaria correcta (America/Mexico_City):

```sql
-- Antes (línea 74)
v_slot_start := v_current_date + v_window_start;

-- Después
v_slot_start := (v_current_date + v_window_start) AT TIME ZONE 'America/Mexico_City';
v_window_end_tz := (v_current_date + v_window_end) AT TIME ZONE 'America/Mexico_City';
```

También se debe:
1. Actualizar las columnas `start_time` y `end_time` para almacenar la hora LOCAL correcta (no UTC)
2. Regenerar todos los slots futuros con la lógica corregida

### Detalle técnico de la migración

```sql
-- 1. Recrear función con timezone fix
DROP FUNCTION IF EXISTS public.generate_provider_time_slots_for_listing(uuid, uuid, integer);

CREATE FUNCTION public.generate_provider_time_slots_for_listing(
  p_provider_id uuid,
  p_listing_id uuid,
  p_days_ahead integer DEFAULT 60
)
RETURNS integer AS $$
DECLARE
  v_timezone text := 'America/Mexico_City';  -- Zona horaria del sistema
  v_slot_size integer := 30;
  v_provider_avail RECORD;
  v_current_date date;
  v_end_date date;
  v_day_of_week integer;
  v_slot_start timestamp with time zone;
  v_slot_end timestamp with time zone;
  v_window_end_tz timestamp with time zone;
  v_slots_created integer := 0;
  v_window_start time;
  v_window_end time;
  v_local_start_time time;
  v_local_end_time time;
BEGIN
  v_current_date := CURRENT_DATE;
  v_end_date := v_current_date + p_days_ahead;

  WHILE v_current_date <= v_end_date LOOP
    v_day_of_week := EXTRACT(DOW FROM v_current_date)::integer;

    FOR v_provider_avail IN
      SELECT start_time, end_time
      FROM provider_availability
      WHERE provider_id = p_provider_id
        AND day_of_week = v_day_of_week
        AND is_active = true
    LOOP
      v_window_start := v_provider_avail.start_time;
      v_window_end := v_provider_avail.end_time;

      -- CRITICAL FIX: Interpretar hora como hora LOCAL, no UTC
      v_slot_start := (v_current_date + v_window_start) AT TIME ZONE v_timezone;
      v_window_end_tz := (v_current_date + v_window_end) AT TIME ZONE v_timezone;
      
      WHILE (v_slot_start + (v_slot_size || ' minutes')::interval) <= v_window_end_tz LOOP
        v_slot_end := v_slot_start + (v_slot_size || ' minutes')::interval;

        IF v_slot_start > NOW() THEN
          -- Extraer hora local para start_time/end_time
          v_local_start_time := (v_slot_start AT TIME ZONE v_timezone)::time;
          v_local_end_time := (v_slot_end AT TIME ZONE v_timezone)::time;
          
          INSERT INTO provider_time_slots (
            provider_id, listing_id, slot_date, start_time, end_time,
            slot_datetime_start, slot_datetime_end, is_available, is_reserved, slot_type
          )
          VALUES (
            p_provider_id, p_listing_id, v_current_date,
            v_local_start_time,  -- Hora local
            v_local_end_time,    -- Hora local
            v_slot_start, v_slot_end, true, false, 'generated'
          )
          ON CONFLICT (provider_id, listing_id, slot_datetime_start) DO NOTHING;
          v_slots_created := v_slots_created + 1;
        END IF;

        v_slot_start := v_slot_end;
      END LOOP;
    END LOOP;

    v_current_date := v_current_date + 1;
  END LOOP;

  RETURN v_slots_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Limpiar y regenerar slots
DELETE FROM provider_time_slots
WHERE slot_date >= CURRENT_DATE
  AND is_reserved = false
  AND slot_type = 'generated';

-- 3. Regenerar para todos los listings activos
DO $regen$
DECLARE
  v_listing RECORD;
BEGIN
  FOR v_listing IN 
    SELECT l.id as listing_id, l.provider_id 
    FROM listings l WHERE l.is_active = true
  LOOP
    PERFORM public.generate_provider_time_slots_for_listing(
      v_listing.provider_id, v_listing.listing_id, 60
    );
  END LOOP;
END;
$regen$;
```

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| Nueva migración SQL | Corregir `generate_provider_time_slots_for_listing` con `AT TIME ZONE` |

## Nota sobre la zona horaria

La solución usa `'America/Mexico_City'` como zona horaria fija. En el futuro, se podría hacer dinámico almacenando la zona horaria del proveedor en su perfil o en el listing.

## Criterios de aceptación

1. Los slots aparecen empezando a las 7:00 AM (no 1:00 AM)
2. El rango de slots corresponde exactamente con la disponibilidad configurada (7:00 AM - 5:00 PM)
3. Se generan 20 slots de 30 minutos por día de disponibilidad
4. Los slots existentes con reservas no se ven afectados
