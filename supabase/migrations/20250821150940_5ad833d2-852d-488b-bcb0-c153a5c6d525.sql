-- Fix the achievements system by updating the get_recurring_clients_count function
-- and creating a function to automatically mark past appointments as completed

-- Update get_recurring_clients_count to include both confirmed and completed appointments
CREATE OR REPLACE FUNCTION public.get_recurring_clients_count(provider_id uuid)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COUNT(DISTINCT appointments.client_id)
    FROM appointments
    WHERE appointments.provider_id = $1 
      AND appointments.client_id IS NOT NULL
      AND appointments.recurrence IS NOT NULL 
      AND appointments.recurrence IN ('weekly', 'biweekly', 'monthly')
      AND appointments.status IN ('confirmed', 'completed')
  );
END;
$$;

-- Create a function to mark past appointments as completed
CREATE OR REPLACE FUNCTION public.mark_past_appointments_completed()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER := 0;
BEGIN
  -- Mark appointments as completed if they ended more than 1 hour ago and are still confirmed
  UPDATE appointments 
  SET status = 'completed'
  WHERE status = 'confirmed' 
    AND end_time < (NOW() - INTERVAL '1 hour');
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN updated_count;
END;
$$;

-- Create a function to get provider achievements data more efficiently
CREATE OR REPLACE FUNCTION public.get_provider_achievements_data(p_provider_id uuid)
RETURNS TABLE (
  completed_jobs_count integer,
  recurring_clients_count integer,
  average_rating numeric,
  total_ratings integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- First, mark any past appointments as completed
  PERFORM mark_past_appointments_completed();
  
  RETURN QUERY
  WITH appointment_stats AS (
    SELECT 
      COUNT(*) FILTER (WHERE a.status = 'completed') as completed_count,
      COUNT(DISTINCT a.client_id) FILTER (
        WHERE a.recurrence IN ('weekly', 'biweekly', 'monthly') 
        AND a.status IN ('confirmed', 'completed')
      ) as recurring_count
    FROM appointments a
    WHERE a.provider_id = p_provider_id
  ),
  rating_stats AS (
    SELECT 
      AVG(pr.rating)::numeric as avg_rating,
      COUNT(pr.rating) as rating_count
    FROM provider_ratings pr
    JOIN appointments a ON pr.appointment_id = a.id
    WHERE pr.provider_id = p_provider_id
      AND a.status = 'completed'
  )
  SELECT 
    COALESCE(appointment_stats.completed_count::integer, 0),
    COALESCE(appointment_stats.recurring_count::integer, 0),
    COALESCE(rating_stats.avg_rating, 5.0),
    COALESCE(rating_stats.rating_count::integer, 0)
  FROM appointment_stats
  CROSS JOIN rating_stats;
END;
$$;