-- Agregar columna payment_method_id para almacenar método de pago para cobros futuros
ALTER TABLE public.onvopay_subscriptions 
ADD COLUMN IF NOT EXISTS payment_method_id TEXT;

-- Crear índice para mejorar búsquedas por método de pago
CREATE INDEX IF NOT EXISTS idx_onvopay_subscriptions_payment_method 
ON public.onvopay_subscriptions(payment_method_id);

-- Crear índice para búsquedas de cobros pendientes
CREATE INDEX IF NOT EXISTS idx_onvopay_subscriptions_next_charge 
ON public.onvopay_subscriptions(status, next_charge_date) 
WHERE status = 'active';