-- Agregar columna para referenciar el pago de Onvopay en appointments
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS onvopay_payment_id uuid REFERENCES onvopay_payments(id);