-- Fix permissions and improve the recurring instance generation function

-- Drop and recreate the function with proper security definer
DROP FUNCTION IF EXISTS public.generate_recurring_appointment_instances(uuid, integer);

CREATE OR REPLACE FUNCTION public.generate_recurring_appointment_instances(p_rule_id uuid, p_weeks_ahead integer DEFAULT 10)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rule_record recurring_rules%ROWTYPE;
  start_date_calc DATE;
  end_date_calc DATE;
  next_occurrence DATE;
  instance_count INTEGER := 0;
  start_datetime TIMESTAMP WITH TIME ZONE;
  end_datetime TIMESTAMP WITH TIME ZONE;
  instances_created INTEGER := 0;
BEGIN
  -- Get the recurring rule
  SELECT * INTO rule_record 
  FROM recurring_rules 
  WHERE id = p_rule_id AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE LOG 'Rule not found or inactive: %', p_rule_id;
    RETURN 0;
  END IF;
  
  RAISE LOG 'Processing rule % with type %', p_rule_id, rule_record.recurrence_type;
  
  -- Set date limits
  start_date_calc := GREATEST(rule_record.start_date, CURRENT_DATE);
  end_date_calc := start_date_calc + (p_weeks_ahead * 7);
  
  RAISE LOG 'Date range: % to %', start_date_calc, end_date_calc;
  
  -- Find the first valid occurrence
  next_occurrence := start_date_calc;
  
  WHILE next_occurrence <= end_date_calc AND instances_created < 50 LOOP
    -- Calculate next occurrence based on recurrence type
    CASE rule_record.recurrence_type
      WHEN 'weekly' THEN
        -- Find next correct day of week
        WHILE EXTRACT(DOW FROM next_occurrence::TIMESTAMP)::INTEGER != rule_record.day_of_week LOOP
          next_occurrence := next_occurrence + 1;
        END LOOP;
        
      WHEN 'biweekly' THEN
        -- Find next correct day every 2 weeks
        WHILE EXTRACT(DOW FROM next_occurrence::TIMESTAMP)::INTEGER != rule_record.day_of_week OR
              EXTRACT(DAYS FROM next_occurrence - rule_record.start_date)::INTEGER % 14 != 0 LOOP
          next_occurrence := next_occurrence + 1;
          -- Prevent infinite loop
          IF next_occurrence > end_date_calc THEN
            EXIT;
          END IF;
        END LOOP;
        
      WHEN 'monthly' THEN
        -- Same day of month
        WHILE EXTRACT(DAY FROM next_occurrence::TIMESTAMP)::INTEGER != rule_record.day_of_month LOOP
          next_occurrence := next_occurrence + 1;
          -- If we've passed into next month, adjust
          IF EXTRACT(DAY FROM next_occurrence::TIMESTAMP)::INTEGER < EXTRACT(DAY FROM (next_occurrence - 1)::TIMESTAMP)::INTEGER THEN
            next_occurrence := DATE_TRUNC('month', next_occurrence) + 
                             (rule_record.day_of_month - 1) * INTERVAL '1 day';
          END IF;
          -- Prevent infinite loop
          IF next_occurrence > end_date_calc THEN
            EXIT;
          END IF;
        END LOOP;
    END CASE;
    
    -- Exit if we exceed the limit
    IF next_occurrence > end_date_calc THEN
      EXIT;
    END IF;
    
    -- Create complete timestamp with timezone (Costa Rica)
    start_datetime := (next_occurrence + rule_record.start_time) AT TIME ZONE 'America/Costa_Rica';
    end_datetime := (next_occurrence + rule_record.end_time) AT TIME ZONE 'America/Costa_Rica';
    
    -- Check for conflicts with existing appointments or instances
    IF NOT EXISTS (
      SELECT 1 FROM appointments 
      WHERE provider_id = rule_record.provider_id
      AND start_time < end_datetime 
      AND end_time > start_datetime
      AND status NOT IN ('cancelled', 'rejected')
    ) AND NOT EXISTS (
      SELECT 1 FROM recurring_appointment_instances rai
      JOIN recurring_rules rr ON rai.recurring_rule_id = rr.id
      WHERE rr.provider_id = rule_record.provider_id
      AND rai.start_time < end_datetime 
      AND rai.end_time > start_datetime
      AND rai.status NOT IN ('cancelled', 'rejected')
      AND rai.recurring_rule_id != p_rule_id
    ) THEN
      -- Insert the instance
      BEGIN
        INSERT INTO recurring_appointment_instances (
          recurring_rule_id,
          instance_date,
          start_time,
          end_time,
          status,
          notes
        ) VALUES (
          p_rule_id,
          next_occurrence,
          start_datetime,
          end_datetime,
          'scheduled',
          rule_record.notes
        ) ON CONFLICT (recurring_rule_id, instance_date) DO NOTHING;
        
        GET DIAGNOSTICS instance_count = ROW_COUNT;
        IF instance_count > 0 THEN
          instances_created := instances_created + 1;
          RAISE LOG 'Created instance for %', next_occurrence;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'Error creating instance for %: %', next_occurrence, SQLERRM;
      END;
    END IF;
    
    -- Advance to next date based on pattern
    CASE rule_record.recurrence_type
      WHEN 'weekly' THEN
        next_occurrence := next_occurrence + 7;
      WHEN 'biweekly' THEN
        next_occurrence := next_occurrence + 14;
      WHEN 'monthly' THEN
        next_occurrence := next_occurrence + 30; -- Approximate for next month search
    END CASE;
  END LOOP;
  
  RAISE LOG 'Created % instances for rule %', instances_created, p_rule_id;
  RETURN instances_created;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.generate_recurring_appointment_instances(uuid, integer) TO authenticated;