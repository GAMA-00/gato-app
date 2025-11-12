-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create function to trigger email sending
CREATE OR REPLACE FUNCTION trigger_send_appointment_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_function_url text;
  v_anon_key text;
  v_payload jsonb;
  v_request_id bigint;
BEGIN
  -- Hardcode Supabase URL and anon key (these are public values)
  v_function_url := 'https://jckynopecuexfamepmoh.supabase.co/functions/v1/send-appointment-email';
  v_anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impja3lub3BlY3VleGZhbWVwbW9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0MzQ1ODAsImV4cCI6MjA2MTAxMDU4MH0.kcS5mx6kSrYqJmU3JIDizIXXsBItQVgxqD2mOa13oqE';
  
  -- Build payload with new appointment ID
  v_payload := jsonb_build_object('appointment_id', NEW.id::text);
  
  -- Call Edge Function asynchronously using pg_net
  SELECT INTO v_request_id extensions.http_post(
    url := v_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon_key
    ),
    body := v_payload::text
  );
  
  -- Log for debugging
  RAISE NOTICE 'Email trigger fired for appointment % (request_id: %)', NEW.id, v_request_id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail the INSERT if email trigger has issues
    RAISE WARNING 'Failed to trigger email for appointment %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger that fires AFTER INSERT on appointments
DROP TRIGGER IF EXISTS after_appointment_insert ON appointments;

CREATE TRIGGER after_appointment_insert
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_send_appointment_email();

COMMENT ON FUNCTION trigger_send_appointment_email() IS 
'Automatically sends email notification to admin when a new appointment is created. Uses pg_net for asynchronous HTTP calls to avoid blocking the INSERT operation.';

COMMENT ON TRIGGER after_appointment_insert ON appointments IS
'Fires after each appointment INSERT to trigger automated email notification to tech.gatoapp@outlook.com';