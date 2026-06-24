-- Fix Remaining Critical Security Issues

-- 1. Fix RLS issues - Enable RLS and create policies for tables without them
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cancellation_policies ENABLE ROW LEVEL SECURITY;

-- Create policies for system_settings (read-only for authenticated users)
CREATE POLICY "Allow read access to system settings"
ON public.system_settings
FOR SELECT
TO authenticated
USING (true);

-- Create policies for cancellation_policies (read-only for authenticated users)
CREATE POLICY "Allow read access to cancellation policies"
ON public.cancellation_policies
FOR SELECT
TO authenticated
USING (true);

-- 2. Fix all remaining functions with missing search_path
CREATE OR REPLACE FUNCTION public.update_recurring_exceptions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_rated_appointments(appointment_ids uuid[])
RETURNS TABLE(appointment_id uuid)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT provider_ratings.appointment_id
    FROM provider_ratings
    WHERE provider_ratings.appointment_id = ANY(appointment_ids);
END;
$$;

CREATE OR REPLACE FUNCTION public.needs_price_finalization(appointment_row appointments)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT 
    appointment_row.status = 'completed' AND
    (appointment_row.final_price IS NULL OR appointment_row.price_finalized = FALSE) AND
    EXISTS (
      SELECT 1 FROM listings 
      WHERE listings.id = appointment_row.listing_id 
      AND (listings.is_post_payment = TRUE OR listings.service_variants::text LIKE '%"ambas"%')
    );
$$;

CREATE OR REPLACE FUNCTION public.get_recurring_clients_count(provider_id uuid)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COUNT(DISTINCT appointments.client_id)
    FROM appointments
    WHERE appointments.provider_id = $1 
      AND appointments.client_id IS NOT NULL
      AND appointments.recurrence IS NOT NULL 
      AND appointments.recurrence IN ('weekly', 'biweekly', 'monthly')
      AND appointments.status = 'confirmed'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_recurring_clients_count_by_listing(provider_id uuid, listing_id uuid)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Count unique clients who have active recurring appointments for this specific listing
  RETURN (
    SELECT COUNT(DISTINCT client_id)
    FROM appointments
    WHERE provider_id = $1 
      AND listing_id = $2
      AND client_id IS NOT NULL
      AND recurrence IS NOT NULL 
      AND recurrence != 'none'
      AND recurrence != ''
      AND status IN ('pending', 'confirmed')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_refund_percentage(cancellation_time timestamp with time zone, appointment_start timestamp with time zone)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
declare
  hours_before decimal;
  refund integer;
begin
  hours_before := extract(epoch from (appointment_start - cancellation_time))/3600;
  
  select refund_percentage into refund
  from cancellation_policies
  where hours_before <= $1
  order by hours_before desc
  limit 1;
  
  return coalesce(refund, 0);
end;
$$;