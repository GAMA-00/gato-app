-- Create table to map internal client IDs to OnvoPay customer IDs
CREATE TABLE public.onvopay_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  onvopay_customer_id TEXT NOT NULL,
  normalized_email TEXT,
  normalized_phone TEXT,
  normalized_name TEXT,
  customer_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique indexes to prevent duplicates
CREATE UNIQUE INDEX idx_onvopay_customers_client_id ON public.onvopay_customers(client_id);
CREATE UNIQUE INDEX idx_onvopay_customers_onvopay_id ON public.onvopay_customers(onvopay_customer_id);

-- Create index for normalized fields to help with duplicate detection
CREATE INDEX idx_onvopay_customers_normalized_email ON public.onvopay_customers(normalized_email);
CREATE INDEX idx_onvopay_customers_normalized_phone ON public.onvopay_customers(normalized_phone);

-- Enable RLS
ALTER TABLE public.onvopay_customers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Clients can view their own customer mappings" 
ON public.onvopay_customers 
FOR SELECT 
USING (auth.uid() = client_id);

CREATE POLICY "Service role can manage all customer mappings" 
ON public.onvopay_customers 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Add trigger for updating updated_at
CREATE OR REPLACE FUNCTION public.update_onvopay_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_onvopay_customers_updated_at
BEFORE UPDATE ON public.onvopay_customers
FOR EACH ROW
EXECUTE FUNCTION public.update_onvopay_customers_updated_at();