-- Agregar 'daily' a la restricción de recurrencia en appointments
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_recurrence_check;

ALTER TABLE appointments ADD CONSTRAINT appointments_recurrence_check 
CHECK (recurrence IS NULL OR recurrence IN ('none', 'once', 'daily', 'weekly', 'biweekly', 'triweekly', 'monthly'));

-- Agregar 'daily' y 'triweekly' a la restricción de interval_type en onvopay_subscriptions
ALTER TABLE onvopay_subscriptions DROP CONSTRAINT IF EXISTS onvopay_subscriptions_interval_type_check;

ALTER TABLE onvopay_subscriptions ADD CONSTRAINT onvopay_subscriptions_interval_type_check 
CHECK (interval_type IN ('daily', 'weekly', 'biweekly', 'triweekly', 'monthly'));

-- Log de cambios
DO $$
BEGIN
  RAISE NOTICE '✅ Restricciones actualizadas: appointments ahora acepta "daily", subscriptions acepta "daily" y "triweekly"';
END $$;