-- Modificar columnas de amount en onvopay_subscriptions para soportar decimales
ALTER TABLE onvopay_subscriptions 
ALTER COLUMN amount TYPE NUMERIC(10, 2);

-- Modificar columnas de amount en onvopay_payments para soportar decimales
ALTER TABLE onvopay_payments 
ALTER COLUMN amount TYPE NUMERIC(10, 2),
ALTER COLUMN subtotal TYPE NUMERIC(10, 2),
ALTER COLUMN iva_amount TYPE NUMERIC(10, 2),
ALTER COLUMN commission_amount TYPE NUMERIC(10, 2);

-- Agregar comentarios para documentación
COMMENT ON COLUMN onvopay_subscriptions.amount IS 'Subscription amount in USD with 2 decimal precision';
COMMENT ON COLUMN onvopay_payments.amount IS 'Payment amount in USD with 2 decimal precision';
COMMENT ON COLUMN onvopay_payments.subtotal IS 'Payment subtotal in USD with 2 decimal precision';
COMMENT ON COLUMN onvopay_payments.iva_amount IS 'IVA amount in USD with 2 decimal precision';
COMMENT ON COLUMN onvopay_payments.commission_amount IS 'Commission amount in USD with 2 decimal precision';