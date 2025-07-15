-- Create table for post-payment evidence (invoice photos, receipts, etc.)
CREATE TABLE public.post_payment_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'invoice', 'receipt', 'other'
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.post_payment_evidence ENABLE ROW LEVEL SECURITY;

-- Create policies for post_payment_evidence
CREATE POLICY "Providers can manage their post payment evidence"
ON public.post_payment_evidence
FOR ALL
USING (auth.uid() = provider_id)
WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Clients can view evidence for their appointments"
ON public.post_payment_evidence
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM appointments 
    WHERE appointments.id = post_payment_evidence.appointment_id 
    AND appointments.client_id = auth.uid()
  )
);

-- Add index for better performance
CREATE INDEX idx_post_payment_evidence_appointment_id ON public.post_payment_evidence(appointment_id);
CREATE INDEX idx_post_payment_evidence_provider_id ON public.post_payment_evidence(provider_id);

-- Add a field to track if final price has been set for post-payment services
ALTER TABLE public.appointments 
ADD COLUMN price_finalized BOOLEAN DEFAULT FALSE;

-- Create function to check if appointment needs price finalization
CREATE OR REPLACE FUNCTION public.needs_price_finalization(appointment_row appointments)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT 
    appointment_row.status = 'completed' AND
    (appointment_row.final_price IS NULL OR appointment_row.price_finalized = FALSE) AND
    EXISTS (
      SELECT 1 FROM listings 
      WHERE listings.id = appointment_row.listing_id 
      AND (listings.is_post_payment = TRUE OR listings.service_variants::text LIKE '%"ambas"%')
    );
$$;