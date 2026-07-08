-- Update the submit_provider_rating function to include comments
CREATE OR REPLACE FUNCTION public.submit_provider_rating(
  p_provider_id UUID,
  p_client_id UUID,
  p_appointment_id UUID,
  p_rating INTEGER,
  p_comment TEXT DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY INVOKER AS $$
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
  -- Formula: (5 + sum of real ratings) / (count of real ratings + 1)
  WITH provider_avg AS (
    SELECT 
      (5.0 + SUM(rating::numeric)) / (COUNT(*) + 1) as avg_rating,
      COUNT(*) as rating_count
    FROM provider_ratings
    WHERE provider_id = p_provider_id
  )
  UPDATE users
  SET average_rating = ROUND(provider_avg.avg_rating, 1)
  FROM provider_avg
  WHERE users.id = p_provider_id;
END;
$$;