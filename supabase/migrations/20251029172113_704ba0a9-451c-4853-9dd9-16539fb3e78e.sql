-- Función RPC para obtener el estado de pagos recurrentes
CREATE OR REPLACE FUNCTION get_recurring_payments_status()
RETURNS TABLE (
  appointment_id UUID,
  appointment_recurrence TEXT,
  appointment_status TEXT,
  payment_id UUID,
  payment_type TEXT,
  payment_status TEXT,
  amount NUMERIC,
  created_at TIMESTAMPTZ,
  authorized_at TIMESTAMPTZ,
  captured_at TIMESTAMPTZ,
  client_name TEXT,
  service_title TEXT
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id as appointment_id,
    a.recurrence as appointment_recurrence,
    a.status as appointment_status,
    p.id as payment_id,
    p.payment_type,
    p.status as payment_status,
    p.amount,
    p.created_at,
    p.authorized_at,
    p.captured_at,
    COALESCE(a.client_name, 'Sin nombre') as client_name,
    COALESCE(l.title, 'Sin título') as service_title
  FROM appointments a
  LEFT JOIN onvopay_payments p ON p.appointment_id = a.id
  LEFT JOIN listings l ON a.listing_id = l.id
  WHERE a.recurrence != 'none' 
    AND a.recurrence IS NOT NULL
    AND p.id IS NOT NULL
  ORDER BY p.created_at DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_recurring_payments_status() TO authenticated;
GRANT EXECUTE ON FUNCTION get_recurring_payments_status() TO service_role;