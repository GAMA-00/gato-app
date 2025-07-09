-- Drop the existing constraint that prevents booking in cancelled slots
ALTER TABLE appointments 
DROP CONSTRAINT IF EXISTS unique_appointment_slot;

-- Create a new partial unique constraint that only applies to active appointments
-- This allows cancelled/rejected appointments to be "overwritten" by new bookings
CREATE UNIQUE INDEX unique_active_appointment_slot 
ON appointments (provider_id, start_time, end_time) 
WHERE status NOT IN ('cancelled', 'rejected');

-- Update the existing index to also exclude cancelled appointments for better performance
DROP INDEX IF EXISTS idx_appointments_provider_time;
CREATE INDEX idx_appointments_provider_time 
ON appointments (provider_id, start_time, end_time) 
WHERE status NOT IN ('cancelled', 'rejected');