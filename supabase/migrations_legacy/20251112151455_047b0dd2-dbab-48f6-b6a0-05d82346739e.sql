-- =====================================================
-- Migration: Fix appointment email triggers
-- Purpose: Remove conflicting triggers and improve email sending reliability
-- =====================================================

-- Step 1: Drop conflicting n8n trigger if exists
DROP TRIGGER IF EXISTS "Send_to_n8n" ON appointments;

-- Step 2: Drop existing email trigger to recreate it
DROP TRIGGER IF EXISTS after_appointment_insert ON appointments;

-- Step 3: Recreate trigger_send_appointment_email function with enhanced logging
CREATE OR REPLACE FUNCTION public.trigger_send_appointment_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_function_url text;
  v_anon_key text;
  v_payload jsonb;
  v_request_id bigint;
BEGIN
  RAISE LOG '📧 EMAIL TRIGGER STARTED for appointment %', NEW.id;
  
  -- Supabase Edge Function URL and anon key (public)
  v_function_url := 'https://jckynopecuexfamepmoh.supabase.co/functions/v1/send-appointment-email';
  v_anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impja3lub3BlY3VleGZhbWVwbW9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0MzQ1ODAsImV4cCI6MjA2MTAxMDU4MH0.kcS5mx6kSrYqJmU3JIDizIXXsBItQVgxqD2mOa13oqE';

  -- Build payload
  v_payload := jsonb_build_object('appointment_id', NEW.id::text);
  
  RAISE LOG '📧 Payload built: %', v_payload;
  RAISE LOG '📧 Calling edge function at: %', v_function_url;

  -- Call Edge Function asynchronously using pg_net with apikey header
  SELECT INTO v_request_id net.http_post(
    url := v_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', v_anon_key
    ),
    body := v_payload::text
  );

  RAISE LOG '✅ Email trigger fired successfully for appointment % (request_id: %)', NEW.id, v_request_id;
  RAISE NOTICE '📧 Email queued for appointment % with request_id %', NEW.id, v_request_id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Swallow errors to avoid blocking inserts
    RAISE WARNING '❌ Failed to trigger email for appointment %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;

-- Step 4: Recreate the trigger
CREATE TRIGGER after_appointment_insert
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_send_appointment_email();

-- Step 5: Log completion
DO $$
BEGIN
  RAISE LOG '✅ Migration completed: Email triggers fixed and improved';
END $$;