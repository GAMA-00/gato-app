-- ================================================================
-- FIX: Eliminar trigger problemático que rompe INSERT de appointments
-- ================================================================
-- El trigger on_appointment_insert_initiate_payment causaba error 42704
-- "unrecognized configuration parameter app.settings"
-- Solución: Mover la invocación de onvopay-initiate-recurring al cliente

DROP TRIGGER IF EXISTS on_appointment_insert_initiate_payment ON appointments;
DROP FUNCTION IF EXISTS trigger_initiate_recurring_payment();

-- Comentario para documentación
COMMENT ON TABLE appointments IS 'Appointments table. Recurring payment initiation is handled client-side via onvopay-initiate-recurring edge function.';