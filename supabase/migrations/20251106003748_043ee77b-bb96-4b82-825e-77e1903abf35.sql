-- Fix recurring base appointments that were incorrectly marked as completed
-- These should be 'confirmed' to allow future virtual instances to be generated

UPDATE appointments
SET status = 'confirmed'
WHERE is_recurring_instance = false
  AND recurrence IS NOT NULL
  AND recurrence NOT IN ('none')
  AND status = 'completed';

-- Add helpful comment to is_recurring_instance column for future reference
COMMENT ON COLUMN appointments.is_recurring_instance IS 
'Indicates if this is a materialized recurring instance (true) or a base/regular appointment (false). Base recurring appointments with recurrence != none should never be marked as completed to allow future virtual instances.';