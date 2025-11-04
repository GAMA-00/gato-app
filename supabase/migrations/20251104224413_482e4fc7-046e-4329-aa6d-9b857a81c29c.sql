-- ========================================================
-- TRIGGER PARA AUTO-CREACIÓN INSTANTÁNEA DE FACTURAS POSTPAGO
-- ========================================================
-- Este trigger crea facturas draft automáticamente cuando
-- un appointment se marca como completed y es de tipo postpago

CREATE OR REPLACE FUNCTION public.auto_create_post_payment_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  listing_record RECORD;
  existing_invoice_id UUID;
BEGIN
  -- Solo procesar si el appointment acaba de cambiar a 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Obtener información del listing
    SELECT id, is_post_payment, base_price 
    INTO listing_record
    FROM listings
    WHERE id = NEW.listing_id;
    
    -- Verificar si es un servicio postpago
    IF listing_record.is_post_payment = true THEN
      
      -- Verificar si ya existe una factura para este appointment
      SELECT id INTO existing_invoice_id
      FROM post_payment_invoices
      WHERE appointment_id = NEW.id
      LIMIT 1;
      
      -- Si no existe factura, crearla
      IF existing_invoice_id IS NULL THEN
        INSERT INTO post_payment_invoices (
          appointment_id,
          provider_id,
          client_id,
          base_price,
          total_price,
          status,
          created_at,
          updated_at
        ) VALUES (
          NEW.id,
          NEW.provider_id,
          NEW.client_id,
          listing_record.base_price,
          listing_record.base_price,
          'draft',
          NOW(),
          NOW()
        );
        
        RAISE LOG '✅ Auto-created post-payment invoice for appointment %', NEW.id;
      END IF;
      
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Crear el trigger en la tabla appointments
DROP TRIGGER IF EXISTS auto_create_invoice_trigger ON appointments;
CREATE TRIGGER auto_create_invoice_trigger
  AFTER UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_post_payment_invoice();

COMMENT ON FUNCTION auto_create_post_payment_invoice() IS 
  'Crea automáticamente facturas draft cuando un appointment se marca como completed';
COMMENT ON TRIGGER auto_create_invoice_trigger ON appointments IS
  'Dispara la creación automática de facturas postpago';