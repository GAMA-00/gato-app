
-- This is just a reference file to contain the SQL functions we need
-- These functions need to be executed in Supabase SQL editor

-- Function to get rated appointments
CREATE OR REPLACE FUNCTION get_rated_appointments(appointment_ids UUID[])
RETURNS TABLE (appointment_id UUID) LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
  RETURN QUERY
    SELECT provider_ratings.appointment_id
    FROM provider_ratings
    WHERE provider_ratings.appointment_id = ANY(appointment_ids);
END;
$$;

-- Function to submit provider rating
CREATE OR REPLACE FUNCTION submit_provider_rating(
  p_provider_id UUID,
  p_client_id UUID,
  p_appointment_id UUID,
  p_rating INTEGER
) RETURNS void LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
  -- Insert the rating
  INSERT INTO provider_ratings 
    (provider_id, client_id, appointment_id, rating, created_at)
  VALUES 
    (p_provider_id, p_client_id, p_appointment_id, p_rating, now())
  ON CONFLICT (appointment_id) 
  DO UPDATE SET 
    rating = p_rating,
    created_at = now();
  
  -- Update provider's average rating
  WITH provider_avg AS (
    SELECT 
      AVG(rating) as avg_rating
    FROM provider_ratings
    WHERE provider_id = p_provider_id
  )
  UPDATE providers
  SET average_rating = provider_avg.avg_rating
  FROM provider_avg
  WHERE providers.id = p_provider_id;
END;
$$;
