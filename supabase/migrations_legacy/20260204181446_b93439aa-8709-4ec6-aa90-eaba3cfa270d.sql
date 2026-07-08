-- ================================================
-- FASE 1: Regeneración de slots de 60min a 30min
-- ================================================
-- Esta migración elimina slots de 60 minutos no reservados
-- y regenera todos los slots como 30 minutos

-- Paso 1: Eliminar slots de 60 minutos que NO están reservados
-- (Protege slots reservados y manualmente bloqueados)
DELETE FROM provider_time_slots
WHERE slot_date >= CURRENT_DATE
  AND is_reserved = false
  AND slot_type != 'manually_blocked'
  AND EXTRACT(EPOCH FROM (slot_datetime_end - slot_datetime_start))/60 = 60;

-- Paso 2: Regenerar slots de 30 minutos para cada listing activo
DO $$
DECLARE
  v_listing RECORD;
  v_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Iniciando regeneración de slots de 30 minutos...';
  
  FOR v_listing IN 
    SELECT DISTINCT l.id, l.provider_id 
    FROM listings l
    WHERE l.is_active = true
  LOOP
    BEGIN
      PERFORM generate_provider_time_slots_for_listing(v_listing.provider_id, v_listing.id);
      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error regenerando slots para listing %: %', v_listing.id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Regeneración completada: % listings procesados', v_count;
END;
$$;