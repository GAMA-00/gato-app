-- Fix duplicate customer prevention and improve OnvoPay customer management
-- This addresses payment processing errors and prevents duplicate customer creation

-- Add unique constraints to prevent duplicate OnvoPay customers
-- First, clean any existing duplicates (if any)
DELETE FROM onvopay_customers a USING onvopay_customers b 
WHERE a.id > b.id 
AND a.client_id = b.client_id;

-- Add unique constraint on client_id to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_onvopay_customers_client_id_unique 
ON onvopay_customers(client_id);

-- Add composite unique constraint on normalized identifiers to prevent duplicates by email/phone
CREATE UNIQUE INDEX IF NOT EXISTS idx_onvopay_customers_email_unique 
ON onvopay_customers(normalized_email) 
WHERE normalized_email IS NOT NULL AND normalized_email != '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_onvopay_customers_phone_unique 
ON onvopay_customers(normalized_phone) 
WHERE normalized_phone IS NOT NULL AND normalized_phone != '';

-- Add performance index for customer lookups
CREATE INDEX IF NOT EXISTS idx_onvopay_customers_lookup 
ON onvopay_customers(client_id, normalized_email, normalized_phone);

-- Update the customer data to include created timestamp
UPDATE onvopay_customers 
SET customer_data = jsonb_set(
  customer_data, 
  '{sync_enhanced_at}', 
  to_jsonb(now()::text)
) 
WHERE customer_data ? 'id';