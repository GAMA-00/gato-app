-- Update the recurrence check constraint to include 'triweekly'
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_recurrence_check;

-- Add the updated constraint that includes triweekly
ALTER TABLE appointments ADD CONSTRAINT appointments_recurrence_check 
CHECK (recurrence IN ('once', 'weekly', 'biweekly', 'triweekly', 'monthly'));