-- Ensure pg_net extension exists
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create or replace the trigger function to call the Edge Function with proper headers
CREATE OR REPLACE FUNCTION public.trigger_send_appointment_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_function_url text;
  v_anon_key text;
  v_payload jsonb;
  v_request_id bigint;
BEGIN
  -- Supabase Edge Function URL and anon key (public)
  v_function_url := 'https://jckynopecuexfamepmoh.supabase.co/functions/v1/send-appointment-email';
  v_anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impja3lub3BlY3VleGZhbWVwbW9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0MzQ1ODAsImV4cCI6MjA2MTAxMDU4MH0.kcS5mx6kSrYqJmU3JIDizIXXsBItQVgxqD2mOa13oqE';

  -- Build payload
  v_payload := jsonb_build_object('appointment_id', NEW.id::text);

  -- Call Edge Function asynchronously using pg_net with apikey header
  SELECT INTO v_request_id net.http_post(
    url := v_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', v_anon_key
    ),
    body := v_payload::text
  );

  -- Do not block insert on failures, just notice
  RAISE NOTICE 'Email trigger fired for appointment % (request_id: %)', NEW.id, v_request_id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Swallow errors to avoid blocking inserts
    RAISE WARNING 'Failed to trigger email for appointment %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate trigger to ensure it uses latest function version
DROP TRIGGER IF EXISTS after_appointment_insert ON public.appointments;
CREATE TRIGGER after_appointment_insert
AFTER INSERT ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.trigger_send_appointment_email();