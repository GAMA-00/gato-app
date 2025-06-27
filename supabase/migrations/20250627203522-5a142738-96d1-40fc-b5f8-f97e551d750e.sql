
-- Actualizar la función submit_provider_rating con lógica de calificación base de 5 estrellas
CREATE OR REPLACE FUNCTION public.submit_provider_rating(
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

-- Actualizar la función para recalcular todos los promedios con la nueva lógica
CREATE OR REPLACE FUNCTION public.recalculate_all_provider_ratings()
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
  updated_count INTEGER := 0;
  provider_record RECORD;
BEGIN
  -- Para cada proveedor que tiene calificaciones
  FOR provider_record IN 
    SELECT 
      pr.provider_id,
      (5.0 + SUM(pr.rating::numeric)) / (COUNT(*) + 1) as avg_rating,
      COUNT(*) as rating_count
    FROM provider_ratings pr
    GROUP BY pr.provider_id
  LOOP
    -- Actualizar el promedio en la tabla users con la nueva lógica
    UPDATE users
    SET average_rating = ROUND(provider_record.avg_rating, 1)
    WHERE id = provider_record.provider_id;
    
    updated_count := updated_count + 1;
  END LOOP;
  
  RETURN updated_count;
END;
$$;

-- Ejecutar la función para recalcular todos los promedios existentes
SELECT recalculate_all_provider_ratings();
