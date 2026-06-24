-- ONVOPAY PAYMENT SYSTEM - Base de datos completa
-- =================================================

-- 1. Tabla principal de pagos Onvopay
CREATE TABLE public.onvopay_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referencias principales
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES users(id),
  client_id UUID NOT NULL REFERENCES users(id),
  
  -- Datos de Onvopay
  onvopay_transaction_id TEXT UNIQUE,
  onvopay_payment_id TEXT UNIQUE,
  external_reference TEXT,
  
  -- Montos (en centavos USD)
  amount INTEGER NOT NULL CHECK (amount >= 100 AND amount <= 5000000), -- $1 - $50K límites CR
  subtotal INTEGER NOT NULL,
  iva_amount INTEGER NOT NULL, -- 13% IVA Costa Rica
  commission_amount INTEGER NOT NULL DEFAULT 0,
  
  -- Datos del pago
  payment_type TEXT NOT NULL CHECK (payment_type IN ('cash', 'subscription')),
  payment_method TEXT NOT NULL DEFAULT 'card',
  currency TEXT NOT NULL DEFAULT 'USD',
  
  -- Estados de procesamiento
  status TEXT NOT NULL DEFAULT 'pending_authorization' 
    CHECK (status IN ('pending_authorization', 'authorized', 'captured', 'failed', 'cancelled', 'refunded')),
  
  -- Información de facturación Costa Rica
  billing_info JSONB NOT NULL DEFAULT '{}', -- teléfono, dirección CR
  card_info JSONB DEFAULT '{}', -- últimos 4 dígitos, tipo de tarjeta (encriptado)
  
  -- Timestamps detallados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  authorized_at TIMESTAMPTZ,
  captured_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  
  -- Compatibilidad con Stripe legacy
  legacy_stripe_payment_intent_id TEXT,
  
  -- Auditoría y debugging
  onvopay_response JSONB DEFAULT '{}',
  error_details JSONB DEFAULT '{}',
  retry_count INTEGER DEFAULT 0,
  migration_notes JSONB DEFAULT '{}' -- Para futura migración de Stripe
);

-- 2. Tabla de suscripciones recurrentes
CREATE TABLE public.onvopay_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referencias
  client_id UUID NOT NULL REFERENCES users(id),
  provider_id UUID NOT NULL REFERENCES users(id),
  recurring_rule_id UUID REFERENCES recurring_rules(id) ON DELETE CASCADE,
  
  -- Datos de Onvopay subscription
  onvopay_subscription_id TEXT UNIQUE,
  external_reference TEXT,
  
  -- Configuración de recurrencia
  interval_type TEXT NOT NULL CHECK (interval_type IN ('weekly', 'biweekly', 'monthly')),
  interval_count INTEGER NOT NULL DEFAULT 1,
  amount INTEGER NOT NULL CHECK (amount >= 100),
  
  -- Estado y control
  status TEXT NOT NULL DEFAULT 'active' 
    CHECK (status IN ('active', 'paused', 'cancelled', 'failed')),
  
  -- Fechas importantes
  start_date DATE NOT NULL,
  next_charge_date DATE NOT NULL,
  last_charge_date DATE,
  cancelled_at TIMESTAMPTZ,
  
  -- Control de fallos
  failed_attempts INTEGER DEFAULT 0,
  max_retry_attempts INTEGER DEFAULT 3,
  last_failure_reason TEXT,
  
  -- Herencia de datos originales
  inherit_original_data BOOLEAN NOT NULL DEFAULT true,
  original_appointment_template JSONB DEFAULT '{}', -- datos del appointment original
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tabla de webhooks Onvopay (anti-duplicados)
CREATE TABLE public.onvopay_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificación única del evento
  onvopay_event_id TEXT NOT NULL UNIQUE, -- Previene duplicados
  event_type TEXT NOT NULL,
  
  -- Referencias
  payment_id UUID REFERENCES onvopay_payments(id),
  subscription_id UUID REFERENCES onvopay_subscriptions(id),
  
  -- Control de procesamiento
  processed BOOLEAN NOT NULL DEFAULT false,
  is_duplicate BOOLEAN NOT NULL DEFAULT false,
  is_unexpected_event BOOLEAN NOT NULL DEFAULT false,
  retry_count INTEGER DEFAULT 0,
  
  -- Datos del webhook
  webhook_data JSONB NOT NULL DEFAULT '{}',
  processing_result JSONB DEFAULT '{}',
  error_details JSONB DEFAULT '{}',
  
  -- Timestamps
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- 4. Índices para performance
CREATE INDEX idx_onvopay_payments_appointment ON onvopay_payments(appointment_id);
CREATE INDEX idx_onvopay_payments_provider ON onvopay_payments(provider_id);
CREATE INDEX idx_onvopay_payments_client ON onvopay_payments(client_id);
CREATE INDEX idx_onvopay_payments_status ON onvopay_payments(status);
CREATE INDEX idx_onvopay_payments_transaction_id ON onvopay_payments(onvopay_transaction_id);

