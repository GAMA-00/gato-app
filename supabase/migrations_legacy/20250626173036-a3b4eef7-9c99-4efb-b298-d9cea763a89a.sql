
-- Agregar campo is_post_payment a la tabla listings
ALTER TABLE public.listings 
ADD COLUMN is_post_payment BOOLEAN NOT NULL DEFAULT false;

-- Agregar campo final_price a la tabla appointments
ALTER TABLE public.appointments 
ADD COLUMN final_price NUMERIC NULL,
ADD COLUMN stripe_payment_intent_id TEXT NULL;

-- Crear tabla para historial de precios entre proveedor-cliente
CREATE TABLE public.price_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL,
  client_id UUID NOT NULL,
  listing_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  appointment_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS para price_history
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

-- Política para que proveedores vean su historial
CREATE POLICY "Providers can view their price history" 
  ON public.price_history 
  FOR SELECT 
  USING (provider_id = auth.uid());

-- Política para que proveedores inserten en su historial
CREATE POLICY "Providers can insert their price history" 
  ON public.price_history 
  FOR INSERT 
  WITH CHECK (provider_id = auth.uid());

-- Índices para mejorar performance
CREATE INDEX idx_price_history_provider_client ON public.price_history(provider_id, client_id, listing_id);
CREATE INDEX idx_appointments_final_price ON public.appointments(final_price) WHERE final_price IS NOT NULL;
CREATE INDEX idx_listings_post_payment ON public.listings(is_post_payment) WHERE is_post_payment = true;

-- Comentarios para documentar los nuevos campos
COMMENT ON COLUMN public.listings.is_post_payment IS 'Indica si el servicio tiene precio post-pago';
COMMENT ON COLUMN public.appointments.final_price IS 'Precio final definido por el proveedor post-servicio';
COMMENT ON COLUMN public.appointments.stripe_payment_intent_id IS 'ID del payment intent de Stripe para pagos diferidos';
COMMENT ON TABLE public.price_history IS 'Historial de precios cobrados entre proveedor y cliente';
