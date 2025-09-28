-- Clean database for testing new slot system (Fixed version)
-- WARNING: This will delete ALL user data and listings

-- Disable foreign key checks temporarily to avoid constraint violations
SET session_replication_role = replica;

-- Delete all data in the correct order
TRUNCATE TABLE recurring_appointment_instances CASCADE;
TRUNCATE TABLE recurring_exceptions CASCADE;
TRUNCATE TABLE recurring_rules CASCADE;
TRUNCATE TABLE post_payment_evidence CASCADE;
TRUNCATE TABLE post_payment_items CASCADE;
TRUNCATE TABLE post_payment_invoices CASCADE;
TRUNCATE TABLE provider_ratings CASCADE;
TRUNCATE TABLE appointments CASCADE;
TRUNCATE TABLE onvopay_webhooks CASCADE;
TRUNCATE TABLE onvopay_subscriptions CASCADE;
TRUNCATE TABLE onvopay_payments CASCADE;
TRUNCATE TABLE onvopay_customers CASCADE;
TRUNCATE TABLE provider_time_slots CASCADE;
TRUNCATE TABLE listing_residencias CASCADE;
TRUNCATE TABLE provider_slot_preferences CASCADE;
TRUNCATE TABLE listings CASCADE;
TRUNCATE TABLE payment_methods CASCADE;
TRUNCATE TABLE provider_availability CASCADE;
TRUNCATE TABLE provider_residencias CASCADE;
TRUNCATE TABLE team_members CASCADE;
TRUNCATE TABLE price_history CASCADE;
TRUNCATE TABLE users CASCADE;

-- Delete auth users (this will cascade properly)
DELETE FROM auth.users;

-- Re-enable foreign key checks
SET session_replication_role = DEFAULT;

-- Verify cleanup
SELECT 
  'listings' as table_name, count(*) as remaining_records FROM listings
UNION ALL
SELECT 
  'users' as table_name, count(*) as remaining_records FROM users
UNION ALL  
SELECT 
  'auth.users' as table_name, count(*) as remaining_records FROM auth.users;