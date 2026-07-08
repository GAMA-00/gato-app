-- Fix corrupted appointment data and add validation

-- First, fix the specific problematic appointment (completed with future date)
UPDATE appointments 
SET status = 'cancelled', 
    admin_notes = 'Auto-corrected: was marked completed with future date'
WHERE status = 'completed' 
  AND end_time > NOW()
  AND id = 'b496a315-3e09-468b-86b3-d35814a6640a';

-- Clean up old pending appointments (older than 24 hours)
UPDATE appointments 
SET status = 'cancelled',
    cancellation_reason = 'Auto-cancelled: pending timeout after 24 hours',
    admin_notes = 'Auto-cancelled due to payment timeout'
WHERE status = 'pending' 
  AND created_at < NOW() - INTERVAL '24 hours';

-- Create validation function to prevent future appointments from being marked completed
CREATE OR REPLACE FUNCTION validate_appointment_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent marking future appointments as completed
  IF NEW.status = 'completed' AND NEW.end_time > NOW() THEN
    RAISE EXCEPTION 'Cannot mark future appointments as completed. Appointment ends at: %, Current time: %', 
      NEW.end_time, NOW();
  END IF;
  
  -- Log status changes for debugging
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    RAISE LOG 'Appointment % status changed from % to % at %', 
      NEW.id, OLD.status, NEW.status, NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate appointment status changes
DROP TRIGGER IF EXISTS validate_appointment_status ON appointments;
CREATE TRIGGER validate_appointment_status
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION validate_appointment_completion();

-- Create function to clean up old pending appointments automatically
CREATE OR REPLACE FUNCTION cleanup_old_pending_appointments()
RETURNS INTEGER AS $$
DECLARE
  cleaned_count INTEGER := 0;
BEGIN
  -- Cancel appointments that have been pending for more than 24 hours
  UPDATE appointments 
  SET status = 'cancelled',
      cancellation_reason = 'Auto-cancelled: payment timeout',
      admin_notes = 'System cleanup: pending > 24h',
      last_modified_at = NOW(),
      last_modified_by = NULL
  WHERE status = 'pending' 
    AND created_at < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  
  RAISE LOG 'Cleaned up % old pending appointments', cleaned_count;
  RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;