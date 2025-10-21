-- Script para corregir pago atascado en pending_authorization
-- Este pago debería estar en 'captured' si es de un servicio postpago (is_post_payment = true)

-- PASO 1: Verificar el estado actual del pago y servicio asociado
SELECT 
  p.id AS payment_id,
  p.onvopay_payment_id,
  p.status AS payment_status,
  p.payment_type,
  p.amount,
  p.authorized_at,
  p.captured_at,
  l.is_post_payment AS is_post_payment_service,
  l.title AS service_title,
  a.id AS appointment_id,
  a.status AS appointment_status
FROM onvopay_payments p
JOIN appointments a ON a.id = p.appointment_id
JOIN listings l ON l.id = a.listing_id
WHERE p.onvopay_payment_id = 'cmh0u0pta5wyflf254jkr9yge';

-- PASO 2: Si el servicio es postpago (is_post_payment = true), 
-- actualizar el pago a 'captured' con payment_type = 'prepaid'
-- EJECUTAR SOLO SI LA CONSULTA ANTERIOR MUESTRA is_post_payment = true

UPDATE onvopay_payments
SET 
  status = 'captured',
  payment_type = 'prepaid',
  authorized_at = COALESCE(authorized_at, NOW()),
  captured_at = NOW(),
  updated_at = NOW()
WHERE onvopay_payment_id = 'cmh0u0pta5wyflf254jkr9yge'
AND EXISTS (
  SELECT 1 
  FROM appointments a
  JOIN listings l ON a.listing_id = l.id
  WHERE a.id = appointment_id
  AND l.is_post_payment = true
);

-- PASO 3: Verificar que se actualizó correctamente
SELECT 
  p.id,
  p.onvopay_payment_id,
  p.status,
  p.payment_type,
  p.authorized_at,
  p.captured_at,
  l.is_post_payment,
  l.title
FROM onvopay_payments p
JOIN appointments a ON a.id = p.appointment_id
JOIN listings l ON l.id = a.listing_id
WHERE p.onvopay_payment_id = 'cmh0u0pta5wyflf254jkr9yge';

-- NOTAS:
-- Este script corrige pagos que quedaron en 'pending_authorization' 
-- cuando deberían haber sido capturados inmediatamente (servicios postpago).
-- 
-- Para servicios prepago regulares, 'pending_authorization' o 'authorized' 
-- es el estado correcto hasta que se complete el servicio.
