-- Create post_payment_invoices table
CREATE TABLE public.post_payment_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL,
  client_id UUID NOT NULL,
  base_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  rejection_reason TEXT,
  evidence_file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE
);

-- Create post_payment_items table
CREATE TABLE public.post_payment_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES post_payment_invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.post_payment_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_payment_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for post_payment_invoices
CREATE POLICY "Providers can manage their invoices"
ON public.post_payment_invoices
FOR ALL
USING (auth.uid() = provider_id)
WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Clients can view and approve their invoices"
ON public.post_payment_invoices
FOR SELECT
USING (auth.uid() = client_id);

CREATE POLICY "Clients can update invoice approval status"
ON public.post_payment_invoices
FOR UPDATE
USING (auth.uid() = client_id AND status = 'submitted')
WITH CHECK (auth.uid() = client_id AND status IN ('approved', 'rejected'));

-- RLS Policies for post_payment_items
CREATE POLICY "Providers can manage items for their invoices"
ON public.post_payment_items
FOR ALL
USING (EXISTS (
  SELECT 1 FROM post_payment_invoices 
  WHERE id = invoice_id AND provider_id = auth.uid()
));

CREATE POLICY "Clients can view items for their invoices"
ON public.post_payment_items
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM post_payment_invoices 
  WHERE id = invoice_id AND client_id = auth.uid()
));

-- Trigger to update final_price when invoice is approved
CREATE OR REPLACE FUNCTION update_appointment_final_price()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    UPDATE appointments
    SET final_price = NEW.total_price,
        price_finalized = true
    WHERE id = NEW.appointment_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoice_approved_trigger
  AFTER UPDATE ON post_payment_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_appointment_final_price();

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_invoice_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_post_payment_invoices_updated_at
  BEFORE UPDATE ON post_payment_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_updated_at();