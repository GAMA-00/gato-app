-- First, remove the existing constraint that's blocking triweekly
DO $$ 
BEGIN
    -- Check if the constraint exists and drop it
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'appointments_recurrence_check' 
        AND conrelid = 'appointments'::regclass
    ) THEN
        ALTER TABLE appointments DROP CONSTRAINT appointments_recurrence_check;
    END IF;
END $$;

-- Add the updated constraint that includes triweekly
ALTER TABLE appointments ADD CONSTRAINT appointments_recurrence_check 
CHECK (recurrence IS NULL OR recurrence IN ('none', 'once', 'weekly', 'biweekly', 'triweekly', 'monthly'));