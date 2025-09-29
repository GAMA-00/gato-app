-- Add OnvoPay payment method ID to payment_methods table
-- This links saved cards with OnvoPay payment method tokens for future use

ALTER TABLE payment_methods
ADD COLUMN IF NOT EXISTS onvopay_payment_method_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_methods_onvopay_id
ON payment_methods(onvopay_payment_method_id)
WHERE onvopay_payment_method_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN payment_methods.onvopay_payment_method_id IS
'OnvoPay payment method ID (pm_xxx) for tokenized card storage and reuse';