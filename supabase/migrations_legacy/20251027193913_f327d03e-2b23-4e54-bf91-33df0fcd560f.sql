-- ============================================================================
-- FIX: Permitir que citas recurrentes cambien a 'completed'
-- ============================================================================
-- PROBLEMA: La función mark_past_appointments_completed() excluía citas recurrentes
-- SOLUCIÓN: Permitir que TODAS las citas (incluyendo recurrentes) se completen
--           cuando su end_time ha pasado
-- ============================================================================

CREATE OR REPLACE FUNCTION public.mark_past_appointments_completed()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  updated_count INTEGER := 0;
BEGIN
  -- ✅ Marcar TODAS las citas (incluyendo recurrentes) como completed
  -- cuando han finalizado hace más de 1 hora
  -- 
  -- IMPORTANTE: Cada instancia de una cita recurrente debe completarse individualmente
  -- El patrón recurrente se maneja en onvopay_subscriptions (separado del appointment)
  UPDATE appointments 
  SET status = 'completed'
  WHERE status = 'confirmed' 
    AND end_time < (NOW() - INTERVAL '1 hour');
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Log para debugging
  IF updated_count > 0 THEN
    RAISE NOTICE '✅ Marcadas % citas como completed (incluyendo recurrentes)', updated_count;
  END IF;
  
  RETURN updated_count;
END;
$$;

-- ============================================================================
-- COMENTARIO: Este cambio permite que el trigger 
-- on_appointment_completed_charge_membership se dispare correctamente
-- para procesar cobros recurrentes cuando el servicio finaliza
-- ============================================================================