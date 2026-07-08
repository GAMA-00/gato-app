-- =====================================================
-- CORRECCIÓN: Materializar y bloquear slots recurrentes futuros
-- =====================================================
-- Este script procesa todas las citas recurrentes activas y bloquea
-- sus slots futuros correspondientes hasta 12 semanas adelante

DO $$
DECLARE
  appointment_record RECORD;
  weeks_ahead INTEGER := 12;
  current_date_iter DATE;
  week_offset INTEGER;
  v_slot_datetime_start TIMESTAMPTZ;
  v_slot_datetime_end TIMESTAMPTZ;
  v_slot_date DATE;
  v_start_time TIME;
  v_end_time TIME;
  slots_processed INTEGER := 0;
  total_blocked INTEGER := 0;
BEGIN
  RAISE LOG '🔄 Iniciando materialización de slots recurrentes futuros...';
  
  -- Procesar cada cita recurrente activa
  FOR appointment_record IN 
    SELECT 
      id,
      provider_id,
      listing_id,
      start_time,
      end_time,
      recurrence,
      status
    FROM appointments
    WHERE recurrence IS NOT NULL
      AND recurrence NOT IN ('none', '', 'once')
      AND status IN ('pending', 'confirmed')
      AND start_time >= NOW() -- Solo citas futuras o actuales
    ORDER BY start_time
  LOOP
    RAISE LOG '📅 Procesando cita recurrente: % (recurrence: %)', 
      appointment_record.id, appointment_record.recurrence;
    
    slots_processed := 0;
    
    -- Generar y bloquear slots futuros según el tipo de recurrencia
    FOR week_offset IN 1..weeks_ahead LOOP
      -- Calcular la fecha del slot basado en el tipo de recurrencia
      CASE appointment_record.recurrence
        WHEN 'weekly' THEN
          current_date_iter := (appointment_record.start_time::DATE) + (week_offset * 7);
        WHEN 'biweekly' THEN
          IF week_offset % 2 = 0 THEN
            current_date_iter := (appointment_record.start_time::DATE) + (week_offset * 7);
          ELSE
            CONTINUE; -- Saltar semanas impares para biweekly
          END IF;
        WHEN 'triweekly' THEN
          IF week_offset % 3 = 0 THEN
            current_date_iter := (appointment_record.start_time::DATE) + (week_offset * 7);
          ELSE
            CONTINUE; -- Saltar semanas que no son múltiplos de 3
          END IF;
        WHEN 'monthly' THEN
          -- Para mensual, aproximar con múltiplos de 4 semanas
          IF week_offset % 4 = 0 THEN
            current_date_iter := (appointment_record.start_time::DATE) + (week_offset * 7);
          ELSE
            CONTINUE;
          END IF;
        ELSE
          CONTINUE; -- Tipo de recurrencia no reconocido
      END CASE;
      
      -- Construir los timestamps completos manteniendo la hora original
      v_slot_datetime_start := current_date_iter + (appointment_record.start_time::TIME);
      v_slot_datetime_end := current_date_iter + (appointment_record.end_time::TIME);
      
      -- Convertir a UTC usando timezone de Costa Rica
      v_slot_datetime_start := v_slot_datetime_start AT TIME ZONE 'America/Costa_Rica';
      v_slot_datetime_end := v_slot_datetime_end AT TIME ZONE 'America/Costa_Rica';
      
      -- Extraer componentes para insertar
      v_slot_date := current_date_iter;
      v_start_time := appointment_record.start_time::TIME;
      v_end_time := appointment_record.end_time::TIME;
      
      -- Insertar o actualizar el slot como bloqueado por recurrencia
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
        recurring_blocked,
        slot_type
      ) VALUES (
        appointment_record.provider_id,
        appointment_record.listing_id,
        v_slot_date,
        v_start_time,
        v_end_time,
        v_slot_datetime_start,
        v_slot_datetime_end,
        false, -- No disponible
        false, -- No es una reserva temporal
        true,  -- Bloqueado por recurrencia
        'recurring' -- Tipo de slot
      )
      ON CONFLICT (provider_id, listing_id, slot_date, start_time)
      DO UPDATE SET
        -- Solo actualizar si no está reservado (no sobrescribir reservas reales)
        is_available = CASE 
          WHEN provider_time_slots.is_reserved = true THEN provider_time_slots.is_available
          ELSE false
        END,
        recurring_blocked = CASE
          WHEN provider_time_slots.is_reserved = true THEN provider_time_slots.recurring_blocked
          ELSE true
        END,
        slot_type = CASE
          WHEN provider_time_slots.is_reserved = true THEN provider_time_slots.slot_type
          ELSE 'recurring'
        END,
        slot_datetime_start = CASE
          WHEN provider_time_slots.is_reserved = true THEN provider_time_slots.slot_datetime_start
          ELSE v_slot_datetime_start
        END,
        slot_datetime_end = CASE
          WHEN provider_time_slots.is_reserved = true THEN provider_time_slots.slot_datetime_end
          ELSE v_slot_datetime_end
        END,
        end_time = CASE
          WHEN provider_time_slots.is_reserved = true THEN provider_time_slots.end_time
          ELSE v_end_time
        END;
      
      slots_processed := slots_processed + 1;
    END LOOP;
    
    total_blocked := total_blocked + slots_processed;
    RAISE LOG '✅ Bloqueados % slots para cita %', slots_processed, appointment_record.id;
  END LOOP;
  
  RAISE LOG '🎉 Materialización completa: % slots bloqueados en total', total_blocked;
END $$;