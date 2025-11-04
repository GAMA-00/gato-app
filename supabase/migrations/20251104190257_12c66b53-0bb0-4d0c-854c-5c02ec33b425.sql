-- ========================================================
-- ELIMINACIÓN DE CRON JOBS OBSOLETOS DE PAGOS RECURRENTES
-- ========================================================
-- Los cobros recurrentes ahora se manejan automáticamente
-- mediante OnvoPay Loops y el flujo de aceptación del proveedor

-- 1. Eliminar cron job que se ejecuta cada hora
SELECT cron.unschedule('process-pending-recurring-charges');

-- 2. Eliminar cron job diario 
SELECT cron.unschedule('process-recurring-charges-daily');

-- 3. Comentar (deprecar) la función SQL que procesaba cobros pendientes
COMMENT ON FUNCTION process_pending_recurring_charges() IS 
  'DEPRECATED: Esta función ya no se usa. Los cobros recurrentes se procesan automáticamente mediante OnvoPay Loops cuando el proveedor acepta la cita.';

-- 4. Limpiar pagos en estado pending_authorization que fueron creados por los cron jobs
-- (Solo aquellos que tienen un pago exitoso para la misma cita)
UPDATE onvopay_payments p1
SET status = 'cancelled',
    cancelled_at = NOW(),
    error_details = jsonb_build_object(
      'reason', 'Duplicate payment cancelled - valid payment exists',
      'cancelled_by_migration', '20251104190000'
    )
WHERE p1.status = 'pending_authorization'
  AND p1.payment_type IN ('recurring', 'recurring_initial', 'subscription')
  AND EXISTS (
    SELECT 1 FROM onvopay_payments p2
    WHERE p2.appointment_id = p1.appointment_id
      AND p2.status IN ('captured', 'authorized')
      AND p2.id != p1.id
  );

-- 5. Log de los cambios realizados
DO $$
DECLARE
  cancelled_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO cancelled_count
  FROM onvopay_payments
  WHERE status = 'cancelled'
    AND error_details->>'cancelled_by_migration' = '20251104190000';
    
  RAISE NOTICE '✅ Migración completada:';
  RAISE NOTICE '   - Cron jobs eliminados: 2';
  RAISE NOTICE '   - Pagos duplicados cancelados: %', cancelled_count;
  RAISE NOTICE '   - Los cobros recurrentes ahora se manejan exclusivamente mediante OnvoPay Loops';
END $$;