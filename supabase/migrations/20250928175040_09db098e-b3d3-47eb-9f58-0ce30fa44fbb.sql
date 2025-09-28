-- Add slot_size field to listings table for configurable slot system
ALTER TABLE public.listings 
ADD COLUMN slot_size integer NOT NULL DEFAULT 60;

-- Add check constraint to ensure slot_size is either 30 or 60 minutes
ALTER TABLE public.listings 
ADD CONSTRAINT slot_size_check CHECK (slot_size IN (30, 60));

-- Create index for performance when filtering by slot_size
CREATE INDEX idx_listings_slot_size ON public.listings(slot_size);

-- Update existing listings to have 60-minute slots (maintaining current behavior)
UPDATE public.listings 
SET slot_size = 60 
WHERE slot_size IS NULL;