-- Fix all other functions that use extract() with wrong types
-- Let's fix the recurring availability check function
DROP FUNCTION IF EXISTS public.check_recurring_availability(uuid, timestamp with time zone, timestamp with time zone, uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.check_recurring_availability(
  p_provider_id uuid, 
  p_start_time timestamp with time zone, 
  p_end_time timestamp with time zone, 
  p_exclude_rule_id uuid DEFAULT NULL::uuid
)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
DECLARE
  conflict_count INTEGER;
  p_day_of_week INTEGER;
  p_time_of_day TIME;
  p_end_time_of_day TIME;
  p_day_of_month INTEGER;
BEGIN
  -- Extract components of time once - FIX THE EXTRACT ISSUE
  p_day_of_week := EXTRACT(DOW FROM p_start_time::TIMESTAMP)::INTEGER;
  p_time_of_day := p_start_time::TIME;
  p_end_time_of_day := p_end_time::TIME;
  p_day_of_month := EXTRACT(DAY FROM p_start_time::TIMESTAMP)::INTEGER;
  
  -- Verificar conflictos con reglas de recurrencia activas
  SELECT COUNT(*) INTO conflict_count
  FROM recurring_rules rr
  WHERE rr.provider_id = p_provider_id
    AND rr.is_active = true
    AND (p_exclude_rule_id IS NULL OR rr.id != p_exclude_rule_id)
    AND (
      -- Verificar si el tiempo solicitado coincide con alguna recurrencia
      (rr.recurrence_type = 'weekly' AND 
       p_day_of_week = rr.day_of_week AND
       rr.start_time < p_end_time_of_day AND
       rr.end_time > p_time_of_day)
      OR
      (rr.recurrence_type = 'biweekly' AND 
       p_day_of_week = rr.day_of_week AND
       EXTRACT(DAYS FROM p_start_time::DATE - rr.start_date)::INTEGER % 14 = 0 AND
       rr.start_time < p_end_time_of_day AND
       rr.end_time > p_time_of_day)
      OR
      (rr.recurrence_type = 'monthly' AND 
       p_day_of_month = rr.day_of_month AND
       rr.start_time < p_end_time_of_day AND
       rr.end_time > p_time_of_day)
    );
  
  RETURN conflict_count = 0;
END;
$function$;