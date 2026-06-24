-- Fix create_appointment_with_slot to handle duplicate slots better
CREATE OR REPLACE FUNCTION public.create_appointment_with_slot(
  p_provider_id uuid, 
  p_listing_id uuid, 
  p_client_id uuid, 
  p_start_time timestamp with time zone, 
  p_end_time timestamp with time zone, 
  p_recurrence text DEFAULT 'none'::text, 
  p_notes text DEFAULT NULL::text, 
  p_client_name text DEFAULT NULL::text, 
  p_client_email text DEFAULT NULL::text, 
  p_client_phone text DEFAULT NULL::text, 
  p_client_address text DEFAULT NULL::text, 
  p_residencia_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(appointment_id uuid, status text, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_lock_key bigint;
  v_existing_apt uuid;
  v_slot_date date;
  v_start_time_of_day time;
  v_end_time_of_day time;
  v_recurrence text := COALESCE(NULLIF(p_recurrence, ''), 'none');
  v_rows_updated integer := 0;
  v_duplicate_count integer := 0;
BEGIN
  -- Ensure caller is same as client for safety
  IF auth.uid() IS NULL OR auth.uid() <> p_client_id THEN
    RAISE EXCEPTION 'Unauthorized: client mismatch' USING ERRCODE = 'P0001';
  END IF;

  -- Normalize 'once' to 'none'
  IF v_recurrence = 'once' THEN
    v_recurrence := 'none';
  END IF;

  -- Build an advisory lock key for this specific slot
  v_lock_key := hashtext(p_provider_id::text || '|' || p_listing_id::text || '|' || p_start_time::text);
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Check for duplicate slots and clean them up
  SELECT COUNT(*) INTO v_duplicate_count
  FROM provider_time_slots
  WHERE provider_id = p_provider_id
    AND listing_id = p_listing_id
    AND slot_datetime_start = p_start_time;

  -- If there are duplicates, consolidate them
  IF v_duplicate_count > 1 THEN
    -- Keep the most recent slot and delete the rest
    DELETE FROM provider_time_slots
    WHERE provider_id = p_provider_id
      AND listing_id = p_listing_id
      AND slot_datetime_start = p_start_time
      AND id NOT IN (
        SELECT id FROM provider_time_slots
        WHERE provider_id = p_provider_id
          AND listing_id = p_listing_id
          AND slot_datetime_start = p_start_time
        ORDER BY created_at DESC
        LIMIT 1
      );
    
    RAISE LOG 'Cleaned up % duplicate slots for datetime %', v_duplicate_count - 1, p_start_time;
  END IF;

  -- Idempotency: if an active appointment already exists for this exact slot, return it
  SELECT a.id INTO v_existing_apt
  FROM appointments a
  WHERE a.provider_id = p_provider_id
    AND a.listing_id = p_listing_id
    AND a.client_id = p_client_id
    AND a.start_time = p_start_time
    AND a.status IN ('pending','confirmed')
  LIMIT 1;

  IF v_existing_apt IS NOT NULL THEN
    RETURN QUERY SELECT v_existing_apt, 'exists'::text, 'Appointment already exists for this slot'::text;
    RETURN;
  END IF;

  -- Reject if slot is blocked by a recurring rule
  IF EXISTS (
    SELECT 1
    FROM provider_time_slots pts
    WHERE pts.provider_id = p_provider_id
      AND pts.listing_id = p_listing_id
      AND pts.slot_datetime_start = p_start_time
      AND pts.recurring_blocked = true
    LIMIT 1
  ) THEN
    RAISE EXCEPTION 'Requested time is blocked by a recurring schedule' USING ERRCODE = 'P0001';
  END IF;

  -- Reject if conflicting active appointment overlaps the requested time
  IF EXISTS (
    SELECT 1 FROM appointments a
    WHERE a.provider_id = p_provider_id
      AND a.start_time < p_end_time
      AND a.end_time > p_start_time
      AND a.status NOT IN ('cancelled','rejected')
    LIMIT 1
  ) THEN
    RAISE EXCEPTION 'Requested time conflicts with an existing appointment' USING ERRCODE = 'P0001';
  END IF;

  -- Prepare derived fields
  v_slot_date := (p_start_time AT TIME ZONE 'America/Costa_Rica')::date;
  v_start_time_of_day := (p_start_time AT TIME ZONE 'America/Costa_Rica')::time;
  v_end_time_of_day := (p_end_time AT TIME ZONE 'America/Costa_Rica')::time;

  -- Reserve existing provider_time_slot FIRST with LIMIT 1 to avoid duplicate errors
  UPDATE provider_time_slots
  SET
    slot_date = v_slot_date,
    start_time = v_start_time_of_day,
    end_time = v_end_time_of_day,
    slot_datetime_end = p_end_time,
    is_available = false,
    is_reserved = true,
    recurring_blocked = false,
    recurring_rule_id = NULL,
    blocked_until = NULL
  WHERE id = (
    SELECT id FROM provider_time_slots
    WHERE provider_id = p_provider_id
      AND listing_id = p_listing_id
      AND slot_datetime_start = p_start_time
    LIMIT 1
  );

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  -- If no existing slot, insert one (UPSERT as fallback)
  IF v_rows_updated = 0 THEN
    INSERT INTO provider_time_slots (
      provider_id,
      listing_id,
      slot_date,
      start_time,
      end_time,
      slot_datetime_start,
      slot_datetime_end,
      is_available,
      is_reserved,
      recurring_blocked
    ) VALUES (
      p_provider_id,
      p_listing_id,
      v_slot_date,
      v_start_time_of_day,
      v_end_time_of_day,
      p_start_time,
      p_end_time,
      false,
      true,
      false
    )
    ON CONFLICT (provider_id, listing_id, slot_datetime_start)
    DO UPDATE SET
      slot_date = EXCLUDED.slot_date,
      start_time = EXCLUDED.start_time,
      end_time = EXCLUDED.end_time,
      slot_datetime_end = EXCLUDED.slot_datetime_end,
      is_available = false,
      is_reserved = true,
      recurring_blocked = false,
      recurring_rule_id = NULL,
      blocked_until = NULL;
  END IF;

  -- Create the appointment
  INSERT INTO appointments (
    listing_id,
    client_id,
    provider_id,
    residencia_id,
    start_time,
    end_time,
    status,
    notes,
    client_address,
    client_phone,
    client_email,
    client_name,
    recurrence,
    external_booking,
    is_recurring_instance
  ) VALUES (
    p_listing_id,
    p_client_id,
    p_provider_id,
    p_residencia_id,
    p_start_time,
    p_end_time,
    'pending',
    COALESCE(p_notes, ''),
    p_client_address,
    p_client_phone,
    p_client_email,
    COALESCE(p_client_name, 'Cliente'),
    v_recurrence,
    false,
    false
  ) RETURNING id INTO v_existing_apt;

  RETURN QUERY SELECT v_existing_apt, 'created'::text, 'Appointment created successfully'::text;
END;
$function$;