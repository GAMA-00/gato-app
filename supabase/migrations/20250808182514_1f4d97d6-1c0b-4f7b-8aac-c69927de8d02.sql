-- Retry migration: keep original parameter name to allow CREATE OR REPLACE
-- 1) Replace block_recurring_slots_for_appointment with robust UPSERT + advisory locks
CREATE OR REPLACE FUNCTION public.block_recurring_slots_for_appointment(
  p_appointment_id uuid,
  p_months_ahead integer DEFAULT 12
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  appt RECORD;
  blocked_count integer := 0;
  local_date date;
  local_start time;
  local_end time;
  end_limit date;
  iter_date date;
  occ_start timestamptz;
  occ_end timestamptz;
  interval_days integer := 7;  -- default weekly
  lock_key bigint;
BEGIN
  -- Get appointment
  SELECT id, provider_id, listing_id, start_time, end_time, recurrence
  INTO appt
  FROM appointments
  WHERE id = p_appointment_id;

  IF NOT FOUND THEN
    RAISE LOG 'block_recurring_slots_for_appointment: appointment % not found', p_appointment_id;
    RETURN 0;
  END IF;

  IF appt.recurrence IS NULL OR appt.recurrence = 'none' THEN
    RAISE LOG 'block_recurring_slots_for_appointment: appointment % is not recurring (recurrence=%)', p_appointment_id, appt.recurrence;
    RETURN 0;
  END IF;

  -- Normalize Spanish variants just in case
  appt.recurrence := lower(appt.recurrence);
  IF appt.recurrence IN ('quincenal') THEN
    appt.recurrence := 'biweekly';
  ELSIF appt.recurrence IN ('trisemanal', 'triweekly') THEN
    appt.recurrence := 'triweekly';
  ELSIF appt.recurrence IN ('semanal') THEN
    appt.recurrence := 'weekly';
  ELSIF appt.recurrence IN ('mensual') THEN
    appt.recurrence := 'monthly';
  END IF;

  -- Derive local date/time in Costa Rica TZ
  local_date := (appt.start_time AT TIME ZONE 'America/Costa_Rica')::date;
  local_start := (appt.start_time AT TIME ZONE 'America/Costa_Rica')::time;
  local_end := (appt.end_time AT TIME ZONE 'America/Costa_Rica')::time;

  end_limit := local_date + (p_months_ahead * 7); -- interpret as weeks ahead for compatibility

  -- Determine step
  IF appt.recurrence = 'weekly' THEN
    interval_days := 7;
  ELSIF appt.recurrence = 'biweekly' THEN
    interval_days := 14;
  ELSIF appt.recurrence = 'triweekly' THEN
    interval_days := 21;
  END IF;

  -- Advisory lock for this provider/listing/series
  lock_key := hashtext(coalesce(appt.provider_id::text,'') || '|' || coalesce(appt.listing_id::text,'') || '|recurring_block|' || coalesce(appt.start_time::text,''));
  PERFORM pg_advisory_xact_lock(lock_key);

  -- Start from the next occurrence after the current appointment
  IF appt.recurrence = 'monthly' THEN
    -- Monthly: start next month same day if possible
    iter_date := (local_date + INTERVAL '1 month')::date;
  ELSE
    iter_date := local_date + interval_days;
  END IF;

  WHILE iter_date <= end_limit LOOP
    -- Reconstruct zoned datetimes maintaining local time in CR
    occ_start := (iter_date + local_start) AT TIME ZONE 'America/Costa_Rica';
    occ_end := (iter_date + local_end) AT TIME ZONE 'America/Costa_Rica';

    BEGIN
      -- Proactive duplicate cleanup for this exact slot
      DELETE FROM provider_time_slots pts
      WHERE pts.provider_id = appt.provider_id
        AND pts.listing_id = appt.listing_id
        AND pts.slot_datetime_start = occ_start
        AND pts.id NOT IN (
          SELECT id FROM provider_time_slots
          WHERE provider_id = appt.provider_id
            AND listing_id = appt.listing_id
            AND slot_datetime_start = occ_start
          ORDER BY created_at DESC
          LIMIT 1
        );

      -- UPSERT to block (non-reserved) recurring slots
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
        recurring_blocked,
        recurring_rule_id,
        blocked_until,
        slot_type
      ) VALUES (
        appt.provider_id,
        appt.listing_id,
        iter_date,
        local_start,
        local_end,
        occ_start,
        occ_end,
        false,
        false,
        true,
        NULL,
        NULL,
        'recurring_block'
      )
      ON CONFLICT (provider_id, listing_id, slot_datetime_start)
      DO UPDATE SET
        slot_date = EXCLUDED.slot_date,
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time,
        slot_datetime_end = EXCLUDED.slot_datetime_end,
        is_available = false,
        -- preserve any existing reservation
        is_reserved = provider_time_slots.is_reserved OR EXCLUDED.is_reserved,
        recurring_blocked = true,
        recurring_rule_id = NULL,
        blocked_until = NULL,
        slot_type = 'recurring_block';

      GET DIAGNOSTICS blocked_count = blocked_count + ROW_COUNT;
    EXCEPTION WHEN others THEN
      -- Never fail the whole function due to one occurrence
      RAISE LOG 'block_recurring_slots_for_appointment: error blocking % for appt %: %', occ_start, p_appointment_id, SQLERRM;
    END;

    -- Next date
    IF appt.recurrence = 'monthly' THEN
      iter_date := (iter_date + INTERVAL '1 month')::date;
    ELSE
      iter_date := iter_date + interval_days;
    END IF;
  END LOOP;

  RAISE LOG 'block_recurring_slots_for_appointment: blocked % slots ahead for appt % (recurrence=%)', blocked_count, p_appointment_id, appt.recurrence;
  RETURN blocked_count;
