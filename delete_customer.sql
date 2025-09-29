-- Delete existing OnvoPay customer for client 572b3e62-43ae-45fd-8c50-89e085dfcac6
-- This will force creation of a new customer with complete billing data on next payment

DELETE FROM onvopay_customers 
WHERE client_id = '572b3e62-43ae-45fd-8c50-89e085dfcac6';

-- Verify deletion
SELECT * FROM onvopay_customers 
WHERE client_id = '572b3e62-43ae-45fd-8c50-89e085dfcac6';
