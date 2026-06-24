-- Fix auto-rating to only occur after 4 days (not 7) since completion
-- Update the auto_rate_old_appointments function to use 4 days

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
  -- Find completed appointments older than 4 days that haven't been rated
  FOR appointment_record IN 
    SELECT a.id, a.provider_id, a.client_id
    FROM appointments a
    WHERE a.status = 'completed'
      AND a.end_time < (NOW() - INTERVAL '4 days')
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
    )
    ON CONFLICT (appointment_id) DO NOTHING; -- Prevent duplicates
    
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
        AND a.end_time < (NOW() - INTERVAL '4 days')
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