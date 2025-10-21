-- Corregir pagos postpago atascados en pending_authorization
-- Este script actualiza pagos que deberían estar en 'captured' porque son de servicios postpago

-- PASO 1: Verificar pagos que serán corregidos
SELECT 
  p.id,
  p.onvopay_payment_id,
  p.status AS current_status,
  p.payment_type AS current_payment_type,
  p.amount,
  p.created_at,
  l.title AS service_name,
  l.is_post_payment
FROM onvopay_payments p
JOIN appointments a ON a.id = p.appointment_id
JOIN listings l ON l.id = a.listing_id
WHERE p.status = 'pending_authorization'
  AND l.is_post_payment = true
  AND p.payment_type IN ('cash', 'appointment');

-- PASO 2: Corregir los pagos atascados
UPDATE onvopay_payments p
SET 
  status = 'captured',
  payment_type = 'prepaid', -- T1 Base es prepagado
  authorized_at = COALESCE(p.authorized_at, NOW()),
  captured_at = COALESCE(p.captured_at, NOW()),
  updated_at = NOW()
WHERE p.status = 'pending_authorization'
  AND EXISTS (
    SELECT 1 FROM appointments a
    JOIN listings l ON a.listing_id = l.id
    WHERE a.id = p.appointment_id
      AND l.is_post_payment = true
  )
  AND p.payment_type IN ('cash', 'appointment'); -- Excluir subscriptions por seguridad

-- PASO 3: Verificar pagos corregidos
SELECT 
  p.id,
  p.onvopay_payment_id,
  p.status AS new_status,
  p.payment_type AS new_payment_type,
  p.amount,
  p.authorized_at,
  p.captured_at,
  l.title AS service_name,
  'FIXED: pending_authorization -> captured' AS change_description
FROM onvopay_payments p
JOIN appointments a ON a.id = p.appointment_id
JOIN listings l ON l.id = a.listing_id
WHERE p.status = 'captured'
  AND p.captured_at >= NOW() - INTERVAL '5 minutes'
  AND l.is_post_payment = true
ORDER BY p.captured_at DESC;

-- PASO 4: Resumen de la corrección
SELECT 
  COUNT(*) AS total_payments_fixed,
  SUM(p.amount) AS total_amount_fixed,
  MIN(p.created_at) AS oldest_payment_date,
  MAX(p.created_at) AS newest_payment_date
FROM onvopay_payments p
JOIN appointments a ON a.id = p.appointment_id
JOIN listings l ON l.id = a.listing_id
WHERE p.status = 'captured'
  AND p.captured_at >= NOW() - INTERVAL '5 minutes'
  AND l.is_post_payment = true;
