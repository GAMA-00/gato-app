-- Add currency column to listings table with USD as default
ALTER TABLE public.listings 
ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD';

-- Create constraint for valid currency values
ALTER TABLE public.listings 
ADD CONSTRAINT listings_currency_check 
CHECK (currency IN ('USD', 'CRC'));

-- Update the manicurist listing to CRC (Dani Nail Artist)
UPDATE public.listings 
SET currency = 'CRC' 
WHERE id = '0ef24dac-e461-455e-a1fe-71174077ba83';