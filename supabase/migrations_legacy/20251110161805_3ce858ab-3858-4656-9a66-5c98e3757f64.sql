-- Fix the trigger URL to use the correct project reference
CREATE OR REPLACE FUNCTION trigger_send_appointment_email() RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://jckynopecuexfamepmoh.supabase.co/functions/v1/send-appointment-email',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || current_setting('app.service_role_key')),
    body := jsonb_build_object('appointment_id', NEW.id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;