END;
$function$;

-- 2) Safer trigger function: wrap blocking/unblocking in EXCEPTION blocks to avoid aborting appointment creation
CREATE OR REPLACE FUNCTION public.manage_recurring_appointment_slots()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  slots_affected integer := 0;
BEGIN
  -- Handle INSERT: Block recurring slots for new recurring appointments
  IF TG_OP = 'INSERT' AND NEW.recurrence IS NOT NULL AND NEW.recurrence != 'none' THEN
    BEGIN
      SELECT block_recurring_slots_for_appointment(NEW.id, 12) INTO slots_affected;
      RAISE LOG 'Auto-blocked % slots for new recurring appointment %', slots_affected, NEW.id;
    EXCEPTION WHEN others THEN
      RAISE LOG 'manage_recurring_appointment_slots (INSERT): error blocking slots for appt %: %', NEW.id, SQLERRM;
      -- do not raise
    END;
    RETURN NEW;
  END IF;

  -- Handle UPDATE: Manage slot blocking based on status and recurrence changes
  IF TG_OP = 'UPDATE' THEN
    -- If appointment was cancelled or rejected, unblock its recurring slots
    IF NEW.status IN ('cancelled', 'rejected') 
       AND OLD.status NOT IN ('cancelled', 'rejected')
       AND OLD.recurrence IS NOT NULL 
       AND OLD.recurrence != 'none' THEN
      BEGIN
        SELECT unblock_recurring_slots_for_appointment(NEW.id) INTO slots_affected;
        RAISE LOG 'Auto-unblocked % slots for cancelled recurring appointment %', slots_affected, NEW.id;
      EXCEPTION WHEN others THEN
        RAISE LOG 'manage_recurring_appointment_slots (UPDATE-cancel): error unblocking slots for appt %: %', NEW.id, SQLERRM;
      END;
    END IF;

    -- If recurrence was added to existing appointment, block slots
    IF NEW.recurrence IS NOT NULL 
       AND NEW.recurrence != 'none' 
       AND (OLD.recurrence IS NULL OR OLD.recurrence = 'none') THEN
      BEGIN
        SELECT block_recurring_slots_for_appointment(NEW.id, 12) INTO slots_affected;
        RAISE LOG 'Auto-blocked % slots for updated recurring appointment %', slots_affected, NEW.id;
      EXCEPTION WHEN others THEN
        RAISE LOG 'manage_recurring_appointment_slots (UPDATE-add): error blocking slots for appt %: %', NEW.id, SQLERRM;
      END;
    END IF;

    -- If recurrence was removed, unblock slots
    IF (NEW.recurrence IS NULL OR NEW.recurrence = 'none') 
       AND OLD.recurrence IS NOT NULL 
       AND OLD.recurrence != 'none' THEN
      BEGIN
        SELECT unblock_recurring_slots_for_appointment(NEW.id) INTO slots_affected;
        RAISE LOG 'Auto-unblocked % slots for removed recurring appointment %', slots_affected, NEW.id;
      EXCEPTION WHEN others THEN
        RAISE LOG 'manage_recurring_appointment_slots (UPDATE-remove): error unblocking slots for appt %: %', NEW.id, SQLERRM;
      END;
    END IF;

    RETURN NEW;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 3) Utility: cleanup duplicate provider_time_slots keeping most recent row
CREATE OR REPLACE FUNCTION public.clean_duplicate_slots()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  dup RECORD;
  deleted_count integer := 0;
BEGIN
  FOR dup IN
    SELECT provider_id, listing_id, slot_datetime_start
    FROM provider_time_slots
    GROUP BY provider_id, listing_id, slot_datetime_start
    HAVING COUNT(*) > 1
  LOOP
    DELETE FROM provider_time_slots t
    WHERE t.provider_id = dup.provider_id
      AND t.listing_id = dup.listing_id
      AND t.slot_datetime_start = dup.slot_datetime_start
      AND t.id NOT IN (
        SELECT id FROM provider_time_slots
        WHERE provider_id = dup.provider_id
          AND listing_id = dup.listing_id
          AND slot_datetime_start = dup.slot_datetime_start
        ORDER BY created_at DESC
        LIMIT 1
      );
    GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
  END LOOP;

  RAISE LOG 'clean_duplicate_slots: removed % duplicate rows', deleted_count;
  RETURN deleted_count;
END;
$function$;

-- Optional one-time cleanup invocation
DO $$
BEGIN
  PERFORM public.clean_duplicate_slots();
EXCEPTION WHEN others THEN
  RAISE LOG 'Error running clean_duplicate_slots(): %', SQLERRM;
END;$$;