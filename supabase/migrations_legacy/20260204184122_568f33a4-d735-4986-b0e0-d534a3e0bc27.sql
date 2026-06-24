-- ============================================================
-- FASE A & B: Arreglar guard de auth + Regenerar slots futuros
-- ============================================================

-- Drop existing maintain_future_slots to allow recreation with different signature
DROP FUNCTION IF EXISTS public.maintain_future_slots();

-- Fase A: Actualizar la función generate_provider_time_slots_for_listing
-- para permitir ejecución desde migraciones/cron (sin auth.uid())

CREATE OR REPLACE FUNCTION public.generate_provider_time_slots_for_listing(
  p_provider_id uuid,
  p_listing_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing RECORD;
  v_avail RECORD;
  v_current_date DATE;
  v_end_date DATE;
  v_slot_start TIME;
  v_slot_end TIME;
  v_slot_datetime_start TIMESTAMPTZ;
  v_slot_datetime_end TIMESTAMPTZ;
  v_days_ahead INTEGER := 60;
  v_slot_duration_minutes INTEGER := 30; -- Sistema global: 30 minutos
  v_day_of_week INTEGER;
  v_role text;
BEGIN
  -- SECURITY CHECK: Allow execution from migrations/cron OR authenticated users
  v_role := current_setting('request.jwt.claim.role', true);
  
  IF auth.uid() IS NULL 
     AND COALESCE(v_role, '') <> 'service_role'
     AND current_user <> 'postgres'
  THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Obtener información del listing
  SELECT * INTO v_listing
  FROM listings
  WHERE id = p_listing_id AND provider_id = p_provider_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Listing not found or does not belong to provider';
  END IF;

  -- Calcular fechas
  v_current_date := CURRENT_DATE;
  v_end_date := v_current_date + (v_days_ahead || ' days')::INTERVAL;

  -- Generar slots para cada día en el rango
  WHILE v_current_date <= v_end_date LOOP
    v_day_of_week := EXTRACT(DOW FROM v_current_date)::INTEGER;
    
    -- Buscar disponibilidad para este día de la semana
    FOR v_avail IN
      SELECT pa.start_time, pa.end_time
      FROM provider_availability pa
      WHERE pa.provider_id = p_provider_id
        AND pa.day_of_week = v_day_of_week
        AND pa.is_active = true
    LOOP
      -- Generar slots de 30 minutos dentro del rango de disponibilidad
      v_slot_start := v_avail.start_time;
      
      WHILE v_slot_start + (v_slot_duration_minutes || ' minutes')::INTERVAL <= v_avail.end_time LOOP
        v_slot_end := v_slot_start + (v_slot_duration_minutes || ' minutes')::INTERVAL;
        
        -- Crear timestamp completo
        v_slot_datetime_start := (v_current_date || ' ' || v_slot_start)::TIMESTAMPTZ;
        v_slot_datetime_end := (v_current_date || ' ' || v_slot_end)::TIMESTAMPTZ;
        
        -- Insertar slot (ON CONFLICT para evitar duplicados)
        INSERT INTO provider_time_slots (
          provider_id,
          listing_id,
          slot_date,
          start_time,
          end_time,
          slot_datetime_start,
          slot_datetime_end,
          is_available,
          is_reserved,
          slot_type
        ) VALUES (
          p_provider_id,
          p_listing_id,
          v_current_date,
          v_slot_start,
          v_slot_end,
          v_slot_datetime_start,
          v_slot_datetime_end,
          true,
          false,
          'generated'
        )
        ON CONFLICT (provider_id, listing_id, slot_datetime_start) 
        DO NOTHING;
        
        v_slot_start := v_slot_end;
      END LOOP;
    END LOOP;
    
    v_current_date := v_current_date + INTERVAL '1 day';
  END LOOP;
END;
$$;

-- ============================================================
-- FASE B: Backfill de slots para todos los listings activos
-- ============================================================

-- Paso 1: Eliminar slots "generated" futuros no reservados
-- (Esto limpia slots de 60 min que pudieron quedar y permite regenerar limpios)
DELETE FROM provider_time_slots
WHERE slot_date >= CURRENT_DATE
  AND is_reserved = false
  AND slot_type = 'generated';

-- Paso 2: Regenerar slots para cada listing activo
DO $$
DECLARE
  v_listing RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_listing IN 
    SELECT l.id as listing_id, l.provider_id 
    FROM listings l
    WHERE l.is_active = true
  LOOP
    BEGIN
      PERFORM generate_provider_time_slots_for_listing(v_listing.provider_id, v_listing.listing_id);
      v_count := v_count + 1;
      RAISE NOTICE 'Generated slots for listing %', v_listing.listing_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error generating slots for listing %: %', v_listing.listing_id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Total listings processed: %', v_count;
END;
$$;

-- ============================================================
-- FASE D: Recrear maintain_future_slots con void return
-- ============================================================

CREATE OR REPLACE FUNCTION public.maintain_future_slots()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing RECORD;
  v_count INTEGER := 0;
  v_role text;
BEGIN
  -- SECURITY CHECK: Allow execution from migrations/cron OR service role
  v_role := current_setting('request.jwt.claim.role', true);
  
  IF auth.uid() IS NULL 
     AND COALESCE(v_role, '') <> 'service_role'
     AND current_user <> 'postgres'
  THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Recorrer todos los listings activos y regenerar/completar slots
  FOR v_listing IN 
    SELECT l.id as listing_id, l.provider_id 
    FROM listings l
    WHERE l.is_active = true
  LOOP
    BEGIN
      PERFORM generate_provider_time_slots_for_listing(v_listing.provider_id, v_listing.listing_id);
      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error maintaining slots for listing %: %', v_listing.listing_id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Maintained slots for % listings', v_count;
END;
$$;