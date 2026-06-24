-- Create unified invoices table for all service types
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  provider_id UUID NOT NULL,
  listing_id UUID NOT NULL REFERENCES listings(id),
  
  -- Pricing details
  base_price NUMERIC NOT NULL,
  custom_variables_total NUMERIC DEFAULT 0,
  total_price NUMERIC NOT NULL,
  
  -- Invoice status
  status TEXT NOT NULL DEFAULT 'draft',
  -- Possible statuses: draft, pending_payment, paid, completed, cancelled
  
  -- Payment reference
  onvopay_payment_id UUID REFERENCES onvopay_payments(id),
  post_payment_invoice_id UUID REFERENCES post_payment_invoices(id),
  
  -- Metadata
  invoice_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  due_date TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_invoice_status CHECK (status IN ('draft', 'pending_payment', 'paid', 'completed', 'cancelled'))
);

-- Create index for faster queries
CREATE INDEX idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX idx_invoices_provider_id ON public.invoices(provider_id);
CREATE INDEX idx_invoices_appointment_id ON public.invoices(appointment_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_invoice_date ON public.invoices(invoice_date DESC);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Clients can view their own invoices"
  ON public.invoices
  FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Providers can view their invoices"
  ON public.invoices
  FOR SELECT
  USING (auth.uid() = provider_id);

CREATE POLICY "Service role can manage all invoices"
  ON public.invoices
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to generate sequential invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_number INTEGER;
  invoice_num TEXT;
BEGIN
  -- Get the next invoice number
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_number
  FROM invoices
  WHERE invoice_number LIKE 'INV-%';
  
  -- Format as INV-00001
  invoice_num := 'INV-' || LPAD(next_number::TEXT, 5, '0');
  
  RETURN invoice_num;
END;
$$;

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_invoices_updated_at_trigger
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoices_updated_at();

-- Generate invoices for existing completed pre-payment services
INSERT INTO public.invoices (
  invoice_number,
  appointment_id,
  client_id,
  provider_id,
  listing_id,
  base_price,
  custom_variables_total,
  total_price,
  status,
  onvopay_payment_id,
  invoice_date,
  paid_at,
  completed_at
)
SELECT 
  generate_invoice_number(),
  a.id,
  a.client_id,
  a.provider_id,
  a.listing_id,
  COALESCE(l.base_price, 0),
  COALESCE(a.custom_variables_total_price, 0),
  COALESCE(op.amount::NUMERIC / 100, l.base_price + COALESCE(a.custom_variables_total_price, 0)),
  'completed',
  op.id,
  COALESCE(op.captured_at, a.created_at),
  op.captured_at,
  a.end_time
FROM appointments a
JOIN listings l ON a.listing_id = l.id
LEFT JOIN onvopay_payments op ON a.id = op.appointment_id AND op.status = 'captured'
WHERE a.status = 'completed'
  AND l.is_post_payment = false
  AND NOT EXISTS (
    SELECT 1 FROM invoices i WHERE i.appointment_id = a.id
  )
ORDER BY a.created_at;

-- Generate invoices for existing approved post-payment services
INSERT INTO public.invoices (
  invoice_number,
  appointment_id,
  client_id,
  provider_id,
  listing_id,
  base_price,
  total_price,
  status,
  post_payment_invoice_id,
  invoice_date,
  completed_at
)
SELECT 
  generate_invoice_number(),
  ppi.appointment_id,
  ppi.client_id,
  ppi.provider_id,
  a.listing_id,
  ppi.base_price,
  ppi.total_price,
  'completed',
  ppi.id,
  COALESCE(ppi.approved_at, ppi.created_at),
  ppi.approved_at
FROM post_payment_invoices ppi
JOIN appointments a ON ppi.appointment_id = a.id
WHERE ppi.status = 'approved'
  AND NOT EXISTS (
    SELECT 1 FROM invoices i WHERE i.post_payment_invoice_id = ppi.id
  )
ORDER BY ppi.created_at;