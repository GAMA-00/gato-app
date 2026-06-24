-- Nuevo sistema de slots de disponibilidad para proveedores
-- 1. Tabla para configurar disponibilidad semanal del proveedor
CREATE TABLE provider_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=domingo, 6=sábado
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(provider_id, day_of_week, start_time, end_time)
);

-- 2. Tabla para slots de tiempo generados automáticamente
CREATE TABLE provider_time_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_datetime_start TIMESTAMP WITH TIME ZONE NOT NULL,
  slot_datetime_end TIMESTAMP WITH TIME ZONE NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  is_reserved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Índices para optimizar consultas
  UNIQUE(provider_id, listing_id, slot_datetime_start)
);

-- 3. Agregar duración estándar a la tabla listings
ALTER TABLE listings 
ADD COLUMN standard_duration INTEGER;

-- Actualizar servicios existentes con la duración actual como estándar
UPDATE listings 
SET standard_duration = duration 
WHERE standard_duration IS NULL;

-- Hacer que la duración estándar sea obligatoria
ALTER TABLE listings 
ALTER COLUMN standard_duration SET NOT NULL;

-- 4. Funciones para generar slots automáticamente
CREATE OR REPLACE FUNCTION generate_provider_time_slots(
  p_provider_id UUID,
  p_listing_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  availability_record RECORD;
  current_date DATE;
  slot_start TIMESTAMP WITH TIME ZONE;
  slot_end TIMESTAMP WITH TIME ZONE;
  service_duration INTEGER;
  slots_created INTEGER := 0;
BEGIN
  -- Obtener la duración del servicio
  SELECT standard_duration INTO service_duration
  FROM listings 
  WHERE id = p_listing_id;
  
  IF service_duration IS NULL THEN
    RAISE EXCEPTION 'No se encontró la duración estándar para el servicio %', p_listing_id;
  END IF;
  
  -- Iterar por cada día en el rango
  current_date := p_start_date;
  WHILE current_date <= p_end_date LOOP
    
    -- Obtener disponibilidad para este día de la semana
    FOR availability_record IN 
      SELECT day_of_week, start_time, end_time
      FROM provider_availability
      WHERE provider_id = p_provider_id 
        AND day_of_week = EXTRACT(DOW FROM current_date)
        AND is_active = true
    LOOP
      
      -- Generar slots cada X minutos según la duración del servicio
      slot_start := current_date + availability_record.start_time;
      
      WHILE slot_start + (service_duration || ' minutes')::INTERVAL <= current_date + availability_record.end_time LOOP
        slot_end := slot_start + (service_duration || ' minutes')::INTERVAL;
        
        -- Insertar el slot si no existe
        INSERT INTO provider_time_slots (
          provider_id,
          listing_id,
          slot_date,
          start_time,
          end_time,
          slot_datetime_start,
          slot_datetime_end
        ) VALUES (
          p_provider_id,
          p_listing_id,
          current_date,
          slot_start::TIME,
          slot_end::TIME,
          slot_start,
          slot_end
        ) ON CONFLICT (provider_id, listing_id, slot_datetime_start) DO NOTHING;
        
        GET DIAGNOSTICS slots_created = slots_created + ROW_COUNT;
        
        -- Avanzar al siguiente slot
        slot_start := slot_end;
      END LOOP;
      
    END LOOP;
    
    current_date := current_date + 1;
  END LOOP;
  
  RETURN slots_created;
END;
$$;

-- 5. Función para marcar slots como ocupados cuando se crea una cita
CREATE OR REPLACE FUNCTION mark_slot_as_reserved() RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Marcar el slot como reservado
  UPDATE provider_time_slots
  SET is_reserved = true, is_available = false
  WHERE provider_id = NEW.provider_id
    AND slot_datetime_start = NEW.start_time
    AND slot_datetime_end = NEW.end_time;
  
  RETURN NEW;
END;
$$;

-- 6. Función para liberar slots cuando se cancela una cita
CREATE OR REPLACE FUNCTION release_slot_on_cancellation() RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Liberar el slot si se cancela la cita
  IF NEW.status IN ('cancelled', 'rejected') AND OLD.status NOT IN ('cancelled', 'rejected') THEN
    UPDATE provider_time_slots
    SET is_reserved = false, is_available = true
    WHERE provider_id = NEW.provider_id
      AND slot_datetime_start = NEW.start_time
      AND slot_datetime_end = NEW.end_time;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 7. Triggers para automatizar la gestión de slots
CREATE TRIGGER trigger_mark_slot_reserved
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION mark_slot_as_reserved();

CREATE TRIGGER trigger_release_slot_on_cancellation
  AFTER UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION release_slot_on_cancellation();

-- 8. Función para auto-generar slots por 4 semanas adelante
CREATE OR REPLACE FUNCTION auto_generate_slots_for_listing() RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Auto-generar slots para las próximas 4 semanas cuando se crea un listing
  PERFORM generate_provider_time_slots(
    NEW.provider_id,
    NEW.id,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '4 weeks'
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_generate_slots
  AFTER INSERT ON listings
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_slots_for_listing();

-- 9. RLS Policies
ALTER TABLE provider_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_time_slots ENABLE ROW LEVEL SECURITY;

-- Políticas para provider_availability
CREATE POLICY "Providers can manage their availability" 
  ON provider_availability FOR ALL 
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Clients can view provider availability" 
  ON provider_availability FOR SELECT 
  USING (true);

-- Políticas para provider_time_slots
CREATE POLICY "Providers can view their slots" 
  ON provider_time_slots FOR SELECT 
  USING (auth.uid() = provider_id);

CREATE POLICY "Clients can view available slots" 
  ON provider_time_slots FOR SELECT 
  USING (is_available = true);

CREATE POLICY "System can manage slots" 
  ON provider_time_slots FOR ALL 
  USING (true)
  WITH CHECK (true);