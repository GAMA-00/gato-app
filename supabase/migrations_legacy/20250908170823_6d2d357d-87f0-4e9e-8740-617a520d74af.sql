-- Create function to auto-rate appointments older than 7 days
CREATE OR REPLACE FUNCTION auto_rate_old_appointments()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  auto_rated_count INTEGER := 0;
  appointment_record RECORD;
BEGIN
  -- Find completed appointments older than 7 days that haven't been rated
  FOR appointment_record IN 
    SELECT a.id, a.provider_id, a.client_id
    FROM appointments a
    WHERE a.status = 'completed'
      AND a.end_time < (NOW() - INTERVAL '7 days')
      AND NOT EXISTS (
        SELECT 1 FROM provider_ratings pr 
        WHERE pr.appointment_id = a.id
      )
  LOOP
    -- Auto-rate with 5 stars and no comment
    INSERT INTO provider_ratings (
      provider_id,
      client_id, 
      appointment_id,
      rating,
      comment,
      created_at
    ) VALUES (
      appointment_record.provider_id,
      appointment_record.client_id,
      appointment_record.id,
      5,
      NULL,
      NOW()
    );
    
    auto_rated_count := auto_rated_count + 1;
  END LOOP;
  
  -- Update provider average ratings for affected providers
  WITH affected_providers AS (
    SELECT DISTINCT provider_id 
    FROM appointments 
    WHERE id IN (
      SELECT a.id 
      FROM appointments a
      WHERE a.status = 'completed'
        AND a.end_time < (NOW() - INTERVAL '7 days')
        AND EXISTS (
          SELECT 1 FROM provider_ratings pr 
          WHERE pr.appointment_id = a.id
            AND pr.created_at >= (NOW() - INTERVAL '1 minute')
        )
    )
  )
  UPDATE users
  SET average_rating = (
    SELECT ROUND((5.0 + SUM(pr.rating::numeric)) / (COUNT(*) + 1), 1)
    FROM provider_ratings pr
    WHERE pr.provider_id = affected_providers.provider_id
  )
  FROM affected_providers
  WHERE users.id = affected_providers.provider_id;
  
  RETURN auto_rated_count;
END;
$$;

-- Create unique index to prevent duplicate ratings
CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_ratings_appointment_unique 
ON provider_ratings (appointment_id);

-- Update the submit_provider_rating function to accept comments (already exists but let's make sure)
CREATE OR REPLACE FUNCTION submit_provider_rating(
  p_provider_id UUID,
  p_client_id UUID, 
  p_appointment_id UUID,
  p_rating INTEGER,
  p_comment TEXT DEFAULT NULL
) RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Insert the rating with comment
  INSERT INTO provider_ratings 
    (provider_id, client_id, appointment_id, rating, comment, created_at)
  VALUES 
    (p_provider_id, p_client_id, p_appointment_id, p_rating, p_comment, NOW())
  ON CONFLICT (appointment_id) 
  DO UPDATE SET 
    rating = p_rating,
    comment = p_comment,
    created_at = NOW();
  
  -- Update provider's average rating with base 5-star logic
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