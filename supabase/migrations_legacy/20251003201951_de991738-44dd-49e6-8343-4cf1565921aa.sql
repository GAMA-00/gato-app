
-- Clean phantom recurring_blocked slots that have no associated appointments or instances
UPDATE provider_time_slots
SET 
  recurring_blocked = false,
  is_available = true,
  recurring_rule_id = NULL
WHERE recurring_blocked = true
  AND slot_date >= CURRENT_DATE
  AND id IN (
    SELECT pts.id
    FROM provider_time_slots pts
    LEFT JOIN appointments a ON 
      a.provider_id = pts.provider_id 
      AND a.status IN ('pending', 'confirmed')
      AND a.start_time <= pts.slot_datetime_end
      AND a.end_time >= pts.slot_datetime_start
    LEFT JOIN recurring_appointment_instances rai ON
      rai.start_time <= pts.slot_datetime_end
      AND rai.end_time >= pts.slot_datetime_start
      AND rai.status IN ('scheduled', 'confirmed')
    WHERE pts.recurring_blocked = true
      AND pts.slot_date >= CURRENT_DATE
    GROUP BY pts.id
    HAVING COUNT(DISTINCT a.id) = 0 AND COUNT(DISTINCT rai.id) = 0
  );
