-- Fix the auto_generate_slots_for_listing function to use proper date arithmetic
CREATE OR REPLACE FUNCTION public.auto_generate_slots_for_listing()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Auto-generar slots para las próximas 4 semanas cuando se crea un listing
  PERFORM generate_provider_time_slots(
    NEW.provider_id,
    NEW.id,
    CURRENT_DATE,
    (CURRENT_DATE + INTERVAL '4 weeks')::date
  );
  
  RETURN NEW;
END;
$function$;