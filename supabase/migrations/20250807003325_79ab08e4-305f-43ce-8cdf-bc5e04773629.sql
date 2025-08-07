-- Fix security issues: Set proper search paths for functions

-- Fix calculate_next_occurrence_sql function
CREATE OR REPLACE FUNCTION public.calculate_next_occurrence_sql(
  original_date DATE,
  recurrence_type TEXT,
  reference_date DATE DEFAULT CURRENT_DATE
) RETURNS DATE
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_date DATE;
  day_of_week INTEGER;
  weeks_diff INTEGER;
  remainder INTEGER;
BEGIN
  CASE recurrence_type
    WHEN 'weekly' THEN
      -- Find next weekly occurrence
      day_of_week := EXTRACT(DOW FROM original_date);
      next_date := reference_date;
      
      -- Find next occurrence of the same day of week
      WHILE EXTRACT(DOW FROM next_date) != day_of_week OR next_date <= reference_date LOOP
        next_date := next_date + 1;
      END LOOP;
      
    WHEN 'biweekly' THEN
      -- Find next biweekly occurrence (every 14 days)
      day_of_week := EXTRACT(DOW FROM original_date);
      next_date := reference_date;
      
      -- Find next occurrence of the same day of week
      WHILE EXTRACT(DOW FROM next_date) != day_of_week LOOP
        next_date := next_date + 1;
      END LOOP;
      
      -- Check if it falls on the correct biweekly cycle
      weeks_diff := (next_date - original_date) / 7;
      IF weeks_diff % 2 != 0 THEN
        next_date := next_date + 7;
      END IF;
      
      -- If still not in future, advance by 14 days
      IF next_date <= reference_date THEN
        next_date := next_date + 14;
      END IF;
      
    WHEN 'triweekly' THEN
      -- Find next triweekly occurrence (every 21 days)
      day_of_week := EXTRACT(DOW FROM original_date);
      next_date := reference_date;
      
      -- Find next occurrence of the same day of week
      WHILE EXTRACT(DOW FROM next_date) != day_of_week LOOP
        next_date := next_date + 1;
      END LOOP;
      
      -- Check if it falls on the correct triweekly cycle (every 3 weeks)
      weeks_diff := (next_date - original_date) / 7;
      remainder := weeks_diff % 3;
      IF remainder != 0 THEN
        next_date := next_date + (3 - remainder) * 7;
      END IF;
      
      -- If still not in future, advance by 21 days
      IF next_date <= reference_date THEN
        next_date := next_date + 21;
      END IF;
      
    WHEN 'monthly' THEN
      -- Monthly: same day of month, next month if needed
      next_date := DATE_TRUNC('month', reference_date) + 
                   (EXTRACT(DAY FROM original_date)::INTEGER - 1) * INTERVAL '1 day';
      
      -- If this month's date has passed, go to next month
      IF next_date <= reference_date THEN
        next_date := DATE_TRUNC('month', reference_date + INTERVAL '1 month') + 
                     (EXTRACT(DAY FROM original_date)::INTEGER - 1) * INTERVAL '1 day';
      END IF;
      
    ELSE
      -- Default: return original date
      next_date := original_date;
  END CASE;
  
  RETURN next_date;
END;
$$;

-- Fix fix_triweekly_blocked_slots function
CREATE OR REPLACE FUNCTION public.fix_triweekly_blocked_slots()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  appointment_record RECORD;
  slots_fixed INTEGER := 0;
  total_fixed INTEGER := 0;
BEGIN
  RAISE LOG 'Starting fix for triweekly blocked slots...';
  
  -- Find all triweekly appointments that might have incorrectly blocked slots
  FOR appointment_record IN 
    SELECT id, recurrence, start_time, provider_id, listing_id
    FROM appointments 
    WHERE recurrence = 'triweekly'
    AND status IN ('pending', 'confirmed')
  LOOP
    RAISE LOG 'Fixing slots for triweekly appointment %', appointment_record.id;
    
    -- Unblock existing incorrectly blocked slots
    SELECT unblock_recurring_slots_for_appointment(appointment_record.id) INTO slots_fixed;
    
    -- Re-block with correct logic
    SELECT block_recurring_slots_for_appointment(appointment_record.id, 12) INTO slots_fixed;
    
    total_fixed := total_fixed + slots_fixed;
    
    RAISE LOG 'Fixed % slots for appointment %', slots_fixed, appointment_record.id;
  END LOOP;
  
  RAISE LOG 'Total slots fixed: %', total_fixed;
  RETURN total_fixed;
END;
$$;