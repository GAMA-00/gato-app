-- Migrate existing recurring appointments to block their future slots
DO $$
DECLARE
  apt_record RECORD;
  future_date DATE;
  slot_start_time TIME;
  slot_end_time TIME;
  v_slot_datetime_start TIMESTAMPTZ;
  v_slot_datetime_end TIMESTAMPTZ;
  weeks_to_generate INTEGER := 12;
  week_count INTEGER;
BEGIN
  FOR apt_record IN 
    SELECT 
      id,
      provider_id,
      listing_id,
      start_time,
      end_time,
      recurrence,
      status
    FROM appointments
    WHERE recurrence IS NOT NULL 
      AND recurrence != 'none'
      AND recurrence != ''
      AND status IN ('confirmed', 'pending')
      AND start_time >= NOW()
  LOOP
    slot_start_time := apt_record.start_time::TIME;
    slot_end_time := apt_record.end_time::TIME;
    future_date := apt_record.start_time::DATE;
    week_count := 0;
    
    WHILE week_count < weeks_to_generate LOOP
      CASE apt_record.recurrence
        WHEN 'weekly' THEN
          future_date := future_date + INTERVAL '1 week';
        WHEN 'biweekly' THEN
          future_date := future_date + INTERVAL '2 weeks';
        WHEN 'triweekly' THEN
          future_date := future_date + INTERVAL '3 weeks';
        WHEN 'monthly' THEN
          future_date := future_date + INTERVAL '1 month';
        ELSE
          EXIT;
      END CASE;
      
      v_slot_datetime_start := (future_date + slot_start_time) AT TIME ZONE 'America/Costa_Rica';
      v_slot_datetime_end := (future_date + slot_end_time) AT TIME ZONE 'America/Costa_Rica';
      
      INSERT INTO provider_time_slots (
        provider_id,
        listing_id,
        slot_date,
        start_time,
        end_time,
        slot_datetime_start,
        slot_datetime_end,
        is_available,
        is_reserved,
        recurring_blocked,
        slot_type
      ) VALUES (
        apt_record.provider_id,
        apt_record.listing_id,
        future_date,
        slot_start_time,
        slot_end_time,
        v_slot_datetime_start,
        v_slot_datetime_end,
        false,
        false,
        true,
        'recurring'
      )
      ON CONFLICT (provider_id, listing_id, slot_datetime_start)
      DO UPDATE SET
        recurring_blocked = true,
        is_available = false,
        slot_type = 'recurring'
      WHERE NOT provider_time_slots.is_reserved;
      
      week_count := week_count + 1;
    END LOOP;
    
    RAISE LOG 'Blocked % future slots for recurring appointment %', weeks_to_generate, apt_record.id;
  END LOOP;
  
  RAISE NOTICE 'Migration completed successfully';
END $$;