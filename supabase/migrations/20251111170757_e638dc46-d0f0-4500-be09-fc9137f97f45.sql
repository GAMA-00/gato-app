-- ============================================
-- Fix Final Function Search Path Warnings (Part 3 - With DROP)
-- Drop and recreate overloaded functions with search_path
-- ============================================

-- Drop conflicting function versions first
DROP FUNCTION IF EXISTS public.block_recurring_slots(uuid, integer);
DROP FUNCTION IF EXISTS public.calculate_next_occurrence_sql(date, text, date);
DROP FUNCTION IF EXISTS public.consolidate_multiple_listings();
DROP FUNCTION IF EXISTS public.generate_recurring_instances(uuid, date, date);
DROP FUNCTION IF EXISTS public.unblock_recurring_slots(uuid);

-- Fix block_recurring_slots
CREATE FUNCTION public.block_recurring_slots(
  p_recurring_rule_id uuid,
  p_months_ahead integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  slots_blocked INTEGER := 0;
  rule_record RECORD;
BEGIN
  SELECT * INTO rule_record
  FROM recurring_rules
  WHERE id = p_recurring_rule_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  UPDATE provider_time_slots
  SET 
    is_available = false,
    is_reserved = false,
    recurring_blocked = true,
    recurring_rule_id = p_recurring_rule_id
  WHERE provider_id = rule_record.provider_id
    AND listing_id = rule_record.listing_id
    AND start_time = rule_record.start_time
    AND end_time = rule_record.end_time
    AND slot_date >= rule_record.start_date
    AND slot_date <= rule_record.start_date + (p_months_ahead * 30);
    
  GET DIAGNOSTICS slots_blocked = ROW_COUNT;
  RETURN slots_blocked;
END;
$function$;

-- Fix calculate_next_occurrence_sql
CREATE FUNCTION public.calculate_next_occurrence_sql(
  original_date date,
  recurrence_type text,
  reference_date date
)
RETURNS date
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  CASE recurrence_type
    WHEN 'weekly' THEN
      RETURN reference_date + 7;
    WHEN 'biweekly' THEN
      RETURN reference_date + 14;
    WHEN 'monthly' THEN
      RETURN reference_date + INTERVAL '1 month';
    ELSE
      RETURN reference_date;
  END CASE;
END;
$function$;

-- Fix consolidate_multiple_listings
CREATE FUNCTION public.consolidate_multiple_listings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  consolidated_count INTEGER := 0;
BEGIN
  RETURN consolidated_count;
END;
$function$;

-- Fix create_appointment_with_slot_extended
CREATE OR REPLACE FUNCTION public.create_appointment_with_slot_extended(
  p_provider_id uuid,
  p_listing_id uuid,
  p_client_id uuid,
  p_start_time timestamp with time zone,
  p_end_time timestamp with time zone,
  p_recurrence text DEFAULT 'none',
  p_notes text DEFAULT '',
  p_client_name text DEFAULT 'Cliente',
  p_client_email text DEFAULT NULL,
  p_client_phone text DEFAULT NULL,
  p_client_address text DEFAULT NULL,
  p_residencia_id uuid DEFAULT NULL,
  p_selected_slot_ids text[] DEFAULT NULL,
  p_total_duration integer DEFAULT NULL
)
RETURNS TABLE(appointment_id uuid, status text)
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
DECLARE
  v_appointment_id UUID;
  v_conflict_count INTEGER;
  v_required_slots INTEGER := 1;
  v_i INTEGER;
  v_current_slot_time TIMESTAMPTZ;
BEGIN
  IF p_provider_id IS NULL OR p_listing_id IS NULL OR p_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing required parameters';
  END IF;

  IF p_total_duration IS NOT NULL AND p_total_duration > 60 THEN
    v_required_slots := CEIL(p_total_duration::NUMERIC / 60);
  END IF;

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

  INSERT INTO appointments (
    provider_id, listing_id, client_id, start_time, end_time,
    status, recurrence, notes, client_name, client_email,
    client_phone, client_address, residencia_id, created_at
  ) VALUES (
    p_provider_id, p_listing_id, p_client_id, p_start_time, p_end_time,
    'pending', p_recurrence, COALESCE(p_notes, ''),
    COALESCE(p_client_name, 'Cliente'), p_client_email,
    p_client_phone, p_client_address, p_residencia_id, NOW()
  ) RETURNING id INTO v_appointment_id;

  IF v_required_slots > 1 THEN
    FOR v_i IN 0..(v_required_slots - 1) LOOP
      v_current_slot_time := p_start_time + (v_i * INTERVAL '1 hour');
      
      INSERT INTO provider_time_slots (
        provider_id, listing_id, slot_date, start_time, end_time,
        slot_datetime_start, slot_datetime_end, is_available,
        is_reserved, slot_type, created_at
      ) VALUES (
        p_provider_id, p_listing_id, v_current_slot_time::DATE,
        v_current_slot_time::TIME, (v_current_slot_time + INTERVAL '1 hour')::TIME,
        v_current_slot_time, v_current_slot_time + INTERVAL '1 hour',
        false, true, 'reserved', NOW()
      ) ON CONFLICT (provider_id, listing_id, slot_datetime_start) 
      DO UPDATE SET is_available = false, is_reserved = true, slot_type = 'reserved';
    END LOOP;
  ELSE
    INSERT INTO provider_time_slots (
      provider_id, listing_id, slot_date, start_time, end_time,
      slot_datetime_start, slot_datetime_end, is_available,
      is_reserved, slot_type, created_at
    ) VALUES (
      p_provider_id, p_listing_id, p_start_time::DATE,
      p_start_time::TIME, p_end_time::TIME, p_start_time, p_end_time,
      false, true, 'reserved', NOW()
    ) ON CONFLICT (provider_id, listing_id, slot_datetime_start) 
    DO UPDATE SET is_available = false, is_reserved = true, slot_type = 'reserved';
  END IF;

  RETURN QUERY SELECT v_appointment_id, 'created'::TEXT;
END;
$function$;

-- Fix generate_provider_time_slots (4 param version)
CREATE OR REPLACE FUNCTION public.generate_provider_time_slots(
  p_provider_id uuid,
  p_listing_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS integer
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
DECLARE
  availability_record RECORD;
  iter_date DATE;
  slot_start TIMESTAMP WITH TIME ZONE;
  slot_end TIMESTAMP WITH TIME ZONE;
  service_duration INTEGER;
  slots_created INTEGER := 0;
  row_count_var INTEGER;
BEGIN
  SELECT standard_duration INTO service_duration
  FROM listings 
  WHERE id = p_listing_id;
  
  IF service_duration IS NULL THEN
    RETURN 0;
  END IF;
  
  iter_date := p_start_date;
  WHILE iter_date <= p_end_date LOOP
    FOR availability_record IN 
      SELECT day_of_week, start_time, end_time
      FROM provider_availability
      WHERE provider_id = p_provider_id 
        AND day_of_week = EXTRACT(DOW FROM iter_date)
        AND is_active = true
    LOOP
      slot_start := iter_date + availability_record.start_time;
      
      WHILE slot_start + (service_duration || ' minutes')::INTERVAL <= iter_date + availability_record.end_time LOOP
        slot_end := slot_start + (service_duration || ' minutes')::INTERVAL;
        
        INSERT INTO provider_time_slots (
          provider_id, listing_id, slot_date, start_time, end_time,
          slot_datetime_start, slot_datetime_end
        ) VALUES (
          p_provider_id, p_listing_id, iter_date,
          slot_start::TIME, slot_end::TIME, slot_start, slot_end
        ) ON CONFLICT (provider_id, listing_id, slot_datetime_start) DO NOTHING;
        
        GET DIAGNOSTICS row_count_var = ROW_COUNT;
        slots_created := slots_created + row_count_var;
        slot_start := slot_end;
      END LOOP;
    END LOOP;
    
    iter_date := iter_date + 1;
  END LOOP;
  
  RETURN slots_created;
END;
$function$;

-- Fix generate_recurring_instances
CREATE FUNCTION public.generate_recurring_instances(
  rule_id uuid,
  start_range date,
  end_range date
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  instances_created INTEGER := 0;
BEGIN
  RETURN instances_created;
END;
$function$;

-- Fix unblock_recurring_slots
CREATE FUNCTION public.unblock_recurring_slots(
  p_recurring_rule_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  slots_unblocked INTEGER := 0;
BEGIN
  UPDATE provider_time_slots
  SET 
    is_available = true,
    is_reserved = false,
    recurring_blocked = false,
    recurring_rule_id = NULL
  WHERE recurring_rule_id = p_recurring_rule_id
    AND recurring_blocked = true;
    
  GET DIAGNOSTICS slots_unblocked = ROW_COUNT;
  RETURN slots_unblocked;
END;
$function$;