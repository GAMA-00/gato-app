-- Add cycle_metadata column to onvopay_payments for recurring charge tracking
ALTER TABLE onvopay_payments
ADD COLUMN IF NOT EXISTS cycle_metadata JSONB DEFAULT '{}';

COMMENT ON COLUMN onvopay_payments.cycle_metadata IS 
'Metadata para cobros recurrentes: { cycle_n, auto_charge, retry_count, subscription_id }';

-- Create index for faster queries on recurring charges
CREATE INDEX IF NOT EXISTS idx_onvopay_payments_cycle_metadata 
ON onvopay_payments USING gin(cycle_metadata);

-- Update existing recurring payments to have proper cycle_metadata
UPDATE onvopay_payments
SET cycle_metadata = jsonb_build_object(
  'cycle_n', 0,
  'auto_charge', false,
  'migrated', true
)
WHERE payment_type IN ('recurring_initial', 'recurring_charge')
  AND cycle_metadata = '{}';