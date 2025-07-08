-- Fix RLS policies for recurring_appointment_instances to allow client insertion
-- This is preventing the booking button from working

-- Allow clients to create recurring instances for their own appointments
CREATE POLICY "Clients can create their recurring instances" 
ON recurring_appointment_instances 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM recurring_rules 
    WHERE recurring_rules.id = recurring_appointment_instances.recurring_rule_id 
    AND recurring_rules.client_id = auth.uid()
  )
);

-- Allow providers to manage recurring instances for their appointments
CREATE POLICY "Providers can manage their recurring instances" 
ON recurring_appointment_instances 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM recurring_rules 
    WHERE recurring_rules.id = recurring_appointment_instances.recurring_rule_id 
    AND recurring_rules.provider_id = auth.uid()
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM recurring_rules 
    WHERE recurring_rules.id = recurring_appointment_instances.recurring_rule_id 
    AND recurring_rules.provider_id = auth.uid()
  )
);

-- Also update the trigger to use SECURITY DEFINER for better permission handling
CREATE OR REPLACE FUNCTION public.create_recurring_rule_from_appointment()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER  -- This allows the function to run with elevated privileges
AS $$
DECLARE
  day_of_week_val INTEGER;
  day_of_month_val INTEGER;
  rule_id UUID;
  real_client_name TEXT;
BEGIN
  -- Solo procesar si es una cita recurrente y NO es una instancia
  IF NEW.recurrence IN ('weekly', 'biweekly', 'monthly') AND (NEW.is_recurring_instance = false OR NEW.is_recurring_instance IS NULL) THEN
    
    -- Obtener el nombre real del cliente
    SELECT name INTO real_client_name 
    FROM users 
    WHERE id = NEW.client_id;
    
    -- Verificar si ya existe una regla para esta cita
    SELECT id INTO rule_id
    FROM recurring_rules 
    WHERE client_id = NEW.client_id 
      AND provider_id = NEW.provider_id 
      AND listing_id = NEW.listing_id
      AND start_time = NEW.start_time::TIME
      AND recurrence_type = NEW.recurrence
      AND is_active = true;
      
    -- Solo crear regla si no existe
    IF rule_id IS NULL THEN
      -- Calcular día de la semana (0=domingo, 1=lunes, etc.)
      day_of_week_val := EXTRACT(DOW FROM NEW.start_time);
      day_of_month_val := EXTRACT(DAY FROM NEW.start_time);
      
      -- Crear la regla recurrente correspondiente
      INSERT INTO recurring_rules (
        client_id,
        provider_id,
        listing_id,
        recurrence_type,
        start_date,
        start_time,
        end_time,
        day_of_week,
        day_of_month,
        is_active,
        client_name,
        notes,
        client_address,
        client_phone,
        client_email
      ) VALUES (
        NEW.client_id,
        NEW.provider_id,
        NEW.listing_id,
        NEW.recurrence,
        NEW.start_time::DATE,
        NEW.start_time::TIME,
        NEW.end_time::TIME,
        CASE 
          WHEN NEW.recurrence IN ('weekly', 'biweekly') THEN day_of_week_val
          ELSE NULL
        END,
        CASE 
          WHEN NEW.recurrence = 'monthly' THEN day_of_month_val
          ELSE NULL
        END,
        true,
        COALESCE(real_client_name, NEW.client_name),
        NEW.notes,
        NEW.client_address,
        NEW.client_phone,
        NEW.client_email
      ) RETURNING id INTO rule_id;
      
      RAISE LOG 'Created recurring rule % for appointment % with client name %', rule_id, NEW.id, COALESCE(real_client_name, NEW.client_name);
    END IF;
    
    -- Actualizar el appointment con el recurring_rule_id
    UPDATE appointments 
    SET recurring_rule_id = rule_id
    WHERE id = NEW.id;
    
  END IF;
  
  RETURN NEW;
END;
$$;