-- Fix net.http_post signature in email trigger
CREATE EXTENSION IF NOT EXISTS pg_net;

DROP TRIGGER IF EXISTS after_appointment_insert ON appointments;

CREATE OR REPLACE FUNCTION public.trigger_send_appointment_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_function_url text := 'https://jckynopecuexfamepmoh.supabase.co/functions/v1/send-appointment-email';
  v_anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impja3lub3BlY3VleGZhbWVwbW9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0MzQ1ODAsImV4cCI6MjA2MTAxMDU4MH0.kcS5mx6kSrYqJmU3JIDizIXXsBItQVgxqD2mOa13oqE';
  v_payload jsonb;
  v_request_id bigint;
BEGIN
  RAISE LOG '📧 EMAIL TRIGGER STARTED for appointment %', NEW.id;
  
  v_payload := jsonb_build_object('appointment_id', NEW.id::text);
  RAISE LOG '📧 Payload: %', v_payload;

  -- Correct signature: net.http_post(url, body, params, headers, timeout_milliseconds)
  SELECT INTO v_request_id net.http_post(
    v_function_url,                    -- url text
    v_payload,                         -- body jsonb (NOT text!)
    '{}'::jsonb,                       -- params jsonb
    jsonb_build_object(                -- headers jsonb
      'Content-Type', 'application/json',
      'apikey', v_anon_key,
      'Authorization', 'Bearer ' || v_anon_key
    ),
    10000                              -- timeout_milliseconds integer
  );

  RAISE LOG '✅ Email request queued (request_id: %)', v_request_id;
  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '❌ Email trigger failed for appointment %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;

CREATE TRIGGER after_appointment_insert
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_send_appointment_email();

DO $$ BEGIN RAISE LOG '✅ Email trigger fixed with correct net.http_post signature'; END $$;