-- Rename the extended create_appointment_with_slot function to resolve overloading conflict
DROP FUNCTION IF EXISTS public.create_appointment_with_slot(uuid, uuid, uuid, timestamp with time zone, timestamp with time zone, text, text, text, text, text, text, uuid, text[], integer);

-- Create the renamed function with extended parameters
CREATE OR REPLACE FUNCTION public.create_appointment_with_slot_extended(
  p_provider_id uuid, 
  p_listing_id uuid, 
  p_client_id uuid, 
  p_start_time timestamp with time zone, 
  p_end_time timestamp with time zone, 
  p_recurrence text DEFAULT 'none'::text, 
  p_notes text DEFAULT ''::text, 
  p_client_name text DEFAULT 'Cliente'::text, 
  p_client_email text DEFAULT NULL::text, 
  p_client_phone text DEFAULT NULL::text, 
  p_client_address text DEFAULT NULL::text, 
  p_residencia_id uuid DEFAULT NULL::uuid, 
  p_selected_slot_ids text[] DEFAULT NULL::text[], 
  p_total_duration integer DEFAULT NULL::integer
)
RETURNS TABLE(appointment_id uuid, status text)
LANGUAGE plpgsql
AS $function$
DECLARE
  v_appointment_id UUID;
  v_conflict_count INTEGER;
  v_required_slots INTEGER := 1;
  v_i INTEGER;
  v_current_slot_time TIMESTAMPTZ;
BEGIN
  -- Log function call
  RAISE LOG 'create_appointment_with_slot_extended called with provider_id: %, listing_id: %, start_time: %, end_time: %, selected_slot_ids: %', 
    p_provider_id, p_listing_id, p_start_time, p_end_time, p_selected_slot_ids;

  -- Validate required parameters
  IF p_provider_id IS NULL OR p_listing_id IS NULL OR p_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing required parameters: provider_id, listing_id, or client_id';
  END IF;

  -- Calculate required slots if multiple service units were selected
  IF p_total_duration IS NOT NULL AND p_total_duration > 60 THEN
    v_required_slots := CEIL(p_total_duration::NUMERIC / 60);
    RAISE LOG 'Multiple service units detected. Total duration: % minutes, Required slots: %', p_total_duration, v_required_slots;
  END IF;

  -- Check for existing appointment conflicts (qualify status to avoid ambiguity)
  SELECT COUNT(*) INTO v_conflict_count
  FROM appointments a
  WHERE a.provider_id = p_provider_id 
    AND a.status IN ('pending', 'confirmed')
    AND (
      (a.start_time <= p_start_time AND a.end_time > p_start_time) OR
      (a.start_time < p_end_time AND a.end_time >= p_end_time) OR
      (a.start_time >= p_start_time AND a.end_time <= p_end_time)
    );

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'Time slot conflicts with existing appointment';
  END IF;

  -- Create the appointment
  INSERT INTO appointments (
    provider_id,
    listing_id,
    client_id,
    start_time,
    end_time,
    status,
    recurrence,
    notes,
    client_name,
    client_email,
    client_phone,
    client_address,
    residencia_id,
    created_at
  ) VALUES (
    p_provider_id,
    p_listing_id,
    p_client_id,
    p_start_time,
    p_end_time,
    'pending',
    p_recurrence,
    COALESCE(p_notes, ''),
    COALESCE(p_client_name, 'Cliente'),
    p_client_email,
    p_client_phone,
    p_client_address,
    p_residencia_id,
    NOW()
  ) RETURNING id INTO v_appointment_id;

  RAISE LOG 'Appointment created with ID: %', v_appointment_id;

  -- Reserve consecutive time slots if multiple slots are required
  IF v_required_slots > 1 THEN
    RAISE LOG 'Reserving % consecutive slots starting from %', v_required_slots, p_start_time;

    FOR v_i IN 0..(v_required_slots - 1) LOOP
      v_current_slot_time := p_start_time + (v_i * INTERVAL '1 hour');

      -- Update or create slot as reserved (UPSERT)
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
        slot_type,
        created_at
      ) VALUES (
        p_provider_id,
        p_listing_id,
        v_current_slot_time::DATE,
        v_current_slot_time::TIME,
        (v_current_slot_time + INTERVAL '1 hour')::TIME,
        v_current_slot_time,
        v_current_slot_time + INTERVAL '1 hour',
        false,
        true,
        'reserved',
        NOW()
      ) ON CONFLICT (provider_id, listing_id, slot_datetime_start) 
      DO UPDATE SET 
        is_available = false,
        is_reserved = true,
        slot_type = 'reserved';
    END LOOP;
  ELSE
    -- Single slot reservation (existing logic)
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
      slot_type,
      created_at
    ) VALUES (
      p_provider_id,
      p_listing_id,
      p_start_time::DATE,
      p_start_time::TIME,
      p_end_time::TIME,
      p_start_time,
      p_end_time,
      false,
      true,
      'reserved',
      NOW()
    ) ON CONFLICT (provider_id, listing_id, slot_datetime_start) 
    DO UPDATE SET 
      is_available = false,
      is_reserved = true,
      slot_type = 'reserved';
  END IF;

  RAISE LOG 'Successfully reserved % slot(s) for appointment %', v_required_slots, v_appointment_id;

  -- Return the appointment ID and status
  RETURN QUERY SELECT v_appointment_id, 'created'::TEXT;
END;
$function$;