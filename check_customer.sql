-- Verificar el cliente actual en la BD
SELECT 
  client_id,
  onvopay_customer_id,
  normalized_name,
  normalized_email,
  normalized_phone,
  customer_data::json->'address' as address,
  customer_data::json->'shipping' as shipping,
  customer_data::json->'amountSpent' as amount_spent,
  created_at,
  updated_at
FROM onvopay_customers
WHERE client_id = '572b3e62-43ae-45fd-8c50-89e085dfcac6';
