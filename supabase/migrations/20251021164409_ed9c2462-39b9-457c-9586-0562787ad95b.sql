-- Add payment_type column to onvopay_payments table
-- This column tracks whether a payment is prepaid, postpaid, or recurring

-- Add the column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'onvopay_payments' 
    AND column_name = 'payment_type'
  ) THEN
    ALTER TABLE public.onvopay_payments 
    ADD COLUMN payment_type TEXT DEFAULT 'prepaid' 
    CHECK (payment_type IN ('prepaid', 'postpaid', 'recurring'));
  END IF;
END $$;

-- Update existing records to have payment_type = 'prepaid'
UPDATE public.onvopay_payments 
SET payment_type = 'prepaid' 
WHERE payment_type IS NULL;

-- Create index for faster queries by payment_type
CREATE INDEX IF NOT EXISTS idx_onvopay_payments_payment_type 
ON public.onvopay_payments(payment_type);

-- Add comment to document the column
COMMENT ON COLUMN public.onvopay_payments.payment_type IS 
'Type of payment: prepaid (T1 base for prepaid services), postpaid (T1 base or T2 additional for postpaid services), recurring (automatic charges for subscriptions)';
