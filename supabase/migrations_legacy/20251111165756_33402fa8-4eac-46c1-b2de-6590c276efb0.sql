-- ============================================
-- Fix Function Search Path Mutable Warnings
-- Add SET search_path = 'public' to all functions to prevent search path hijacking
-- ============================================

-- 1. Fix SECURITY DEFINER functions (most critical)
-- ============================================

-- Fix generate_invoice_number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  next_number INTEGER;
  invoice_num TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_number
  FROM invoices
  WHERE invoice_number LIKE 'INV-%';
  
  invoice_num := 'INV-' || LPAD(next_number::TEXT, 5, '0');
  RETURN invoice_num;
END;
$function$;

-- Fix create_user_profile
CREATE OR REPLACE FUNCTION public.create_user_profile(
  user_id uuid, 
  user_name text, 
  user_email text, 
  user_phone text, 
  user_role text, 
  user_residencia_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO profiles (
    id, name, email, phone, role, residencia_id
  ) VALUES (
    user_id, user_name, user_email, user_phone, user_role, user_residencia_id
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    name = user_name,
    email = user_email,
    phone = user_phone,
    role = user_role,
    residencia_id = user_residencia_id;
    
  IF user_role = 'client' THEN
    INSERT INTO clients (id, residencia_id)
    VALUES (user_id, user_residencia_id)
    ON CONFLICT (id) DO UPDATE
    SET residencia_id = user_residencia_id;
  ELSIF user_role = 'provider' THEN
    INSERT INTO providers (id)
    VALUES (user_id)
    ON CONFLICT (id) DO NOTHING;
    
    IF user_residencia_id IS NOT NULL THEN
      INSERT INTO provider_residencias (provider_id, residencia_id)
      VALUES (user_id, user_residencia_id)
      ON CONFLICT (provider_id, residencia_id) DO NOTHING;
    END IF;
  END IF;
END;
$function$;

-- Fix fix_empty_avatars
CREATE OR REPLACE FUNCTION public.fix_empty_avatars()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  user_record RECORD;
  avatar_path TEXT;
  new_avatar_url TEXT;
BEGIN
  FOR user_record IN 
    SELECT id, name, role, avatar_url
    FROM users 
    WHERE (users.avatar_url IS NULL OR users.avatar_url = '') 
    AND users.role = 'provider'
  LOOP
    avatar_path := user_record.id || '/avatar.jpg';
    new_avatar_url := 'https://jckynopecuexfamepmoh.supabase.co/storage/v1/object/public/avatars/' || avatar_path;
    
    UPDATE users 
    SET avatar_url = new_avatar_url
    WHERE users.id = user_record.id;
    
    RAISE LOG 'Updated avatar for user % (%) with URL: %', 
      user_record.name, user_record.id, new_avatar_url;
  END LOOP;
END;
$function$;

-- Fix prevent_role_column_update
CREATE OR REPLACE FUNCTION public.prevent_role_column_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    RAISE EXCEPTION 'Direct role updates are not allowed. Use the user_roles table instead.';
  END IF;
  RETURN NEW;
END;
$function$;

-- 2. Fix trigger functions
-- ============================================

-- Fix update_slot_preferences_updated_at
CREATE OR REPLACE FUNCTION public.update_slot_preferences_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix update_appointment_final_price
CREATE OR REPLACE FUNCTION public.update_appointment_final_price()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    UPDATE appointments
    SET final_price = NEW.total_price,
        price_finalized = true
    WHERE id = NEW.appointment_id;
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix update_invoice_updated_at
CREATE OR REPLACE FUNCTION public.update_invoice_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix update_onvopay_subscriptions_updated_at
CREATE OR REPLACE FUNCTION public.update_onvopay_subscriptions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Fix update_invoices_updated_at
CREATE OR REPLACE FUNCTION public.update_invoices_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Fix validate_appointment_completion
CREATE OR REPLACE FUNCTION public.validate_appointment_completion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  IF NEW.status = 'completed' AND NEW.end_time > NOW() THEN
    RAISE EXCEPTION 'Cannot mark future appointments as completed. Appointment ends at: %, Current time: %', 
      NEW.end_time, NOW();
  END IF;
  
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    RAISE LOG 'Appointment % status changed from % to % at %', 
      NEW.id, OLD.status, NEW.status, NOW();
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix trigger_send_appointment_email
CREATE OR REPLACE FUNCTION public.trigger_send_appointment_email()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  PERFORM net.http_post(
    url := 'https://jckynopecuexfamepmoh.supabase.co/functions/v1/send-appointment-email',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || current_setting('app.service_role_key')),
    body := jsonb_build_object('appointment_id', NEW.id)
  );
  RETURN NEW;
END;
$function$;

-- 3. Fix regular functions (used by application)
-- ============================================

-- Fix get_rated_appointments
CREATE OR REPLACE FUNCTION public.get_rated_appointments(appointment_ids UUID[])
RETURNS TABLE (appointment_id UUID)
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  RETURN QUERY
    SELECT provider_ratings.appointment_id
    FROM provider_ratings
    WHERE provider_ratings.appointment_id = ANY(appointment_ids);
END;
$function$;

-- Fix submit_provider_rating
CREATE OR REPLACE FUNCTION public.submit_provider_rating(
  p_provider_id uuid,
  p_client_id uuid,
  p_appointment_id uuid,
  p_rating integer
)
RETURNS void
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO provider_ratings 
    (provider_id, client_id, appointment_id, rating, created_at)
  VALUES 
    (p_provider_id, p_client_id, p_appointment_id, p_rating, now())
  ON CONFLICT (appointment_id) 
  DO UPDATE SET 
    rating = p_rating,
    created_at = now();
  
  WITH provider_avg AS (
    SELECT 
      (5.0 + SUM(rating::numeric)) / (COUNT(*) + 1) as avg_rating,
      COUNT(*) as rating_count
    FROM provider_ratings
    WHERE provider_id = p_provider_id
  )
  UPDATE users
  SET average_rating = ROUND(provider_avg.avg_rating, 1)
  FROM provider_avg
  WHERE users.id = p_provider_id;
END;
$function$;