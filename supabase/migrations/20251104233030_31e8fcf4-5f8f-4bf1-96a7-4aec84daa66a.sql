-- ==========================================
-- PHASE 1: Status Normalization & Audit Trail
-- ==========================================

-- 1. Normalize 'scheduled' status to 'confirmed' in both tables
UPDATE appointments 
SET status = 'confirmed' 
WHERE status = 'scheduled';

UPDATE recurring_appointment_instances 
SET status = 'confirmed' 
WHERE status = 'scheduled';

-- 2. Add audit columns to appointments table
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS created_from TEXT DEFAULT 'client_app',
ADD COLUMN IF NOT EXISTS created_by_user UUID REFERENCES auth.users(id);

-- 3. Backfill created_by_user with client_id for existing appointments
UPDATE appointments 
SET created_by_user = client_id 
WHERE created_by_user IS NULL AND client_id IS NOT NULL;

-- ==========================================
-- PHASE 2: Atomic Cancellation Function
-- ==========================================

-- Create atomic function to cancel/skip appointments consistently
CREATE OR REPLACE FUNCTION cancel_appointment_atomic(
  p_appointment_id UUID,
  p_cancel_future BOOLEAN DEFAULT false,
  p_reason TEXT DEFAULT 'user_cancelled',
  p_cancelled_by UUID DEFAULT NULL
)
RETURNS TABLE(affected_count INTEGER, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_appointment appointments%ROWTYPE;
  v_affected_count INTEGER := 0;
  v_instance_count INTEGER := 0;
BEGIN
  -- Get appointment details
  SELECT * INTO v_appointment 
  FROM appointments 
  WHERE id = p_appointment_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found: %', p_appointment_id;
  END IF;
  
  -- Verify authorization
  IF p_cancelled_by IS NOT NULL AND p_cancelled_by != v_appointment.client_id AND p_cancelled_by != v_appointment.provider_id THEN
    RAISE EXCEPTION 'Unauthorized: user cannot cancel this appointment';
  END IF;
  
  -- Update the main appointment
  UPDATE appointments
  SET 
    status = 'cancelled',
    cancellation_reason = p_reason,
    cancellation_time = NOW(),
    last_modified_at = NOW(),
    last_modified_by = COALESCE(p_cancelled_by, auth.uid()),
    notes = CASE 
      WHEN p_reason = 'skipped_by_client' THEN COALESCE(notes || ' ', '') || '[SKIPPED BY CLIENT]'
      ELSE notes
    END
  WHERE id = p_appointment_id;
  
  GET DIAGNOSTICS v_affected_count = ROW_COUNT;
  
  -- If it's a recurring appointment and cancel_future is true, cancel all future instances
  IF p_cancel_future AND v_appointment.recurrence IS NOT NULL AND v_appointment.recurrence != 'none' THEN
    -- Cancel future instances in recurring_appointment_instances
    UPDATE recurring_appointment_instances
    SET 
      status = 'cancelled',
      notes = COALESCE(notes || ' ', '') || '[CANCELLED WITH PARENT]'
    WHERE recurring_rule_id IN (
      SELECT id FROM recurring_rules 
      WHERE provider_id = v_appointment.provider_id 
        AND client_id = v_appointment.client_id
        AND listing_id = v_appointment.listing_id
    )
    AND instance_date > CURRENT_DATE
    AND status NOT IN ('cancelled', 'completed');
    
    GET DIAGNOSTICS v_instance_count = ROW_COUNT;
    v_affected_count := v_affected_count + v_instance_count;
    
    -- Unblock recurring slots
    PERFORM unblock_recurring_slots_for_appointment(p_appointment_id);
  END IF;
  
  -- Release the time slots
  UPDATE provider_time_slots
  SET 
    is_available = true,
    is_reserved = false,
    recurring_blocked = false
  WHERE provider_id = v_appointment.provider_id
    AND listing_id = v_appointment.listing_id
    AND slot_datetime_start >= v_appointment.start_time
    AND (
      slot_datetime_start = v_appointment.start_time OR
      (p_cancel_future AND recurring_blocked = true)
    );
  
  RETURN QUERY SELECT v_affected_count, format('Cancelled %s appointment(s)', v_affected_count);
END;
$$;

-- ==========================================
-- PHASE 3: Unified Appointments View
-- ==========================================

-- Create view that unifies appointments and recurring instances
CREATE OR REPLACE VIEW unified_appointments AS
SELECT 
  a.id,
  a.listing_id,
  a.provider_id,
  a.client_id,
  a.residencia_id,
  a.start_time,
  a.end_time,
  a.status,
  a.recurrence,
  a.notes,
  a.client_name,
  a.client_email,
  a.client_phone,
  a.client_address,
  a.created_at,
  a.is_recurring_instance,
  a.recurrence_group_id,
  a.external_booking,
  a.final_price,
  a.price_finalized,
  'appointment' as source_type,
  a.created_from,
  a.created_by_user
FROM appointments a
WHERE a.notes NOT LIKE '%[SKIPPED BY CLIENT]%'

UNION ALL

SELECT 
  rai.id,
  rr.listing_id,
  rr.provider_id,
  rr.client_id,
  NULL as residencia_id,
  rai.start_time,
  rai.end_time,
  rai.status,
  rr.recurrence_type as recurrence,
  rai.notes,
  rr.client_name,
  rr.client_email,
  rr.client_phone,
  rr.client_address,
  rai.created_at,
  true as is_recurring_instance,
  rr.id as recurrence_group_id,
  false as external_booking,
  NULL as final_price,
  false as price_finalized,
  'recurring_instance' as source_type,
  'system' as created_from,
  rr.client_id as created_by_user
FROM recurring_appointment_instances rai
JOIN recurring_rules rr ON rai.recurring_rule_id = rr.id
WHERE rai.notes NOT LIKE '%[SKIPPED BY CLIENT]%'
  AND rai.notes NOT LIKE '%[CANCELLED WITH PARENT]%';

-- Grant access to the view
GRANT SELECT ON unified_appointments TO authenticated;

-- ==========================================
-- PHASE 4: Strengthen RLS Policies
-- ==========================================

-- Ensure only clients can create appointments (not edge functions without client context)
DROP POLICY IF EXISTS "Clients can create appointment requests" ON appointments;
CREATE POLICY "Clients can create appointment requests"
ON appointments
FOR INSERT
WITH CHECK (
  auth.uid() = client_id 
  AND status = 'pending'
  AND created_by_user = client_id
);

-- Ensure recurring instances can only be created by system
DROP POLICY IF EXISTS "Clients can create their recurring instances" ON recurring_appointment_instances;
CREATE POLICY "System can create recurring instances"
ON recurring_appointment_instances
FOR INSERT
WITH CHECK (
  auth.role() = 'service_role' OR
  EXISTS (
    SELECT 1 FROM recurring_rules
    WHERE id = recurring_appointment_instances.recurring_rule_id
    AND client_id = auth.uid()
  )
);

-- ==========================================
-- PHASE 5: Consistency Check Function
-- ==========================================

CREATE OR REPLACE FUNCTION check_appointment_consistency()
RETURNS TABLE(
  issue_type TEXT,
  issue_count BIGINT,
  details TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check 1: Appointments with 'scheduled' status (should be 0 after migration)
  RETURN QUERY
  SELECT 
    'scheduled_status_found'::TEXT,
    COUNT(*)::BIGINT,
    'Appointments still using scheduled status'::TEXT
  FROM appointments
  WHERE status = 'scheduled';
  
  -- Check 2: Recurring appointments without instances
  RETURN QUERY
  SELECT 
    'recurring_without_instances'::TEXT,
    COUNT(*)::BIGINT,
    'Recurring appointments without any instances'::TEXT
  FROM appointments a
  WHERE a.recurrence IN ('weekly', 'biweekly', 'monthly')
    AND a.status IN ('confirmed', 'pending')
    AND NOT EXISTS (
      SELECT 1 FROM recurring_appointment_instances rai
      JOIN recurring_rules rr ON rai.recurring_rule_id = rr.id
      WHERE rr.provider_id = a.provider_id
        AND rr.client_id = a.client_id
        AND rr.listing_id = a.listing_id
    );
  
  -- Check 3: Instances with 'scheduled' status
  RETURN QUERY
  SELECT 
    'instances_scheduled_status'::TEXT,
    COUNT(*)::BIGINT,
    'Recurring instances still using scheduled status'::TEXT
  FROM recurring_appointment_instances
  WHERE status = 'scheduled';
  
  -- Check 4: Appointments without created_by audit trail
  RETURN QUERY
  SELECT 
    'missing_audit_trail'::TEXT,
    COUNT(*)::BIGINT,
    'Appointments missing created_by_user field'::TEXT
  FROM appointments
  WHERE created_by_user IS NULL;
END;
$$;

-- ==========================================
-- PHASE 6: Index Optimization
-- ==========================================

-- Create indexes for the unified view queries
CREATE INDEX IF NOT EXISTS idx_appointments_status_date 
ON appointments(status, start_time) 
WHERE notes NOT LIKE '%[SKIPPED BY CLIENT]%';

CREATE INDEX IF NOT EXISTS idx_recurring_instances_status_date 
ON recurring_appointment_instances(status, start_time)
WHERE notes NOT LIKE '%[SKIPPED BY CLIENT]%' 
  AND notes NOT LIKE '%[CANCELLED WITH PARENT]%';

CREATE INDEX IF NOT EXISTS idx_appointments_client_status 
ON appointments(client_id, status, start_time);

CREATE INDEX IF NOT EXISTS idx_appointments_provider_status 
ON appointments(provider_id, status, start_time);

-- ==========================================
-- LOGGING
-- ==========================================

DO $$
DECLARE
  v_scheduled_count INTEGER;
  v_instance_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_scheduled_count FROM appointments WHERE status = 'scheduled';
  SELECT COUNT(*) INTO v_instance_count FROM recurring_appointment_instances WHERE status = 'scheduled';
  
  RAISE LOG 'Appointment Consistency Migration Complete:';
  RAISE LOG '- Normalized % appointments from scheduled to confirmed', v_scheduled_count;
  RAISE LOG '- Normalized % recurring instances from scheduled to confirmed', v_instance_count;
  RAISE LOG '- Created cancel_appointment_atomic function';
  RAISE LOG '- Created unified_appointments view';
  RAISE LOG '- Created check_appointment_consistency function';
  RAISE LOG '- Updated RLS policies for stricter origin validation';
END $$;