-- Create table for provider slot preferences
CREATE TABLE IF NOT EXISTS public.provider_slot_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL,
  listing_id UUID NOT NULL,
  slot_pattern TEXT NOT NULL, -- Format: "date-time" e.g. "2024-01-15-14:00"
  is_manually_disabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure unique combination of provider, listing, and slot pattern
  UNIQUE(provider_id, listing_id, slot_pattern)
);

-- Enable RLS
ALTER TABLE public.provider_slot_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for provider slot preferences
CREATE POLICY "Providers can manage their slot preferences" 
ON public.provider_slot_preferences 
FOR ALL 
USING (auth.uid() = provider_id)
WITH CHECK (auth.uid() = provider_id);

-- Create an index for better performance
CREATE INDEX idx_provider_slot_preferences_provider_listing 
ON public.provider_slot_preferences(provider_id, listing_id);

-- Create trigger to update updated_at column
CREATE OR REPLACE FUNCTION public.update_slot_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_provider_slot_preferences_updated_at
  BEFORE UPDATE ON public.provider_slot_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_slot_preferences_updated_at();