-- Update the submit_provider_rating function to only consider completed appointments for rating calculation
CREATE OR REPLACE FUNCTION public.submit_provider_rating(
  p_provider_id UUID,
  p_client_id UUID,
  p_appointment_id UUID,
  p_rating INTEGER,
  p_comment TEXT DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Insert the rating with optional comment
  INSERT INTO provider_ratings 
    (provider_id, client_id, appointment_id, rating, comment, created_at)
  VALUES 
    (p_provider_id, p_client_id, p_appointment_id, p_rating, p_comment, now())
  ON CONFLICT (appointment_id) 
  DO UPDATE SET 
    rating = p_rating,
    comment = p_comment,
    created_at = now();
  
  -- Update provider's average rating with base 5-star logic
  -- Only count ratings from COMPLETED appointments
  -- Formula: (5 + sum of real ratings) / (count of real ratings + 1)
  WITH provider_avg AS (
    SELECT 
      (5.0 + SUM(pr.rating::numeric)) / (COUNT(*) + 1) as avg_rating,
      COUNT(*) as rating_count
    FROM provider_ratings pr
    JOIN appointments a ON pr.appointment_id = a.id
    WHERE pr.provider_id = p_provider_id
    AND a.status = 'completed'
  )
  UPDATE users
  SET average_rating = ROUND(provider_avg.avg_rating, 1)
  FROM provider_avg
  WHERE users.id = p_provider_id;
END;
$$;

-- Update the recalculate function to work with completed appointments and fix permissions
CREATE OR REPLACE FUNCTION public.recalculate_all_provider_ratings()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  updated_count INTEGER := 0;
  provider_record RECORD;
BEGIN
  -- For each provider that has ratings from completed appointments
  FOR provider_record IN 
    SELECT 
      pr.provider_id,
      (5.0 + SUM(pr.rating::numeric)) / (COUNT(*) + 1) as avg_rating,
      COUNT(*) as rating_count
    FROM provider_ratings pr
    JOIN appointments a ON pr.appointment_id = a.id
    WHERE a.status = 'completed'
    GROUP BY pr.provider_id
  LOOP
    -- Update the average in the users table with the new logic
    UPDATE users
    SET average_rating = ROUND(provider_record.avg_rating, 1)
    WHERE id = provider_record.provider_id;
    
    updated_count := updated_count + 1;
  END LOOP;
  
  RETURN updated_count;
END;
$$;