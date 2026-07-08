DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT l.id AS listing_id, l.provider_id
    FROM listings l
    WHERE l.is_active = true
      AND EXISTS (SELECT 1 FROM provider_availability pa WHERE pa.provider_id = l.provider_id AND pa.is_active = true)
  LOOP
    BEGIN
      PERFORM public.generate_provider_time_slots_for_listing(r.provider_id, r.listing_id, 60);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Failed for listing %: %', r.listing_id, SQLERRM;
    END;
  END LOOP;
END $$;