-- Eliminar check constraint obsoleto que requiere amount >= 100
-- Este constraint fue diseñado para INTEGER en centavos, 
-- pero ahora usamos NUMERIC en dólares
ALTER TABLE onvopay_subscriptions 
DROP CONSTRAINT IF EXISTS onvopay_subscriptions_amount_check;

-- Agregar nuevo constraint más permisivo (solo validar > 0)
ALTER TABLE onvopay_subscriptions 
ADD CONSTRAINT onvopay_subscriptions_amount_positive 
CHECK (amount > 0);

-- Documentar el cambio
COMMENT ON CONSTRAINT onvopay_subscriptions_amount_positive ON onvopay_subscriptions 
IS 'Amount must be positive (in USD with 2 decimal precision)';