CREATE INDEX idx_onvopay_subscriptions_client ON onvopay_subscriptions(client_id);
CREATE INDEX idx_onvopay_subscriptions_provider ON onvopay_subscriptions(provider_id);
CREATE INDEX idx_onvopay_subscriptions_status ON onvopay_subscriptions(status);
CREATE INDEX idx_onvopay_subscriptions_next_charge ON onvopay_subscriptions(next_charge_date);

CREATE INDEX idx_onvopay_webhooks_event_id ON onvopay_webhooks(onvopay_event_id);
CREATE INDEX idx_onvopay_webhooks_processed ON onvopay_webhooks(processed);
CREATE INDEX idx_onvopay_webhooks_event_type ON onvopay_webhooks(event_type);

-- 5. Triggers para timestamps automáticos
CREATE OR REPLACE FUNCTION update_onvopay_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_onvopay_subscriptions_updated_at
  BEFORE UPDATE ON onvopay_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_onvopay_subscriptions_updated_at();

-- 6. Función para calcular stats de provider
CREATE OR REPLACE FUNCTION get_provider_payments_stats(p_provider_id UUID)
RETURNS TABLE(
  monthly_total NUMERIC,
  pending_count INTEGER,
  active_subscriptions INTEGER,
  commission_owed NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN op.status = 'captured' AND op.captured_at >= date_trunc('month', CURRENT_DATE) THEN op.amount / 100.0 ELSE 0 END), 0) as monthly_total,
    COUNT(CASE WHEN op.status = 'authorized' THEN 1 END)::INTEGER as pending_count,
    COUNT(DISTINCT os.id)::INTEGER as active_subscriptions,
    COALESCE(SUM(CASE WHEN op.status = 'captured' THEN op.commission_amount / 100.0 ELSE 0 END), 0) as commission_owed
  FROM onvopay_payments op
  LEFT JOIN onvopay_subscriptions os ON os.provider_id = p_provider_id AND os.status = 'active'
  WHERE op.provider_id = p_provider_id;
END;
$$;

-- 7. RLS Policies
ALTER TABLE onvopay_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE onvopay_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE onvopay_webhooks ENABLE ROW LEVEL SECURITY;

-- Policies para onvopay_payments
CREATE POLICY "Clients can view their payments" ON onvopay_payments
  FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "Providers can view their payments" ON onvopay_payments
  FOR SELECT USING (auth.uid() = provider_id);

CREATE POLICY "Service role can manage all payments" ON onvopay_payments
  FOR ALL USING (true) WITH CHECK (true);

-- Policies para onvopay_subscriptions
CREATE POLICY "Clients can view their subscriptions" ON onvopay_subscriptions
  FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "Clients can update their subscriptions" ON onvopay_subscriptions
  FOR UPDATE USING (auth.uid() = client_id);

CREATE POLICY "Providers can view their subscriptions" ON onvopay_subscriptions
  FOR SELECT USING (auth.uid() = provider_id);

CREATE POLICY "Service role can manage all subscriptions" ON onvopay_subscriptions
  FOR ALL USING (true) WITH CHECK (true);

-- Policies para webhooks (solo service role)
CREATE POLICY "Service role can manage webhooks" ON onvopay_webhooks
  FOR ALL USING (true) WITH CHECK (true);