-- Add foreign key constraints that the email edge function expects
-- These allow the function to join appointments with users table

ALTER TABLE appointments 
ADD CONSTRAINT appointments_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE appointments 
ADD CONSTRAINT appointments_provider_id_fkey 
FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE SET NULL;