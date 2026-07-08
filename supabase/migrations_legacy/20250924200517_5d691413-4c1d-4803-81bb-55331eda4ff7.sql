-- Harden onvopay_customers table with normalization and constraints
-- Add normalized fields for better searching and deduplication
ALTER TABLE public.onvopay_customers
  ADD COLUMN IF NOT EXISTS normalized_email text,
  ADD COLUMN IF NOT EXISTS normalized_phone text,
  ADD COLUMN IF NOT EXISTS normalized_name text,
  ADD COLUMN IF NOT EXISTS synced_at timestamptz DEFAULT now();

-- Create unique constraint on client_id to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS uq_onvopay_customers_client_id
  ON public.onvopay_customers (client_id);

-- Create unique constraint on onvopay_customer_id to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS uq_onvopay_customers_onvopay_id
  ON public.onvopay_customers (onvopay_customer_id);

-- Create search indexes for normalized fields
CREATE INDEX IF NOT EXISTS idx_onvopay_customers_norm_email
  ON public.onvopay_customers (normalized_email);

CREATE INDEX IF NOT EXISTS idx_onvopay_customers_norm_phone
  ON public.onvopay_customers (normalized_phone);

-- Update existing records to have normalized data
UPDATE public.onvopay_customers 
SET 
  normalized_email = LOWER(TRIM(COALESCE((customer_data->>'email')::text, ''))),
  normalized_phone = REGEXP_REPLACE(COALESCE((customer_data->>'phone')::text, ''), '[^0-9]', '', 'g'),
  normalized_name = TRIM(COALESCE((customer_data->>'name')::text, '')),
  synced_at = COALESCE(synced_at, created_at)
WHERE normalized_email IS NULL;

-- RLS policies for edge functions to manage customer data
CREATE POLICY "Service role can manage onvopay customers" 
ON public.onvopay_customers 
FOR ALL 
TO service_role
USING (true) 
WITH CHECK (true);